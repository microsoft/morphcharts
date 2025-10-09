// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import * as Core from "core";
import { Dataset } from "../dataset.js";
import { IScene, Plot } from "../plot.js";
import { MarkEncodings, MarkEncodingValue } from "./encoding.js";
import { Group } from "./group.js";
import { Mark } from "./mark.js";

export class Line extends Mark {
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
            if (!dataset) { throw new Error(`line mark dataset "${this.from.data}" not found`); }
        }
        else {
            // Create empty dataset
            dataset = Dataset.CreateEmpty();
        }

        // Dimensions
        // Scaling from pixels to model size
        const maxDimension = Math.max(plot.width, plot.height, plot.depth);
        const scaling = plot.size / maxDimension;

        // x, y, z
        const positionsX = this.encode.x ? group.values(this.encode.x, dataset) : new Float32Array(dataset.length);
        const positionsY = this.encode.y ? group.values(this.encode.y, dataset) : new Float32Array(dataset.length);
        const positionsZ = this.encode.z ? group.values(this.encode.z, dataset) : new Float32Array(dataset.length);

        // Sizes
        const sizesX = new Float32Array(dataset.length);
        const sizesY = new Float32Array(dataset.length);
        const sizesZ = new Float32Array(dataset.length);
        let strokeWidths: Float32Array, strokeDepths: Float32Array;
        if (this.encode.strokeWidth) { strokeWidths = group.values(this.encode.strokeWidth, dataset); }
        if (this.encode.strokeDepth) { strokeDepths = group.values(this.encode.strokeDepth, dataset); }
        else { strokeDepths = strokeWidths; }

        // Join lines in data order
        // For a given line, line segments = number of points - 1
        let positionsXc: Float32Array, positionsYc: Float32Array, positionsZc: Float32Array;
        if (positionsX) { positionsXc = new Float32Array(dataset.length); }
        if (positionsY) { positionsYc = new Float32Array(dataset.length); }
        if (positionsZ) { positionsZc = new Float32Array(dataset.length); }
        const rotations = new Float32Array(dataset.length * 4);
        const rotation: Core.Quaternion = [0, 0, 0, 1];
        const lineIds = [];
        const direction: Core.Vector3 = [0, 0, 0];
        const identity: Core.Vector3 = [0, 1, 0];
        let ids = dataset.all.ids;
        if (ids.length > 1) {
            for (let i = 0; i < ids.length - 1; i++) {
                const fromId = ids[i];
                const toId = ids[i + 1];
                lineIds.push(fromId);
                let toPositionX: number, toPositionY: number, toPositionZ: number, fromPositionX: number, fromPositionY: number, fromPositionZ: number;
                if (positionsX) {
                    toPositionX = positionsX[toId];
                    fromPositionX = positionsX[fromId];
                    positionsXc[fromId] = (fromPositionX + toPositionX) / 2;
                }
                if (positionsY) {
                    toPositionY = positionsY[toId];
                    fromPositionY = positionsY[fromId];
                    positionsYc[fromId] = (fromPositionY + toPositionY) / 2;
                }
                if (positionsZ) {
                    toPositionZ = positionsZ[toId];
                    fromPositionZ = positionsZ[fromId];
                    positionsZc[fromId] = (fromPositionZ + toPositionZ) / 2;
                }

                // Rotation
                direction[0] = positionsX ? toPositionX - fromPositionX : 0;
                direction[1] = positionsY ? toPositionY - fromPositionY : 0;
                direction[2] = positionsZ ? toPositionZ - fromPositionZ : 0;
                let length = Core.vector3.length(direction);
                direction[0] /= length;
                direction[1] /= length;
                direction[2] /= length;
                Core.quaternion.rotationTo(identity, direction, rotation);
                rotations[fromId * 4] = rotation[0];
                rotations[fromId * 4 + 1] = rotation[1];
                rotations[fromId * 4 + 2] = rotation[2];
                rotations[fromId * 4 + 3] = rotation[3];

                // Length
                sizesY[fromId] = length;

                // Width and depth
                const strokeWidth = strokeWidths ? (strokeWidths[fromId] + strokeWidths[toId]) / 2 : 1;
                const strokeDepth = strokeDepths ? (strokeDepths[fromId] + strokeDepths[toId]) / 2 : 1;
                sizesX[fromId] = strokeWidth;
                sizesZ[fromId] = strokeDepth;
            }
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
                if (sizesX) { row.push(sizesX[i].toString()); }
                if (sizesY) { row.push(sizesY[i].toString()); }
                if (sizesZ) { row.push(sizesZ[i].toString()); }
                rows.push(row);
            }
            // Datum reference to mark dataset
            group.datasets[this.name] = new Dataset(headings, rows, columnTypes, dataset);
        }

        // Buffer
        ids = new Uint32Array(lineIds);
        const bufferOptions: Core.IBufferOptions = {
            ids: ids,
            isInteractive: this.interactive,
        }
        const buffer = new Core.Buffer(bufferOptions);
        let unitType;
        switch (this.geometry && this.geometry.toLowerCase()) {
            default:
                unitType = "box";
                break;
            case "box":
            case "boxsdf":
            case "cylinder":
            case "cylindersdf":
            case "tubesdf":
                unitType = this.geometry.toLowerCase();
                break;
        }
        buffer.unitType = unitType;

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
        }

        // Materials
        let fillColors: Core.ColorRGB[];
        let materialFuzzes: Float32Array;
        let materialGlosses: Float32Array;
        let materialRefractiveIndices: Float32Array;
        let materialDensities: Float32Array;
        if (this.encode.stroke) { fillColors = group.colorValues(this.encode.stroke, dataset); }
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

    public static async fromJSONAsync(group: Group, markJSON: any): Promise<Line> {
        return new Promise<Line>(async (resolve, reject) => {
            try {
                const mark = new Line(group);
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
                        if (encodeJSON.strokeWidth) { mark.encode.strokeWidth = MarkEncodingValue.fromJSON(mark, group, encodeJSON.strokeWidth); }
                        if (encodeJSON.strokeDepth) { mark.encode.strokeDepth = MarkEncodingValue.fromJSON(mark, group, encodeJSON.strokeDepth); }

                        // Color
                        if (encodeJSON.stroke) { mark.encode.stroke = MarkEncodingValue.fromJSON(mark, group, encodeJSON.stroke); }

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
                console.log("error parsing line mark JSON", error);
                reject(error);
            }
        });
    }
}