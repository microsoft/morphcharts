// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import * as Core from "core";
import { Dataset } from "../dataset.js";
import { IScene, Plot } from "../plot.js";
import { MarkEncodings, MarkEncodingValue } from "./encoding.js";
import { Group } from "./group.js";
import { Mark } from "./mark.js";

export class Rect extends Mark {
    public group: Group;

    constructor(group: Group) {
        super();
        this.group = group;
    }

    public process(plot: Plot, scene: IScene) {
        const group = this.group;

        // Dataset
        let dataset: Dataset;
        if (this.from && this.from.data) {
            dataset = group.getDataset(this.from.data);
            if (!dataset) { throw new Error(`rect mark dataset "${this.from.data}" not found`); }
        }
        else {
            // Create empty dataset
            dataset = Dataset.Create();
        }

        // Ids
        const ids = new Uint32Array(dataset.length);
        for (let i = 0; i < dataset.length; i++) { ids[i] = i; }

        // Buffer
        const bufferOptions: Core.IBufferOptions = {
            ids: ids,
            isInteractive: this.interactive,
        }
        const buffer = new Core.Buffer(bufferOptions);

        // Unit type
        let unitType: string;
        switch (this.geometry && this.geometry.toLowerCase()) {
            default:
                unitType = "box";
                break;
            case "box":
            case "boxsdf":
            case "boxframesdf":
            case "cylinder":
            case "cylindersdf":
            case "hexprism":
            case "hexprismsdf":
            case "sphere":
            case "tubesdf":
            case "xyrect":
            case "xzrect":
            case "yzrect":
                unitType = this.geometry.toLowerCase();
                break;
        }
        buffer.unitType = unitType;

        // Dimensions
        // Scaling from pixels to model size
        const maxDimension = Math.max(plot.width, plot.height, plot.depth);
        const scaling = plot.size / maxDimension;

        // Positions, size
        let positionsX: Float32Array, positionsY: Float32Array, positionsZ: Float32Array;
        let positionsX2: Float32Array, positionsY2: Float32Array, positionsZ2: Float32Array;
        let positionsXc: Float32Array, positionsYc: Float32Array, positionsZc: Float32Array;
        let sizesX: Float32Array, sizesY: Float32Array, sizesZ: Float32Array;

        // x
        if (this.encode.x && this.encode.x2) {
            // Ignore width if encode.x, x2 and width is defined
            positionsX = group.values(this.encode.x, dataset);
            positionsX2 = group.values(this.encode.x2, dataset);
            positionsXc = new Float32Array(positionsX.length);
            sizesX = new Float32Array(positionsX.length);
            for (let i = 0; i < positionsX.length; i++) {
                // Ensure x2 > x
                if (positionsX2[i] < positionsX[i]) {
                    const temp = positionsX2[i];
                    positionsX2[i] = positionsX[i];
                    positionsX[i] = temp;
                }
                positionsXc[i] = (positionsX[i] + positionsX2[i]) / 2;
                sizesX[i] = Math.abs(positionsX2[i] - positionsX[i]);
            }
        }
        else if (this.encode.x && this.encode.width) {
            positionsX = group.values(this.encode.x, dataset);
            positionsXc = new Float32Array(positionsX.length);
            sizesX = group.values(this.encode.width, dataset);
            for (let i = 0; i < positionsX.length; i++) {
                positionsXc[i] = positionsX[i] + sizesX[i] / 2;
            }
        }
        else if (this.encode.x2 && this.encode.width) {
            positionsX2 = group.values(this.encode.x2, dataset);
            positionsXc = new Float32Array(positionsX2.length);
            sizesX = group.values(this.encode.width, dataset);
            for (let i = 0; i < positionsX2.length; i++) {
                positionsXc[i] = positionsX2[i] - sizesX[i] / 2;
            }
        }
        else if (this.encode.xc && this.encode.width) {
            positionsXc = group.values(this.encode.xc, dataset);
            sizesX = group.values(this.encode.width, dataset);
        }
        else if (this.encode.x || this.encode.xc || this.encode.x2) {
            if (this.encode.x) { positionsXc = group.values(this.encode.x, dataset); }
            else if (this.encode.xc) { positionsXc = group.values(this.encode.xc, dataset); }
            else if (this.encode.x2) { positionsXc = group.values(this.encode.x2, dataset); }
        }
        else if (this.encode.width) {
            sizesX = group.values(this.encode.width, dataset);
        }

        // y
        if (this.encode.y && this.encode.y2) {
            // Ignore height if encode.y, y2 and height is defined
            positionsY = group.values(this.encode.y, dataset);
            positionsY2 = group.values(this.encode.y2, dataset);
            positionsYc = new Float32Array(positionsY.length);
            sizesY = new Float32Array(positionsY.length);
            for (let i = 0; i < positionsY.length; i++) {
                // Ensure y2 > y
                if (positionsY2[i] < positionsY[i]) {
                    const temp = positionsY2[i];
                    positionsY2[i] = positionsY[i];
                    positionsY[i] = temp;
                }
                positionsYc[i] = (positionsY[i] + positionsY2[i]) / 2;
                sizesY[i] = Math.abs(positionsY2[i] - positionsY[i]);
            }
        }
        else if (this.encode.y && this.encode.height) {
            positionsY = group.values(this.encode.y, dataset);
            positionsYc = new Float32Array(positionsY.length);
            sizesY = group.values(this.encode.height, dataset);
            for (let i = 0; i < positionsY.length; i++) {
                positionsYc[i] = positionsY[i] + sizesY[i] / 2;
            }
        }
        else if (this.encode.y2 && this.encode.height) {
            positionsY2 = group.values(this.encode.y2, dataset);
            positionsYc = new Float32Array(positionsY2.length);
            sizesY = group.values(this.encode.height, dataset);
            for (let i = 0; i < positionsY2.length; i++) {
                positionsYc[i] = positionsY2[i] - sizesY[i] / 2;
            }
        }
        else if (this.encode.yc && this.encode.height) {
            positionsYc = group.values(this.encode.yc, dataset);
            sizesY = group.values(this.encode.height, dataset);
        }
        else if (this.encode.y || this.encode.yc || this.encode.y2) {
            if (this.encode.y) { positionsYc = group.values(this.encode.y, dataset); }
            else if (this.encode.yc) { positionsYc = group.values(this.encode.yc, dataset); }
            else if (this.encode.y2) { positionsYc = group.values(this.encode.y2, dataset); }
        }
        else if (this.encode.height) {
            sizesY = group.values(this.encode.height, dataset);
        }

        // z
        if (this.encode.z && this.encode.z2) {
            // Ignore depth if encode.z, z2 and depth is defined
            positionsZ = group.values(this.encode.z, dataset);
            positionsZ2 = group.values(this.encode.z2, dataset);
            positionsZc = new Float32Array(positionsZ.length);
            sizesZ = new Float32Array(positionsZ.length);
            for (let i = 0; i < positionsZ.length; i++) {
                // Ensure z2 > z
                if (positionsZ2[i] < positionsZ[i]) {
                    const temp = positionsZ2[i];
                    positionsZ2[i] = positionsZ[i];
                    positionsZ[i] = temp;
                }
                positionsZc[i] = (positionsZ[i] + positionsZ2[i]) / 2;
                sizesZ[i] = Math.abs(positionsZ2[i] - positionsZ[i]);
            }
        }
        else if (this.encode.z && this.encode.depth) {
            positionsZ = group.values(this.encode.z, dataset);
            positionsZc = new Float32Array(positionsZ.length);
            sizesZ = group.values(this.encode.depth, dataset);
            for (let i = 0; i < positionsZ.length; i++) {
                positionsZc[i] = positionsZ[i] + sizesZ[i] / 2;
            }
        }
        else if (this.encode.z2 && this.encode.depth) {
            positionsZ2 = group.values(this.encode.z2, dataset);
            positionsZc = new Float32Array(positionsZ2.length);
            sizesZ = group.values(this.encode.depth, dataset);
            for (let i = 0; i < positionsZ2.length; i++) {
                positionsZc[i] = positionsZ2[i] - sizesZ[i] / 2;
            }
        }
        else if (this.encode.zc && this.encode.depth) {
            positionsZc = group.values(this.encode.zc, dataset);
            sizesZ = group.values(this.encode.depth, dataset);
        }
        else if (this.encode.z || this.encode.zc || this.encode.z2) {
            if (this.encode.z) { positionsZc = group.values(this.encode.z, dataset); }
            else if (this.encode.zc) { positionsZc = group.values(this.encode.zc, dataset); }
            else if (this.encode.z2) { positionsZc = group.values(this.encode.z2, dataset); }
        }
        else if (this.encode.depth) {
            sizesZ = group.values(this.encode.depth, dataset);
        }

        // Rotations
        let angles: Float32Array, anglesX: Float32Array, anglesY: Float32Array, anglesZ: Float32Array;
        if (this.encode.angle) { angles = group.values(this.encode.angle, dataset); }
        if (this.encode.angleX) { anglesX = group.values(this.encode.angleX, dataset); }
        if (this.encode.angleY) { anglesY = group.values(this.encode.angleY, dataset); }
        if (this.encode.angleZ) { anglesZ = group.values(this.encode.angleZ, dataset); }
        let rotation: Core.Quaternion;
        let rotations = new Float32Array(dataset.length * 4);
        for (let i = 0; i < dataset.length; i++) {
            if (this.encode.rotation) {
                rotation = this.encode.rotation;
            }
            else if (angles || anglesX || anglesY || anglesZ) {
                const angleY = angles ? Core.Constants.RADIANS_PER_DEGREE * angles[i] : anglesY ? Core.Constants.RADIANS_PER_DEGREE * anglesY[i] : 0;
                const angleX = anglesX ? Core.Constants.RADIANS_PER_DEGREE * anglesX[i] : 0;
                const angleZ = anglesZ ? Core.Constants.RADIANS_PER_DEGREE * anglesZ[i] : 0;
                rotation = Core.quaternion.createIdentity();
                // Clockwise rotation when looking along axis from +ve to -ve
                if (angleZ) { Core.quaternion.rotateZ(rotation, -angleZ, rotation); }
                if (angleY) { Core.quaternion.rotateY(rotation, -angleY, rotation); }
                if (angleX) { Core.quaternion.rotateX(rotation, -angleX, rotation); }
            }
            else {
                rotation = Core.quaternion.createIdentity();
            }
            rotations[i * 4] = rotation[0];
            rotations[i * 4 + 1] = rotation[1];
            rotations[i * 4 + 2] = rotation[2];
            rotations[i * 4 + 3] = rotation[3];
        }

        // Segment
        let segmentIds: Float32Array;
        let segmentColors: Core.ColorRGBA[];
        if (this.encode.segmentId) {
            segmentIds = group.values(this.encode.segmentId, dataset);
            segmentColors = new Array(dataset.length);
            for (let i = 0; i < dataset.length; i++) {
                const rgba: Core.ColorRGBA = [0, 0, 0, 0];
                Core.Color.numberToColorRGBA(segmentIds[i], rgba);
                segmentColors[i] = rgba;
            }
        }

        // Data source for reactive geometry
        if (this.name) {
            const headings = [];
            const columnTypes: Core.Data.ColumnType[] = [];
            const rows = [];
            if (segmentIds) { headings.push("segmentid"); columnTypes.push(Core.Data.ColumnType.integer); }
            if (positionsXc) { headings.push("xc"); columnTypes.push(Core.Data.ColumnType.float); }
            if (positionsYc) { headings.push("yc"); columnTypes.push(Core.Data.ColumnType.float); }
            if (positionsZc) { headings.push("zc"); columnTypes.push(Core.Data.ColumnType.float); }
            if (positionsX) { headings.push("x"); columnTypes.push(Core.Data.ColumnType.float); }
            if (positionsY) { headings.push("y"); columnTypes.push(Core.Data.ColumnType.float); }
            if (positionsZ) { headings.push("z"); columnTypes.push(Core.Data.ColumnType.float); }
            if (positionsX2) { headings.push("x2"); columnTypes.push(Core.Data.ColumnType.float); }
            if (positionsY2) { headings.push("y2"); columnTypes.push(Core.Data.ColumnType.float); }
            if (positionsZ2) { headings.push("z2"); columnTypes.push(Core.Data.ColumnType.float); }
            if (sizesX) { headings.push("width"); columnTypes.push(Core.Data.ColumnType.float); }
            if (sizesY) { headings.push("height"); columnTypes.push(Core.Data.ColumnType.float); }
            if (sizesZ) { headings.push("depth"); columnTypes.push(Core.Data.ColumnType.float); }
            for (let i = 0; i < dataset.length; i++) {
                const row: string[] = [];
                if (segmentIds) { row.push(segmentIds[i].toString()); }
                if (positionsXc) { row.push(positionsXc[i].toString()); }
                if (positionsYc) { row.push(positionsYc[i].toString()); }
                if (positionsZc) { row.push(positionsZc[i].toString()); }
                if (positionsX) { row.push(positionsX[i].toString()); }
                if (positionsY) { row.push(positionsY[i].toString()); }
                if (positionsZ) { row.push(positionsZ[i].toString()); }
                if (positionsX2) { row.push(positionsX2[i].toString()); }
                if (positionsY2) { row.push(positionsY2[i].toString()); }
                if (positionsZ2) { row.push(positionsZ2[i].toString()); }
                if (sizesX) { row.push(sizesX[i].toString()); }
                if (sizesY) { row.push(sizesY[i].toString()); }
                if (sizesZ) { row.push(sizesZ[i].toString()); }
                rows.push(row);
            }
            // Datum reference to mark dataset
            group.datasets[this.name] = new Dataset(headings, rows, columnTypes, dataset);
        }

        // Roundings
        let roundings: Float32Array;
        if (this.encode.rounding) { roundings = group.values(this.encode.rounding, dataset); }

        // Tube inner radius
        let param0: Float32Array;
        if (unitType == "tubesdf" && this.encode.innerRadius) {
            param0 = group.values(this.encode.innerRadius, dataset);
            // Define in size units
            if (sizesX) {
                for (let i = 0; i < dataset.length; i++) {
                    { param0[i] = param0[i] / sizesX[i]; }
                }
            }
        }

        // Box frame thickness
        if (unitType == "boxframesdf" && this.encode.thickness) {
            param0 = group.values(this.encode.thickness, dataset);
            // Define in size units
            if (sizesX) {
                for (let i = 0; i < dataset.length; i++) {
                    { param0[i] = param0[i] / sizesX[i]; }
                }
            }
        }

        // Layout
        const scatter = new Core.Layouts.Scatter();
        const layoutOptions: Core.Layouts.IScatterLayoutOptions = {
            positionsX: positionsXc,
            positionsY: positionsYc,
            positionsZ: positionsZc,
            positionScalingX: scaling,
            positionScalingY: scaling,
            positionScalingZ: scaling,
            sizesX: sizesX,
            sizesY: sizesY,
            sizesZ: sizesZ,
            sizeScaling: scaling,
            rotations: rotations,
            roundingScaling: scaling,
            roundings: roundings,

        }
        scatter.layout(buffer, ids, layoutOptions);
        const vertexOptions: Core.Layouts.IScatterVertexOptions = {
            // Shift by group offset
            minBoundsX: -scaling * group.x,
            maxBoundsX: scaling * (plot.width - group.x),
            minBoundsY: -scaling * group.y,
            maxBoundsY: scaling * (plot.height - group.y),
            minBoundsZ: -scaling * group.z,
            maxBoundsZ: scaling * (plot.depth - group.z),
            segmentColors: segmentColors,
            params: param0 ? [{ index: 0, values: param0 }] : null,
        }

        // Materials, textures
        let materialType: Core.MaterialType;
        switch (this.material) {
            case "lambertian":
            default:
                materialType = Core.MaterialType.diffuse;
                break;
            case "metal":
                materialType = Core.MaterialType.metal;
                break;
            case "glass":
                materialType = Core.MaterialType.glass;
                break;
            case "isotropic":
                materialType = Core.MaterialType.isotropic;
                break;
            case "glossy":
                materialType = Core.MaterialType.glossy;
                break;
            case "light":
                materialType = Core.MaterialType.light;
                break;
        }
        let fillColors: Core.ColorRGB[];
        let fillColors2: Core.ColorRGB[];
        let fuzzes: Float32Array;
        let glosses: Float32Array;
        let refractiveIndices: Float32Array;
        let densities: Float32Array;
        let texCoords: Float32Array; // [x (left), y (bottom), x2 (right), y2 (top)]
        let texOffsets: Float32Array; // [u, v, w]
        let texScales: Float32Array; // [u, v, w]
        let textureType: Core.TextureType;

        // Fill
        if (this.encode.fill) {
            const fill = this.encode.fill;

            // Color
            if (fill.value || fill.color || fill.scale || fill.field) {
                textureType = Core.TextureType.solidColor;
                fillColors = group.colorValues(fill, dataset);
            }

            // Image
            if (fill.image) {
                // For now, only support a single image texture, so ignore per-mark specification
                textureType = Core.TextureType.image;
            }

            // Checker
            if (fill.checker) {
                textureType = Core.TextureType.checkerboard;
                if (fill.checker.color1) { fillColors = group.colorValues(fill.checker.color1, dataset); }
                else {
                    fillColors = [];
                    for (let i = 0; i < dataset.length; i++) { fillColors.push(Core.Colors.black); }
                }
                if (fill.checker.color2) { fillColors2 = group.colorValues(fill.checker.color2, dataset); }
                else {
                    fillColors2 = [];
                    for (let i = 0; i < dataset.length; i++) { fillColors2.push(Core.Colors.white); }
                }
            }

            // Tex Coords
            // TODO: Support multi-face texture coordinates
            if (fill.texCoords) {
                let texCoordsX, texCoordsY, texCoordsX2, texCoordsY2: Float32Array;
                if (fill.texCoords.x) { texCoordsX = group.values(fill.texCoords.x, dataset); }
                if (fill.texCoords.y) { texCoordsY = group.values(fill.texCoords.y, dataset); }
                if (fill.texCoords.x2) { texCoordsX2 = group.values(fill.texCoords.x2, dataset); }
                if (fill.texCoords.y2) { texCoordsY2 = group.values(fill.texCoords.y2, dataset); }
                texCoords = new Float32Array(dataset.length * 4);
                for (let i = 0; i < dataset.length; i++) {
                    texCoords[i * 4] = texCoordsX ? texCoordsX[i] : 0;
                    texCoords[i * 4 + 1] = texCoordsY ? texCoordsY[i] : 0;
                    texCoords[i * 4 + 2] = texCoordsX2 ? texCoordsX2[i] : 1;
                    texCoords[i * 4 + 3] = texCoordsY2 ? texCoordsY2[i] : 1;
                }
            }

            // Texture scale
            // TODO: Support multi-face texture scaling
            // For now, support 2 pairs of UV scale and offset, one for sides and one for top/bottom
            if (fill.texScale) {
                let texScalesX, texScalesY, texScalesZ, texScalesW: Float32Array;
                // TODO: Support signal values
                if (fill.texScale.x) { texScalesX = group.values(fill.texScale.x, dataset); }
                if (fill.texScale.y) { texScalesY = group.values(fill.texScale.y, dataset); }
                if (fill.texScale.z) { texScalesZ = group.values(fill.texScale.z, dataset); }
                if (fill.texScale.w) { texScalesW = group.values(fill.texScale.w, dataset); }
                texScales = new Float32Array(dataset.length * 4);
                for (let i = 0; i < dataset.length; i++) {
                    texScales[i * 4] = texScalesX ? texScalesX[i] : 1;
                    texScales[i * 4 + 1] = texScalesY ? texScalesY[i] : 1;
                    texScales[i * 4 + 2] = texScalesZ ? texScalesZ[i] : 1;
                    texScales[i * 4 + 3] = texScalesW ? texScalesW[i] : 1;
                }
            }

            // Texture offset
            if (fill.texOffset) {
                let texOffsetsX, texOffsetsY, texOffsetsZ, texOffsetsW: Float32Array;
                if (fill.texOffset.x) { texOffsetsX = group.values(fill.texOffset.x, dataset); }
                if (fill.texOffset.y) { texOffsetsY = group.values(fill.texOffset.y, dataset); }
                if (fill.texOffset.z) { texOffsetsZ = group.values(fill.texOffset.z, dataset); }
                if (fill.texOffset.w) { texOffsetsW = group.values(fill.texOffset.w, dataset); }
                texOffsets = new Float32Array(dataset.length * 4);
                for (let i = 0; i < dataset.length; i++) {
                    texOffsets[i * 4] = texOffsetsX ? texOffsetsX[i] : 0;
                    texOffsets[i * 4 + 1] = texOffsetsY ? texOffsetsY[i] : 0;
                    texOffsets[i * 4 + 2] = texOffsetsZ ? texOffsetsZ[i] : 0;
                    texOffsets[i * 4 + 3] = texOffsetsW ? texOffsetsW[i] : 0;
                }
            }
        }
        if (this.encode.fuzz) { fuzzes = group.values(this.encode.fuzz, dataset); }
        if (this.encode.gloss) { glosses = group.values(this.encode.gloss, dataset); }
        if (this.encode.refractiveIndex) { refractiveIndices = group.values(this.encode.refractiveIndex, dataset); }
        if (this.encode.density) { densities = group.values(this.encode.density, dataset); }
        const materials: Core.Material[] = new Array(dataset.length);
        for (let i = 0; i < dataset.length; i++) {
            materials[i] = new Core.Material();
            materials[i].type = materialType;
            materials[i].fill = fillColors ? fillColors[i] || Plot.FILL_COLOR : Plot.FILL_COLOR;
            materials[i].fuzz = fuzzes ? fuzzes[i] : Plot.MATERIAL_FUZZ;
            materials[i].gloss = glosses ? glosses[i] : Plot.MATERIAL_GLOSS;
            materials[i].refractiveIndex = refractiveIndices ? refractiveIndices[i] : Plot.MATERIAL_REFRACTIVE_INDEX;
            materials[i].density = densities ? densities[i] : Plot.MATERIAL_DENSITY;

            // Checker texture
            materials[i].stroke = fillColors2 ? fillColors2[i] || Plot.STROKE_COLOR : Plot.STROKE_COLOR;
        }
        vertexOptions.materials = materials;

        // Allow texture type override
        switch (this.texture) {
            case "color":
                textureType = Core.TextureType.solidColor;
                break;
            case "checker":
                textureType = Core.TextureType.checkerboard;
                break;
            case "image":
                textureType = Core.TextureType.image;
                break;
            case "uv":
                textureType = Core.TextureType.uv;
                break;
            case "uvw":
                textureType = Core.TextureType.uvw;
                break;
        }
        vertexOptions.textureType = textureType || Core.TextureType.solidColor;
        vertexOptions.texCoords = texCoords;
        vertexOptions.texOffsets = texOffsets;
        vertexOptions.texScales = texScales;

        // Update
        scatter.update(buffer, ids, vertexOptions);

        // Add to scene
        scene.buffers.push(buffer);
    }

