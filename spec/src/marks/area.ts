// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import * as Core from "core";
import { Dataset } from "../dataset.js";
import { IScene, Plot } from "../plot.js";
import { MarkEncodings, MarkEncodingValue } from "./encoding.js";
import { Group } from "./group.js";
import { Mark } from "./mark.js";

export class Area extends Mark {
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
            if (!dataset) { throw new Error(`dataset ${this.from.data} not found`); }
        }
        else {
            // Create empty dataset
            dataset = new Dataset([""], [[""]], [Core.Data.ColumnType.string]);
        }

        // Dimensions
        // Scaling from pixels to model size
        const maxDimension = Math.max(plot.width, plot.height, plot.depth);
        const scaling = plot.size / maxDimension;

        // x, y, y2, z
        const positionsX = this.encode.x ? group.values(this.encode.x, dataset) : new Float32Array(dataset.length);
        const positionsY = this.encode.y ? group.values(this.encode.y, dataset) : new Float32Array(dataset.length);
        const positionsY2 = this.encode.y2 ? group.values(this.encode.y2, dataset) : new Float32Array(dataset.length);
        const positionsZ = this.encode.z ? group.values(this.encode.z, dataset) : new Float32Array(dataset.length);

        // Size
        let sizesZ: Float32Array;
        if (this.encode.depth) { sizesZ = group.values(this.encode.depth, dataset); }

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

        // TODO: Support Xc, Yc, Zc to allow center-alignment in band scales without needed to add band offset

        // Join areas in data order
        let positionsXc: Float32Array, positionsYc: Float32Array, positionsZc: Float32Array;
        if (positionsX) { positionsXc = new Float32Array(dataset.length); }
        if (positionsY) { positionsYc = new Float32Array(dataset.length); }
        if (positionsZ) { positionsZc = new Float32Array(dataset.length); }
        const sizesX = new Float32Array(dataset.length)
        const sizesY = new Float32Array(dataset.length);
        const a = new Float32Array(dataset.length);
        const b = new Float32Array(dataset.length);
        const c = new Float32Array(dataset.length);
        const d = new Float32Array(dataset.length);
        const ids = dataset.all.ids;
        if (ids.length > 1) {
            for (let j = 0; j < ids.length - 1; j++) {
                const fromId = ids[j];
                const toId = ids[j + 1];
                let toPositionX: number, toPositionY: number, toPositionY2: number, toPositionZ: number, fromPositionX: number, fromPositionY: number, fromPositionY2: number, fromPositionZ: number;
                if (positionsX) {
                    toPositionX = positionsX[toId];
                    fromPositionX = positionsX[fromId];
                    positionsXc[fromId] = (fromPositionX + toPositionX) / 2;
                    sizesX[fromId] = Math.abs(toPositionX - fromPositionX);
                }
                if (positionsY && positionsY2) {
                    toPositionY = positionsY[toId];
                    toPositionY2 = positionsY2[toId];
                    fromPositionY = positionsY[fromId];
                    fromPositionY2 = positionsY2[fromId];
                    const minY = Math.min(fromPositionY, toPositionY, fromPositionY2, toPositionY2);
                    const maxY = Math.max(fromPositionY, toPositionY, fromPositionY2, toPositionY2);
                    const height = maxY - minY;
                    const halfHeight = height / 2;
                    const centerY = (minY + maxY) / 2;
                    const base = (centerY - halfHeight);
                    // Allow y, y2 to be in any order
                    a[fromId] = ((fromPositionY < fromPositionY2 ? fromPositionY : fromPositionY2) - base) / height;
                    b[fromId] = ((fromPositionY < fromPositionY2 ? fromPositionY2 : fromPositionY) - base) / height;
                    c[fromId] = ((toPositionY < toPositionY2 ? toPositionY : toPositionY2) - base) / height;
                    d[fromId] = ((toPositionY < toPositionY2 ? toPositionY2 : toPositionY) - base) / height;
                    sizesY[fromId] = Math.abs(height);
                    positionsYc[fromId] = centerY;
                }
                if (positionsZ) {
                    toPositionZ = positionsZ[toId];
                    fromPositionZ = positionsZ[fromId];
                    positionsZc[fromId] = (fromPositionZ + toPositionZ) / 2;
                }
            }
        }

        // Buffer
        const bufferOptions: Core.IBufferOptions = {
            ids: ids,
            isInteractive: this.interactive,
        }
        const buffer = new Core.Buffer(bufferOptions);
        buffer.unitType = "quadsdf";

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
            params: [
                { index: 0, values: a },
                { index: 1, values: b },
                { index: 2, values: c },
                { index: 3, values: d },
            ],
        }

        // Materials
        let fillColors: Core.ColorRGB[];
        let materialFuzzes: Float32Array;
        let materialGlosses: Float32Array;
        let materialRefractiveIndices: Float32Array;
        let materialDensities: Float32Array;
        if (this.encode.fill) { fillColors = group.colorValues(this.encode.fill, dataset); }
        if (this.encode.fuzz) { materialFuzzes = group.values(this.encode.fuzz, dataset); }
        if (this.encode.gloss) { materialGlosses = group.values(this.encode.gloss, dataset); }
        if (this.encode.refractiveIndex) { materialRefractiveIndices = group.values(this.encode.refractiveIndex, dataset); }
        if (this.encode.density) { materialDensities = group.values(this.encode.density, dataset); }
        let materialType;
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
        const materials: Core.Material[] = new Array(dataset.length);
        for (let i = 0; i < dataset.length; i++) {
            materials[i] = new Core.Material();
            materials[i].type = materialType;
            materials[i].fill = fillColors ? fillColors[i] || Plot.FILL_COLOR : Plot.FILL_COLOR;
            materials[i].fuzz = materialFuzzes ? materialFuzzes[i] : Plot.MATERIAL_FUZZ;
            materials[i].gloss = materialGlosses ? materialGlosses[i] : Plot.MATERIAL_GLOSS;
            materials[i].refractiveIndex = materialRefractiveIndices ? materialRefractiveIndices[i] : Plot.MATERIAL_REFRACTIVE_INDEX;
            materials[i].density = materialDensities ? materialDensities[i] : Plot.MATERIAL_DENSITY;
        }
        vertexOptions.materials = materials;

        // Update
        scatter.update(buffer, ids, vertexOptions);

        // Add to scene
        scene.buffers.push(buffer);
    }

    public static async fromJSONAsync(group: Group, markJSON: any): Promise<Area> {
        return new Promise<Area>(async (resolve, reject) => {
            try {
                const mark = new Area(group);
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
                        if (encodeJSON.y2) { mark.encode.y2 = MarkEncodingValue.fromJSON(mark, group, encodeJSON.y2); }
                        if (encodeJSON.depth) { mark.encode.depth = MarkEncodingValue.fromJSON(mark, group, encodeJSON.depth); }

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
                console.log("error parsing area mark JSON", error);
                reject(error);
            }
        });
    }
}