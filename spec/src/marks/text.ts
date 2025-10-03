// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import * as Core from "core";
import { Dataset } from "../dataset.js";
import { IScene, Plot } from "../plot.js";
import { MarkEncodings, MarkEncodingValue } from "./encoding.js";
import { Group } from "./group.js";
import { Mark } from "./mark.js";

export class Text extends Mark {
    public group: Group;
    public numberFormat: object;
    public dateTimeFormat: object;

    constructor(group: Group) {
        super();
        this.group = group;
    }

    public process(plot: Plot, scene: IScene): void {
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

        // x, y, z
        const positionsX = this.encode.x ? group.values(this.encode.x, dataset) : new Float32Array(dataset.length);
        const positionsY = this.encode.y ? group.values(this.encode.y, dataset) : new Float32Array(dataset.length);
        const positionsZ = this.encode.z ? group.values(this.encode.z, dataset) : new Float32Array(dataset.length);

        // dx, dy, dz (before rotation)
        let offsetsX: Float32Array, offsetsY: Float32Array, offsetsZ: Float32Array;
        if (this.encode.dx) { offsetsX = group.values(this.encode.dx, dataset); }
        if (this.encode.dy) { offsetsY = group.values(this.encode.dy, dataset); }
        if (this.encode.dz) { offsetsZ = group.values(this.encode.dz, dataset); }

        // Polar coordinates
        let radii: Float32Array, thetas: Float32Array;
        if (this.encode.radius && this.encode.theta) {
            radii = group.values(this.encode.radius, dataset);
            thetas = group.values(this.encode.theta, dataset);
        }

        // Alignment
        // TODO: Support non-numeric mark encodings, e.g. I should be able to encode text alignment with a string of "left", "center", "right".
        // MarkEncodingStrings? Only needed for alignments and other categorical encodings
        const align = this.encode.align;
        const baseline = this.encode.baseline;
        let horizontalALignment: string;
        switch (align) {
            case "left":
                horizontalALignment = "left";
                break;
            case "center":
            default:
                horizontalALignment = "center";
                break;
            case "right":
                horizontalALignment = "right";
                break;
        }
        let verticalALignment: string;
        switch (baseline) {
            case "alphabetic":
            case "middle":
            default:
                verticalALignment = "center";
                break;
            case "bottom":
            case "line-bottom":
                verticalALignment = "bottom";
                break;
            case "line-top":
            case "top":
                verticalALignment = "top";
                break;
        }

        // Rotations
        let angles: Float32Array, anglesX: Float32Array, anglesY: Float32Array, anglesZ: Float32Array;
        let anglesX2: Float32Array, anglesY2: Float32Array, anglesZ2: Float32Array;
        if (this.encode.angle) { angles = group.values(this.encode.angle, dataset); }
        if (this.encode.angleX) { anglesX = group.values(this.encode.angleX, dataset); }
        if (this.encode.angleY) { anglesY = group.values(this.encode.angleY, dataset); }
        if (this.encode.angleZ) { anglesZ = group.values(this.encode.angleZ, dataset); }
        if (this.encode.angleX2) { anglesX2 = group.values(this.encode.angleX2, dataset); }
        if (this.encode.angleY2) { anglesY2 = group.values(this.encode.angleY2, dataset); }
        if (this.encode.angleZ2) { anglesZ2 = group.values(this.encode.angleZ2, dataset); }
        const rotations = new Float64Array(dataset.length * 4);
        const rotations2 = new Float64Array(dataset.length * 4);
        let rotation: Core.Quaternion, rotation2: Core.Quaternion;
        for (let i = 0; i < dataset.length; i++) {
            if (this.encode.rotation) { rotation = this.encode.rotation; }
            else if (angles || anglesX || anglesY || anglesZ) {
                const angleY = angles ? Core.Constants.RADIANS_PER_DEGREE * angles[i] : anglesY ? Core.Constants.RADIANS_PER_DEGREE * anglesY[i] : 0;
                const angleX = anglesX ? Core.Constants.RADIANS_PER_DEGREE * anglesX[i] : 0;
                const angleZ = anglesZ ? Core.Constants.RADIANS_PER_DEGREE * anglesZ[i] : 0;
                rotation = [0, 0, 0, 1];
                // Clockwise rotation when looking along axis from +ve to -ve
                if (angleZ) { Core.quaternion.rotateZ(rotation, -angleZ, rotation); }
                if (angleY) { Core.quaternion.rotateY(rotation, -angleY, rotation); }
                if (angleX) { Core.quaternion.rotateX(rotation, -angleX, rotation); }
            }
            else { rotation = [0, 0, 0, 1]; }
            rotations[i * 4] = rotation[0];
            rotations[i * 4 + 1] = rotation[1];
            rotations[i * 4 + 2] = rotation[2];
            rotations[i * 4 + 3] = rotation[3];

            if (this.encode.rotation2) { rotation2 = this.encode.rotation2; }
            else if (anglesX2 || anglesY2 || anglesZ2) {
                const angleY2 = anglesY2 ? Core.Constants.RADIANS_PER_DEGREE * anglesY2[i] : 0;
                const angleX2 = anglesX2 ? Core.Constants.RADIANS_PER_DEGREE * anglesX2[i] : 0;
                const angleZ2 = anglesZ2 ? Core.Constants.RADIANS_PER_DEGREE * anglesZ2[i] : 0;
                rotation2 = [0, 0, 0, 1];
                // Clockwise rotation when looking along axis from +ve to -ve
                if (angleZ2) { Core.quaternion.rotateZ(rotation2, -angleZ2, rotation2); }
                if (angleY2) { Core.quaternion.rotateY(rotation2, -angleY2, rotation2); }
                if (angleX2) { Core.quaternion.rotateX(rotation2, -angleX2, rotation2); }
            }
            else { rotation2 = [0, 0, 0, 1]; }
            rotations2[i * 4] = rotation2[0];
            rotations2[i * 4 + 1] = rotation2[1];
            rotations2[i * 4 + 2] = rotation2[2];
            rotations2[i * 4 + 3] = rotation2[3];

            // Radius, theta
            if (radii && thetas) {
                const radius = radii[i];
                const theta = thetas[i];
                const radialAxis: Core.Vector3 = [
                    Math.sin(theta),
                    Math.cos(theta),
                    0
                ];
                if (rotation2[3] !== 1) { Core.vector3.transformQuaternion(radialAxis, rotation2, radialAxis); }
                positionsX[i] += radialAxis[0] * radius;
                positionsY[i] += radialAxis[1] * radius;
                positionsZ[i] += radialAxis[2] * radius;
            }

            // Update position from dx, dy, dz
            const dx = offsetsX ? offsetsX[i] : 0;
            const dy = offsetsY ? offsetsY[i] : 0;
            const dz = offsetsZ ? offsetsZ[i] : 0;
            const d: Core.Vector3 = [dx, dy, dz];
            Core.vector3.transformQuaternion(d, rotation, d);
            positionsX[i] += d[0];
            positionsY[i] += d[1];
            positionsZ[i] += d[2];
        }

        // Line breaks
        const lineBreak = this.encode.lineBreak;

        // Labels
        // TODO: Multiline labels
        const numberFormatOptions = this.numberFormat;
        const numberFormat = new Intl.NumberFormat('en-US', numberFormatOptions);
        const dateTimeFormatOptions = this.dateTimeFormat;
        const dateTimeFormat = new Intl.DateTimeFormat('en-US', dateTimeFormatOptions);
        let glyphCount = 0;
        let labels: string[][] = [];
        let field = this.encode.text.field
        let value = this.encode.text.value;
        let label: string;
        let labelLines: string[];
        if (field) {
            // TODO: Move this to a common function
            let baseDataset: Dataset, columnIndex: number;
            // Is this a datum reference?
            if (field.startsWith("datum") && dataset.datum) {
                let datumField;
                // datum reference can be either "datum['field']" or "datum.field"
                // Determine which one is used and extract the field name
                if (field.startsWith("datum['")) {
                    datumField = field.substring(7, field.length - 2);
                }
                else {
                    datumField = field.substring(6);
                }
                baseDataset = dataset.datum;
                columnIndex = baseDataset.getColumnIndex(datumField);
            }
            else {
                baseDataset = dataset;
                columnIndex = baseDataset.getColumnIndex(field);
            }
            if (columnIndex == -1) {
                throw new Error(`text field ${field} not found`);
            }
            const distinctStrings = baseDataset.all.distinctStrings(columnIndex);
            const columnValues = baseDataset.all.columnValues(columnIndex, false);
            for (let i = 0; i < baseDataset.length; i++) {
                switch (baseDataset.getColumnType(columnIndex)) {
                    case Core.Data.ColumnType.string:
                        label = distinctStrings[columnValues[i]];
                        if (lineBreak) {
                            labelLines = label.split(lineBreak);
                        }
                        else { labelLines = [label]; }
                        break;
                    case Core.Data.ColumnType.float:
                    case Core.Data.ColumnType.integer:
                        label = numberFormat.format(columnValues[i]);
                        labelLines = [label];
                        break;
                    case Core.Data.ColumnType.date:
                        const date = new Date(columnValues[i]);
                        label = dateTimeFormat.format(date);
                        labelLines = [label];
                        break;
                }
                for (let j = 0; j < labelLines.length; j++) {
                    glyphCount += labelLines[j].length;
                }
                labels.push(labelLines);
            }
        }
        else if (value) {
            label = value.toString();
            if (lineBreak) { labelLines = label.split(lineBreak); }
            else { labelLines = [label]; }
            for (let i = 0; i < dataset.length; i++) {
                glyphCount += label.length;
                labels.push(labelLines);
            }
        }

        // Font
        const font = this.encode.font || Plot.FONT;
        const weight = this.encode.fontWeight || Plot.FONT_WEIGHT;
        const style = this.encode.fontStyle || Plot.FONT_STYLE;

        // Font size
        let fontSizes: Float32Array;
        if (this.encode.fontSize) {
            fontSizes = group.values(this.encode.fontSize, dataset);
            for (let i = 0; i < dataset.length; i++) { fontSizes[i] *= scaling; }
        }
        else {
            fontSizes = new Float32Array(dataset.length);
            for (let i = 0; i < dataset.length; i++) { fontSizes[i] = scaling * Plot.FONT_SIZE; }
        }

        // Stroke
        let strokeWidths: Float32Array;
        if (this.encode.strokeWidth) {
            strokeWidths = group.values(this.encode.strokeWidth, dataset);
            for (let i = 0; i < dataset.length; i++) { strokeWidths[i] *= scaling; }
        }
        else {
            strokeWidths = new Float32Array(dataset.length);
        }

        // Create label set
        const labelSetOptions: Core.ILabelSetOptions = {
            // Shift by group offset
            minBoundsX: -scaling * group.x,
            maxBoundsX: scaling * (plot.width - group.x),
            minBoundsY: -scaling * group.y,
            maxBoundsY: scaling * (plot.height - group.y),
            minBoundsZ: -scaling * group.z,
            maxBoundsZ: scaling * (plot.depth - group.z),

            // Text
            maxGlyphs: glyphCount,
            labels: labels,

            // Font
            font: font,
            fontWeight: weight,
            fontStyle: style,

            // Scale
            sizes: fontSizes,
            strokeWidths: strokeWidths,

            // Rotations
            rotations: rotations,

            // Alignment
            horizontalAlignment: horizontalALignment,
            verticalAlignment: verticalALignment,

            // Positions
            positionsX: positionsX,
            positionsY: positionsY,
            positionsZ: positionsZ,

            // Scaling
            positionScalingX: scaling,
            positionScalingY: scaling,
            positionScalingZ: scaling,
        };

        // Materials
        let fillColors: Core.ColorRGB[], strokeColors: Core.ColorRGB[];
        let materialFuzzes: Float32Array;
        let materialGlosses: Float32Array;
        let materialRefractiveIndices: Float32Array;
        let materialDensities: Float32Array;
        if (this.encode.fill) { fillColors = group.colorValues(this.encode.fill, dataset); }
        if (this.encode.stroke) { strokeColors = group.colorValues(this.encode.stroke, dataset); }
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
            materials[i].fill = fillColors ? fillColors[i] || Plot.TEXT_COLOR : Plot.TEXT_COLOR;
            materials[i].fuzz = materialFuzzes ? materialFuzzes[i] : Plot.MATERIAL_FUZZ;
            materials[i].gloss = materialGlosses ? materialGlosses[i] : Plot.MATERIAL_GLOSS;
            materials[i].refractiveIndex = materialRefractiveIndices ? materialRefractiveIndices[i] : Plot.MATERIAL_REFRACTIVE_INDEX;
            materials[i].density = materialDensities ? materialDensities[i] : Plot.MATERIAL_DENSITY;

            // Stroke
            materials[i].stroke = strokeColors ? strokeColors[i] || Plot.TEXT_STROKE_COLOR : Plot.TEXT_STROKE_COLOR;
        }
        labelSetOptions.materials = materials;