    public static async fromJSONAsync(group: Group, markJSON: any): Promise<Rect> {
        return new Promise<Rect>(async (resolve, reject) => {
            try {
                const mark = new Rect(group);
                mark._fromJSONAsync(markJSON);

                // Encodings
                mark.encode = new MarkEncodings();
                if (markJSON.encode) {
                    // Combine enter and update
                    const encodeJSON: any = {};
                    Object.assign(encodeJSON, markJSON.encode.enter, markJSON.encode.update);
                    if (encodeJSON) {
                        // Position, size
                        if (encodeJSON.x) { mark.encode.x = MarkEncodingValue.fromJSON(mark, group, encodeJSON.x); }
                        if (encodeJSON.y) { mark.encode.y = MarkEncodingValue.fromJSON(mark, group, encodeJSON.y); }
                        if (encodeJSON.z) { mark.encode.z = MarkEncodingValue.fromJSON(mark, group, encodeJSON.z); }
                        if (encodeJSON.xc) { mark.encode.xc = MarkEncodingValue.fromJSON(mark, group, encodeJSON.xc); }
                        if (encodeJSON.yc) { mark.encode.yc = MarkEncodingValue.fromJSON(mark, group, encodeJSON.yc); }
                        if (encodeJSON.zc) { mark.encode.zc = MarkEncodingValue.fromJSON(mark, group, encodeJSON.zc); }
                        if (encodeJSON.x2) { mark.encode.x2 = MarkEncodingValue.fromJSON(mark, group, encodeJSON.x2); }
                        if (encodeJSON.y2) { mark.encode.y2 = MarkEncodingValue.fromJSON(mark, group, encodeJSON.y2); }
                        if (encodeJSON.z2) { mark.encode.z2 = MarkEncodingValue.fromJSON(mark, group, encodeJSON.z2); }
                        if (encodeJSON.width) { mark.encode.width = MarkEncodingValue.fromJSON(mark, group, encodeJSON.width); }
                        if (encodeJSON.height) { mark.encode.height = MarkEncodingValue.fromJSON(mark, group, encodeJSON.height); }
                        if (encodeJSON.depth) { mark.encode.depth = MarkEncodingValue.fromJSON(mark, group, encodeJSON.depth); }

                        // Rounding
                        if (encodeJSON.rounding) { mark.encode.rounding = MarkEncodingValue.fromJSON(mark, group, encodeJSON.rounding); }

                        // Tube
                        if (encodeJSON.innerRadius) { mark.encode.innerRadius = MarkEncodingValue.fromJSON(mark, group, encodeJSON.innerRadius); }

                        // Box frame
                        if (encodeJSON.thickness) { mark.encode.thickness = MarkEncodingValue.fromJSON(mark, group, encodeJSON.thickness); }

                        // Rotation
                        if (encodeJSON.angle) { mark.encode.angle = MarkEncodingValue.fromJSON(mark, group, encodeJSON.angle); }
                        if (encodeJSON.angleX) { mark.encode.angleX = MarkEncodingValue.fromJSON(mark, group, encodeJSON.angleX); }
                        if (encodeJSON.angleY) { mark.encode.angleY = MarkEncodingValue.fromJSON(mark, group, encodeJSON.angleY); }
                        if (encodeJSON.angleZ) { mark.encode.angleZ = MarkEncodingValue.fromJSON(mark, group, encodeJSON.angleZ); }
                        if (encodeJSON.rotation) { mark.encode.rotation = encodeJSON.rotation.value; }

                        // Color
                        if (encodeJSON.fill) { mark.encode.fill = MarkEncodingValue.fromJSON(mark, group, encodeJSON.fill); }

                        // Material
                        if (encodeJSON.fuzz) { mark.encode.fuzz = MarkEncodingValue.fromJSON(mark, group, encodeJSON.fuzz); }
                        if (encodeJSON.refractiveIndex) { mark.encode.refractiveIndex = MarkEncodingValue.fromJSON(mark, group, encodeJSON.refractiveIndex); }
                        if (encodeJSON.gloss) { mark.encode.gloss = MarkEncodingValue.fromJSON(mark, group, encodeJSON.gloss); }
                        if (encodeJSON.density) { mark.encode.density = MarkEncodingValue.fromJSON(mark, group, encodeJSON.density); }

                        // Segment
                        if (encodeJSON.segmentId) { mark.encode.segmentId = MarkEncodingValue.fromJSON(mark, group, encodeJSON.segmentId); }
                    }
                }
                resolve(mark);
            }
            catch (error) {
                console.log("error parsing rect mark JSON", error);
                reject(error);
            }
        });
    }
}