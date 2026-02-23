// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import * as Core from "core";

export const QuadWgsl = `
const GAMMA = vec3<f32>(0.45454545f); // 1÷2.2

struct ColorData {
    data : array<f32>,
}
                               //     offest  align  size
struct Uniforms {              // -----------------------
    width: f32,                //          0*     4     4
    height: f32,               //          4      4     4
    samplesPerPixel: f32,      //          8      4     4
    exposure: f32,             //         12      4     4
    minDepth: f32,             //         16*     4     4
    maxDepth: f32,             //         20      4     4
                               // padding 24      4     8
    edgeForeground: vec4<f32>, //         32*    16    16
    edgeBackground: vec4<f32>, //         48*    16    16
}                              // -----------------------
                               //                16    48

@group(0) @binding(0) var<storage, read> colorBuffer : ColorData;
@group(1) @binding(0) var<uniform> uniforms : Uniforms;

struct VertexOutput {
    @builtin(position) Position : vec4<f32>,
};

@vertex
fn vert_main(@builtin(vertex_index) vertexIndex : u32) -> VertexOutput {
    var pos = array<vec2<f32>, 6>(
        vec2<f32>( 1f,  1f), vec2<f32>( 1f, -1f), vec2<f32>(-1f, -1f),
        vec2<f32>( 1f,  1f), vec2<f32>(-1f, -1f), vec2<f32>(-1f,  1f));
    var output : VertexOutput;
    output.Position = vec4<f32>(pos[vertexIndex], 0f, 1f);
    return output;
}

@fragment
fn frag_main(@builtin(position) coord: vec4<f32>) -> @location(0) vec4<f32> {
    let x = floor(coord.x);
    let y = floor(coord.y);
    let index = u32(x + y * uniforms.width) * 4u;
    // [0,1]
    var color = vec3<f32>(colorBuffer.data[index], colorBuffer.data[index + 1u], colorBuffer.data[index + 2u]) / uniforms.samplesPerPixel;
    // return vec4<f32>(color, 1f);

    // Simple tone map
    // color = color / (color + vec3<f32>(1f, 1f, 1f));

    // Gamma-correct
    return vec4<f32>(pow(color, GAMMA), 1f);
}

@fragment
fn frag_normal(@builtin(position) coord: vec4<f32>) -> @location(0) vec4<f32> {
    let x = floor(coord.x);
    let y = floor(coord.y);
    let index = u32(x + y * uniforms.width) * 4u;
    // [0,1]
    // TODO: Convert from [-1,1] to [0,1] here instead of in the shader
    var normal = vec3<f32>(colorBuffer.data[index], colorBuffer.data[index + 1u], colorBuffer.data[index + 2u]) / uniforms.samplesPerPixel;
    return vec4<f32>(pow(normal, GAMMA), 1f);
}

@fragment
fn frag_depth(@builtin(position) coord: vec4<f32>) -> @location(0) vec4<f32> {
    let x = floor(coord.x);
    let y = floor(coord.y);
    let index = u32(x + y * uniforms.width) * 4u;
    let depth = colorBuffer.data[index + 3u] / uniforms.samplesPerPixel;
    let minDepth = uniforms.minDepth;
    let maxDepth = uniforms.maxDepth;
    if (depth == 0f) {
        // No depth value
        return vec4<f32>(0f, 0f, 0f, 1f);
    }
    if (maxDepth > minDepth) {
        // Normalize linear depth
        let normalizedDepth = 1f - (depth - minDepth) / (maxDepth - minDepth);
        return vec4<f32>(normalizedDepth, normalizedDepth, normalizedDepth, 1f);
    }
    else {
        // Raw, un-normalized linear depth
        let rawDepth = 1f - depth;
        return vec4<f32>(vec3<f32>(rawDepth, rawDepth, rawDepth), 1f);
    }
}

@fragment
fn frag_texture(@builtin(position) coord: vec4<f32>) -> @location(0) vec4<f32> {
    let x = floor(coord.x);
    let y = floor(coord.y);
    let index = u32(x + y * uniforms.width) * 4u;
    var color = vec3<f32>(colorBuffer.data[index], colorBuffer.data[index + 1u], colorBuffer.data[index + 2u]) / uniforms.samplesPerPixel;
    return vec4<f32>(color, 1f);
}

@fragment
fn frag_segment(@builtin(position) coord: vec4<f32>) -> @location(0) vec4<f32> {
    let x = floor(coord.x);
    let y = floor(coord.y);
    let index = u32(x + y * (uniforms.width + 1)) * 4u; // Overdispatched by 1
    var color = vec3<f32>(colorBuffer.data[index], colorBuffer.data[index + 1u], colorBuffer.data[index + 2u]) / uniforms.samplesPerPixel;
    return vec4<f32>(color, 1f);
}
    
@fragment
fn frag_edge(@builtin(position) coord: vec4<f32>) -> @location(0) vec4<f32> {
    let x = floor(coord.x);
    let y = floor(coord.y);
    let index = u32(x + y * (uniforms.width + 1)) * 4u; // Overdispatched by 1
    let background = uniforms.edgeBackground;
    let foreground = uniforms.edgeForeground;
    
    // Segment derivatives
    // TODO: Use a Sobel filter
    let yOffset = index + u32(uniforms.width + 1) * 4u; // Overdispatched by 1
    let p = vec3<f32>(colorBuffer.data[index], colorBuffer.data[index + 1u], colorBuffer.data[index + 2u]);
    let px = vec3<f32>(colorBuffer.data[index + 4u], colorBuffer.data[index + 5u], colorBuffer.data[index + 6u]);
    let py = vec3<f32>(colorBuffer.data[yOffset], colorBuffer.data[yOffset + 1u], colorBuffer.data[yOffset + 2u]);
    let dpdx = px - p;
    let dpdy = py - p;
    let fwidth = abs(dpdx) + abs(dpdy);
    if (dot(fwidth, fwidth) > 0f) {
        return foreground;
    } else {
        return background;

        // TODO: Add another mode for edgeFill, or a flag for edgeFill (0 = background, 1 = color)
        // Use idColor
        // return vec4<f32>(p.x, p.y, p.z, 1f);
    }
}`;