        // Add to scene
        const labelSet = new Core.LabelSet(labelSetOptions);
        scene.labels.push(labelSet);

        // Data source for reactive geometry
        if (this.name) {
            const headings = [];
            const columnTypes: Core.Data.ColumnType[] = [];
            const rows = [];
            headings.push("x"); columnTypes.push(Core.Data.ColumnType.float);
            headings.push("y"); columnTypes.push(Core.Data.ColumnType.float);
            headings.push("z"); columnTypes.push(Core.Data.ColumnType.float);
            for (let i = 0; i < dataset.length; i++) {
                const row: string[] = [];
                row.push(positionsX[i].toString());
                row.push(positionsY[i].toString());
                row.push(positionsZ[i].toString());
                rows.push(row);
            }
            // Datum reference to mark dataset
            group.datasets[this.name] = new Dataset(headings, rows, columnTypes, dataset);
        }
    }

    public static async fromJSONAsync(group: Group, markJSON: any): Promise<Text> {
        return new Promise<Text>(async (resolve, reject) => {
            try {
                const mark = new Text(group);
                mark._fromJSONAsync(markJSON);

                // Number format
                if (markJSON.numberFormat) {
                    mark.numberFormat = markJSON.numberFormat;
                }

                // DateTime format
                if (markJSON.dateTimeFormat) {
                    mark.dateTimeFormat = markJSON.dateTimeFormat;
                }

                // Encodings
                mark.encode = new MarkEncodings();
                if (markJSON.encode) {
                    // Combine enter and update
                    const encodeJSON: any = {};
                    Object.assign(encodeJSON, markJSON.encode.enter, markJSON.encode.update);
                    if (encodeJSON) {
                        // Position
                        if (encodeJSON.x) { mark.encode.x = MarkEncodingValue.fromJSON(mark, group, encodeJSON.x); }
                        if (encodeJSON.y) { mark.encode.y = MarkEncodingValue.fromJSON(mark, group, encodeJSON.y); }
                        if (encodeJSON.z) { mark.encode.z = MarkEncodingValue.fromJSON(mark, group, encodeJSON.z); }
                        if (encodeJSON.xc) { mark.encode.xc = MarkEncodingValue.fromJSON(mark, group, encodeJSON.xc); }
                        if (encodeJSON.yc) { mark.encode.yc = MarkEncodingValue.fromJSON(mark, group, encodeJSON.yc); }
                        if (encodeJSON.zc) { mark.encode.zc = MarkEncodingValue.fromJSON(mark, group, encodeJSON.zc); }
                        if (encodeJSON.x2) { mark.encode.x2 = MarkEncodingValue.fromJSON(mark, group, encodeJSON.x2); }
                        if (encodeJSON.y2) { mark.encode.y2 = MarkEncodingValue.fromJSON(mark, group, encodeJSON.y2); }
                        if (encodeJSON.z2) { mark.encode.z2 = MarkEncodingValue.fromJSON(mark, group, encodeJSON.z2); }
                        if (encodeJSON.dx) { mark.encode.dx = MarkEncodingValue.fromJSON(mark, group, encodeJSON.dx); }
                        if (encodeJSON.dy) { mark.encode.dy = MarkEncodingValue.fromJSON(mark, group, encodeJSON.dy); }
                        if (encodeJSON.dz) { mark.encode.dz = MarkEncodingValue.fromJSON(mark, group, encodeJSON.dz); }

                        // Polar coordinates
                        if (encodeJSON.radius) { mark.encode.radius = MarkEncodingValue.fromJSON(mark, group, encodeJSON.radius); } // Radial offset in pixels, relative to the origin determined by the x and y properties (default 0).
                        if (encodeJSON.theta) { mark.encode.theta = MarkEncodingValue.fromJSON(mark, group, encodeJSON.theta); } // Angle in radians, relative to the origin determined by the x and y properties (default 0).
                        if (encodeJSON.angleX2) { mark.encode.angleX2 = MarkEncodingValue.fromJSON(mark, group, encodeJSON.angleX2); }
                        if (encodeJSON.angleY2) { mark.encode.angleY2 = MarkEncodingValue.fromJSON(mark, group, encodeJSON.angleY2); }
                        if (encodeJSON.angleZ2) { mark.encode.angleZ2 = MarkEncodingValue.fromJSON(mark, group, encodeJSON.angleZ2); }
                        if (encodeJSON.rotation2) { mark.encode.rotation2 = encodeJSON.rotation2.value; }

                        // Text
                        if (encodeJSON.text) { mark.encode.text = MarkEncodingValue.fromJSON(mark, group, encodeJSON.text); }
                        if (encodeJSON.align) { mark.encode.align = encodeJSON.align.value; }
                        if (encodeJSON.baseline) { mark.encode.baseline = encodeJSON.baseline.value; }
                        if (encodeJSON.font) { mark.encode.font = encodeJSON.font.value; }
                        if (encodeJSON.fontWeight) { mark.encode.fontWeight = encodeJSON.fontWeight.value; }
                        if (encodeJSON.fontStyle) { mark.encode.fontStyle = encodeJSON.fontStyle.value; }
                        if (encodeJSON.fontSize) { mark.encode.fontSize = MarkEncodingValue.fromJSON(mark, group, encodeJSON.fontSize); }
                        if (encodeJSON.lineBreak) { mark.encode.lineBreak = encodeJSON.lineBreak.value; }

                        // Rotation
                        if (encodeJSON.angle) { mark.encode.angle = MarkEncodingValue.fromJSON(mark, group, encodeJSON.angle); }
                        if (encodeJSON.angleX) { mark.encode.angleX = MarkEncodingValue.fromJSON(mark, group, encodeJSON.angleX); }
                        if (encodeJSON.angleY) { mark.encode.angleY = MarkEncodingValue.fromJSON(mark, group, encodeJSON.angleY); }
                        if (encodeJSON.angleZ) { mark.encode.angleZ = MarkEncodingValue.fromJSON(mark, group, encodeJSON.angleZ); }
                        if (encodeJSON.rotation) { mark.encode.rotation = encodeJSON.rotation.value; }

                        // Color
                        if (encodeJSON.fill) { mark.encode.fill = MarkEncodingValue.fromJSON(mark, group, encodeJSON.fill); }
                        if (encodeJSON.stroke) { mark.encode.stroke = MarkEncodingValue.fromJSON(mark, group, encodeJSON.stroke); }
                        if (encodeJSON.strokeWidth) { mark.encode.strokeWidth = MarkEncodingValue.fromJSON(mark, group, encodeJSON.strokeWidth); }

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
                console.log("error parsing text mark JSON", error);
                reject(error);
            }
        });
    }
}