// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import * as Core from "core";
import { Dataset } from "../dataset.js";
import { IScene, Plot } from "../plot.js";
import { MarkEncodings, MarkEncodingValue } from "./encoding.js";
import { Group } from "./group.js";
import { Mark } from "./mark.js";

export class Arc extends Mark {
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
            if (!dataset) { throw new Error(`arc mark dataset "${this.from.data}" not found`); }
        }
        else {
            // Create empty dataset
            dataset = new Dataset([""], [[""]], [Core.Data.ColumnType.string]);
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
                unitType = "ringsdf";
                break;
            case "cappedtorussdf":
                unitType = this.geometry.toLowerCase();
                break;
        }
        buffer.unitType = unitType;

        // Dimensions
        // Scaling from pixels to model size
        const maxDimension = Math.max(plot.width, plot.height, plot.depth);
        const scaling = plot.size / maxDimension;

        // x, y, z
        let positionsX: Float32Array, positionsY: Float32Array, positionsZ: Float32Array;
        if (this.encode.x) { positionsX = group.values(this.encode.x, dataset); }
        if (this.encode.y) { positionsY = group.values(this.encode.y, dataset); }
        if (this.encode.z) { positionsZ = group.values(this.encode.z, dataset); }

        // Inner radii, outer radii, pad angles, heights
        let innerRadii: Float32Array, outerRadii: Float32Array, padAngles: Float32Array, depths: Float32Array, polarOffsets: Float32Array;
        if (this.encode.innerRadius) { innerRadii = group.values(this.encode.innerRadius, dataset); }
        if (this.encode.outerRadius) { outerRadii = group.values(this.encode.outerRadius, dataset); }
        if (this.encode.padAngle) { padAngles = group.values(this.encode.padAngle, dataset); }
        // Polar coordinate radial offset relative to x,y origin
        if (this.encode.radius) { polarOffsets = group.values(this.encode.radius, dataset); }
        if (this.encode.depth) { depths = group.values(this.encode.depth, dataset); }

        // Start, end angles
        const startAngles = group.values(this.encode.startAngle, dataset);
        const endAngles = group.values(this.encode.endAngle, dataset);

        // Pad angle
        if (padAngles) {
            for (let i = 0; i < dataset.length; i++) {
                const padAngle = padAngles[i];
                startAngles[i] += padAngle * 0.5;
                endAngles[i] -= padAngle * 0.5;
            }
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

        // Polar offsets
        if (polarOffsets) {
            for (let i = 0; i < dataset.length; i++) {
                const offset = polarOffsets ? polarOffsets[i] : 0;
                const offsetAngle = (startAngles[i] + endAngles[i]) / 2;
                const radialAxis: Core.Vector3 = [
                    Math.sin(offsetAngle),
                    Math.cos(offsetAngle),
                    0
                ];
                if (rotation[3] !== 1) { Core.vector3.transformQuaternion(radialAxis, rotation, radialAxis); }
                positionsX[i] += radialAxis[0] * offset;
                positionsY[i] += radialAxis[1] * offset;
                positionsZ[i] += radialAxis[2] * offset;
            }
        }

        // Paddings
        let paddings: Float32Array;
        if (this.encode.padding && dataset.length > 0) { paddings = group.values(this.encode.padding, dataset); }
        else { paddings = new Float32Array(dataset.length); }

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
            if (positionsX) { headings.push("x"); columnTypes.push(Core.Data.ColumnType.float) };
            if (positionsY) { headings.push("y"); columnTypes.push(Core.Data.ColumnType.float) };
            if (positionsZ) { headings.push("z"); columnTypes.push(Core.Data.ColumnType.float) };
            if (startAngles) { headings.push("startAngle"); columnTypes.push(Core.Data.ColumnType.float); }
            if (endAngles) { headings.push("endAngle"); columnTypes.push(Core.Data.ColumnType.float); }
            if (innerRadii) { headings.push("innerRadius"); columnTypes.push(Core.Data.ColumnType.float); }
            if (outerRadii) { headings.push("outerRadius"); columnTypes.push(Core.Data.ColumnType.float); }
            for (let i = 0; i < dataset.length; i++) {
                const row: string[] = [];
                if (segmentIds) { row.push(segmentIds[i].toString()); }
                if (positionsX) { row.push(positionsX[i].toString()) };
                if (positionsY) { row.push(positionsY[i].toString()) };
                if (positionsZ) { row.push(positionsZ[i].toString()) };
                if (startAngles) { row.push(startAngles[i].toString()); }
                if (endAngles) { row.push(endAngles[i].toString()); }
                if (innerRadii) { row.push(innerRadii[i].toString()); }
                if (outerRadii) { row.push(outerRadii[i].toString()); }
                rows.push(row);
            }
            // Datum reference to mark dataset
            group.datasets[this.name] = new Dataset(headings, rows, columnTypes, dataset);
        }

        // Layout
        const scatter = new Core.Layouts.Scatter();
        const outerDiameters = new Float32Array(dataset.length);
        for (let i = 0; i < dataset.length; i++) { outerDiameters[i] = outerRadii[i] * 2; }
        // Define inner diameters and paddings in scale-independent units of outer diameters
        const innerDiameters = new Float32Array(dataset.length);
        if (innerRadii) { for (let i = 0; i < dataset.length; i++) { innerDiameters[i] = innerRadii[i] / outerRadii[i]; } }
        if (paddings) { for (let i = 0; i < dataset.length; i++) { paddings[i] = paddings[i] / outerRadii[i]; } }
        const layoutOptions: Core.Layouts.IScatterLayoutOptions = {
            positionsX: positionsX,
            positionsY: positionsY,
            positionsZ: positionsZ,
            positionScalingX: scaling,
            positionScalingY: scaling,
            positionScalingZ: scaling,
            sizesX: outerDiameters,
            sizesY: outerDiameters,
            sizesZ: depths,
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
            params: [
                { index: 0, values: innerDiameters },
                { index: 1, values: startAngles },
                { index: 2, values: endAngles },
                { index: 3, values: paddings },
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

    public static async fromJSONAsync(group: Group, markJSON: any): Promise<Arc> {
        return new Promise<Arc>(async (resolve, reject) => {
            try {
                const mark = new Arc(group);
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
                        if (encodeJSON.dz) { mark.encode.dz = MarkEncodingValue.fromJSON(mark, group, encodeJSON.dz); }
                        if (encodeJSON.depth) { mark.encode.depth = MarkEncodingValue.fromJSON(mark, group, encodeJSON.depth); }
                        if (encodeJSON.startAngle) { mark.encode.startAngle = MarkEncodingValue.fromJSON(mark, group, encodeJSON.startAngle); }
                        if (encodeJSON.endAngle) { mark.encode.endAngle = MarkEncodingValue.fromJSON(mark, group, encodeJSON.endAngle); }
                        if (encodeJSON.innerRadius) { mark.encode.innerRadius = MarkEncodingValue.fromJSON(mark, group, encodeJSON.innerRadius); }
                        if (encodeJSON.outerRadius) { mark.encode.outerRadius = MarkEncodingValue.fromJSON(mark, group, encodeJSON.outerRadius); }
                        if (encodeJSON.padAngle) { mark.encode.padAngle = MarkEncodingValue.fromJSON(mark, group, encodeJSON.padAngle); }
                        if (encodeJSON.padding) { mark.encode.padding = MarkEncodingValue.fromJSON(mark, group, encodeJSON.padding); }
                        if (encodeJSON.radius) { mark.encode.radius = MarkEncodingValue.fromJSON(mark, group, encodeJSON.radius); }

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
                console.log("error parsing arc mark JSON", error);
                reject(error);
            }
        });
    }
}