export class QuadUniformBufferData extends Float32Array {
    public static readonly SIZE = 64 / 4;

    public readonly WIDTH_OFFSET = 0 / 4;
    public readonly HEIGHT_OFFSET = 4 / 4;
    public readonly SPP_OFFSET = 8 / 4;
    public readonly EXPOSURE_OFFSET = 12 / 4;
    public readonly MIN_DEPTH_OFFSET = 16 / 4;
    public readonly MAX_DEPTH_OFFSET = 20 / 4;
    public readonly EDGE_FOREGROUND_OFFSET = 32 / 4;
    public readonly EDGE_BACKGROUND_OFFSET = 48 / 4;

    constructor() {
        super(QuadUniformBufferData.SIZE)
    }

    public getWidth() { return this[this.WIDTH_OFFSET]; }
    public setWidth(value: number) { this[this.WIDTH_OFFSET] = value; }

    public getHeight() { return this[this.HEIGHT_OFFSET]; }
    public setHeight(value: number) { this[this.HEIGHT_OFFSET] = value; }

    public getSamplesPerPixel() { return this[this.SPP_OFFSET]; }
    public setSamplesPerPixel(value: number) { this[this.SPP_OFFSET] = value; }

    public getExposure() { return this[this.EXPOSURE_OFFSET]; }
    public setExposure(value: number) { this[this.EXPOSURE_OFFSET] = value; }

    public getMinDepth() { return this[this.MIN_DEPTH_OFFSET]; }
    public setMinDepth(value: number) { this[this.MIN_DEPTH_OFFSET] = value; }

    public getMaxDepth() { return this[this.MAX_DEPTH_OFFSET]; }
    public setMaxDepth(value: number) { this[this.MAX_DEPTH_OFFSET] = value; }

    public getEdgeForeground(value: Core.ColorRGBA) {
        const offset = this.EDGE_FOREGROUND_OFFSET;
        value[0] = this[offset];
        value[1] = this[offset + 1];
        value[2] = this[offset + 2];
    }
    public setEdgeForeground(value: Core.ColorRGBA) {
        const offset = this.EDGE_FOREGROUND_OFFSET;
        this[offset] = value[0];
        this[offset + 1] = value[1];
        this[offset + 2] = value[2];
        this[offset + 3] = value[3]; // Alpha
    }

    public getEdgeBackground(value: Core.ColorRGBA) {
        const offset = this.EDGE_BACKGROUND_OFFSET
        value[0] = this[offset];
        value[1] = this[offset + 1];
        value[2] = this[offset + 2];
    }

    public setEdgeBackground(value: Core.ColorRGBA) {
        const offset = this.EDGE_BACKGROUND_OFFSET;
        this[offset] = value[0];
        this[offset + 1] = value[1];
        this[offset + 2] = value[2];
        this[offset + 3] = value[3]; // Alpha
    }
}