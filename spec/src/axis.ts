// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import * as Core from "core";
import { Group } from "./marks/group.js";
import { IScene, Plot } from "./plot.js";
import { Scale } from "./scales/scale.js";
import { Band } from "./scales/band.js";

// RH coordinates (+z from screen to eye, -z from eye to screen)
//    +y
//     |                        |     option 1     |     option 2
//     |____ +x            edge | orient | orientZ | orient | orientZ
//    /                    -----+--------+---------+--------+--------
//  +z                        0 | top    | front   |        |
//      .-------2-------.     1 | top    | right   | right  | top
//     /|              /|     2 | top    | back    |        |
//    3 |             1 |     3 | top    | left    | left   | top
//   /  10           /  9     4 | bottom | front   |        |
//  .-------0-------.   |     5 | bottom | right   | right  | bottom
//  |   |           |   |     6 | bottom | back    |        |
//  |   .-------6---|---.     7 | bottom | left    | left   | bottom
// 11  /            8  /      8 | right  | front   |        |
//  | 7             | 5       9 | right  | back    |        |
//  |/              |/       10 | left   | back    |        |
//  '-------4-------'        11 | left   | front   |        |
export class Axis {
    public edgeId: number;
    public orient: string; // left, right, top, bottom
    public orientZ: string; // front, back, left, right
    public scale: Scale;
    public tickCount: number;

    // Title
    public title: string;
    public titleFont: string;
    public titleFontSize: number;
    public titleFontWeight: number;
    public titleAlign: string;
    public titleBaseline: string;
    public titleRotation: Core.Quaternion;
    public titleAngleX: number; // Rotation around the x-axis, degrees
    public titleAngleY: number; // Rotation around the y-axis, degrees
    public titleAngleZ: number; // Rotation around the z-axis, degrees
    public titleOffset: number; // For x-axis, offset in x, for y-axis, offset in y, for z-axis, offset in z
    public titleOffsetX: number; // Offset in x axis
    public titleOffsetY: number; // Offset in y axis
    public titleOffsetZ: number; // Offset in z axis
    public titleFill: string;
    public titleStroke: string;
    public titleStrokeWidth: number;

    // Labels
    // TODO: labelPadding, labelFlush (deal with rotation)
    public labels: boolean;
    public labelFont: string;
    public labelFontSize: number;
    public labelFontWeight: number;
    public labelAlign: string;
    public labelBaseline: string;
    public labelRotation: Core.Quaternion
    public labelAngleX: number; // Rotation around the x-axis, degrees
    public labelAngleY: number; // Rotation around the y-axis, degrees
    public labelAngleZ: number; // Rotation around the z-axis, degrees
    public labelOffset: number; // For x-axis, offset in x, for y-axis, offset in y, for z-axis, offset in z
    public labelOffsetX: number; // Offset in x axis
    public labelOffsetY: number; // Offset in y axis
    public labelOffsetZ: number; // Offset in z axis
    public labelFill: string;
    public labelStroke: string;
    public labelStrokeWidth: number;
    public numberFormat: object;
    public dateTimeFormat: object;

    // Domain (baseline)
    public domain: boolean; // Show axis domain
    public domainWidth: number; // Width of axis domain
    public domainColor: string;

    // Grid
    public grid: boolean; // Show grid lines. For x axis, show grid lines in y this. For y axis, show grid lines in x this. For z-axis, depends on the values of gridX, gridY.
    public gridX: boolean; // For z axis, show grid lines in x axis
    public gridY: boolean; // For z axis, show grid lines in y axis
    public gridZ: boolean; // For x or y axis, show grid lines in z axis
    public gridWidth: number; // Width of grid lines
    public gridWidthX: number; // Width of grid lines in x axis
    public gridWidthY: number; // Width of grid lines in y axis
    public gridWidthZ: number; // Width of grid lines in z axis
    public gridColor: string;

    // Band
    public bandPosition: number; // For band scales, position of ticks within band, [0,1], default 0.5
    public bandLabelPosition: number; // For band scales, position of labels within band, [0,1], default bandPosition
    public bandGridPosition: number; // For band scales, position of grid lines within band, [0,1], default bandPosition

    public static fromJSON(group: Group, axisJSON: any): Axis {
        const axis = new Axis();
        axis.orient = axisJSON.orient;
        axis.orientZ = axisJSON.orientZ || "front";
        axis.tickCount = axisJSON.tickCount;
        axis.scale = group.getScale(axisJSON.scale);

        // Title
        axis.title = axisJSON.title;
        axis.titleFont = axisJSON.titleFont;
        axis.titleFontSize = axisJSON.titleFontSize;
        axis.titleFontWeight = axisJSON.titleFontWeight;
        axis.titleAlign = axisJSON.titleAlign;
        axis.titleBaseline = axisJSON.titleBaseline;
        axis.titleRotation = axisJSON.titleRotation;
        axis.titleOffset = axisJSON.titleOffset;
        axis.titleOffsetX = axisJSON.titleOffsetX;
        axis.titleOffsetY = axisJSON.titleOffsetY;
        axis.titleOffsetZ = axisJSON.titleOffsetZ;
        axis.titleAngleX = axisJSON.titleAngleX;
        axis.titleAngleY = axisJSON.titleAngleY;
        axis.titleAngleZ = axisJSON.titleAngle || axisJSON.titleAngleZ;
        axis.titleFill = axisJSON.titleColor;
        axis.titleStroke = axisJSON.titleStroke;
        axis.titleStrokeWidth = axisJSON.titleStrokeWidth;

        // Labels
        axis.labels = axisJSON.labels;
        axis.labelFont = axisJSON.labelFont;
        axis.labelFontSize = axisJSON.labelFontSize;
        axis.labelFontWeight = axisJSON.labelFontWeight;
        axis.labelAlign = axisJSON.labelAlign;
        axis.labelBaseline = axisJSON.labelBaseline;
        axis.labelRotation = axisJSON.labelRotation;
        axis.labelOffset = axisJSON.labelOffset;
        axis.labelOffsetX = axisJSON.labelOffsetX;
        axis.labelOffsetY = axisJSON.labelOffsetY;
        axis.labelOffsetZ = axisJSON.labelOffsetZ
        axis.labelAngleX = axisJSON.labelAngleX;
        axis.labelAngleY = axisJSON.labelAngleY;
        axis.labelAngleZ = axisJSON.labelAngle || axisJSON.labelAngleZ;
        axis.labelFill = axisJSON.labelColor;
        axis.labelStroke = axisJSON.labelStroke;
        axis.labelStrokeWidth = axisJSON.labelStrokeWidth;
        axis.numberFormat = axisJSON.numberFormat;
        axis.dateTimeFormat = axisJSON.dateTimeFormat;

        // Domain (baseline)
        axis.domain = axisJSON.domain;
        axis.domainWidth = axisJSON.domainWidth;
        axis.domainColor = axisJSON.domainColor;

        // Grid
        axis.grid = axisJSON.grid;
        axis.gridX = axisJSON.gridX;
        axis.gridY = axisJSON.gridY;
        axis.gridZ = axisJSON.gridZ;
        axis.gridWidth = axisJSON.gridWidth;
        axis.gridWidthX = axisJSON.gridWidthX;
        axis.gridWidthY = axisJSON.gridWidthY;
        axis.gridWidthZ = axisJSON.gridWidthZ;
        axis.gridColor = axisJSON.gridColor;

        // Band
        axis.bandPosition = axisJSON.bandPosition != undefined ? axisJSON.bandPosition : 0.5;
        axis.bandLabelPosition = axisJSON.bandLabelPosition != undefined ? axisJSON.bandLabelPosition : axis.bandPosition;
        axis.bandGridPosition = axisJSON.bandGridPosition != undefined ? axisJSON.bandGridPosition : axis.bandPosition;

        // Edge Id
        switch (axis.orient) {
            case "top":
                switch (axis.orientZ) {
                    case "front":
                        axis.edgeId = 0;
                        break;
                    case "right":
                        axis.edgeId = 1;
                        break;
                    case "back":
                        axis.edgeId = 2;
                        break;
                    case "left":
                        axis.edgeId = 3;
                        break;
                }
                break;
            case "right":
                switch (axis.orientZ) {
                    case "front":
                        axis.edgeId = 8;
                        break;
                    case "back":
                        axis.edgeId = 9;
                        break;
                    case "top":
                        axis.edgeId = 1;
                        break;
                    case "bottom":
                        axis.edgeId = 5;
                        break;
                }
                break;
            case "bottom":
                switch (axis.orientZ) {
                    case "front":
                        axis.edgeId = 4;
                        break;
                    case "right":
                        axis.edgeId = 5;
                        break;
                    case "back":
                        axis.edgeId = 6;
                        break;
                    case "left":
                        axis.edgeId = 7;
                        break;
                }
                break;
            case "left":
                switch (axis.orientZ) {
                    case "front":
                        axis.edgeId = 11;
                        break;
                    case "back":
                        axis.edgeId = 10;
                        break;
                    case "top":
                        axis.edgeId = 3;
                        break;
                    case "bottom":
                        axis.edgeId = 7;
                        break;
                }
                break;
        }
        return axis;
    }

    public process(group: Group, plot: Plot, scene: IScene): void {
        // Dimensions
        // Scaling from pixels to model size
        const maxDimension = Math.max(plot.width, plot.height, plot.depth);
        const scaling = plot.size / maxDimension;

        // Log group position and size
        console.log(`axis edgeId ${this.edgeId}, group x ${group.x}, y ${group.y}, z ${group.z}, width ${group.width}, height ${group.height}, depth ${group.depth}`);

        // Labels, titles
        let glyphCount = 0;
        let labelsArray: string[][] = [];
        let labelPositionsXArray: number[] = [];
        let labelPositionsYArray: number[] = [];
        let labelPositionsZArray: number[] = [];
        let labelRotationsArray: number[] = [];
        let labelFontsArray: string[] = [];
        let labelScalesArray: number[] = [];
        let labelWeightsArray: number[] = [];
        let labelHorizontalAlignmentsArray: string[] = [];
        let labelVerticalAlignmentsArray: string[] = [];
        let labelFillArray: Core.ColorRGB[] = [];
        let labelStrokeArray: Core.ColorRGB[] = [];
        let labelStrokeWidthArray: number[] = [];

        // Domains, grids
        let gridPositionsXArray: number[] = [];
        let gridPositionsYArray: number[] = [];
        let gridPositionsZArray: number[] = [];
        let gridSizesXArray: number[] = [];
        let gridSizesYArray: number[] = [];
        let gridSizesZArray: number[] = [];
        let gridColorsArray: Core.ColorRGB[] = [];

        const scale = this.scale;
        const min = scale.domain.min;
        const max = scale.domain.max;

        // Label color
        let labelFill: Core.ColorRGB;
        let labelStroke: Core.ColorRGB;
        let labelStrokeWidth: number;
        if (this.labelFill) {
            // Check if value is a valid color name
            labelFill = Core.Colors[this.labelFill.toLowerCase()];
        }
        if (!labelFill) { labelFill = Plot.TEXT_COLOR; }
        if (this.labelStroke) {
            // Check if value is a valid color name
            labelStroke = Core.Colors[this.labelStroke.toLowerCase()];
        }
        if (!labelStroke) { labelStroke = Plot.TEXT_STROKE_COLOR; }
        labelStrokeWidth = this.labelStrokeWidth || 0;

        // Domain color
        let domainColor: Core.ColorRGB;
        if (this.domainColor) {
            // Check if value is a valid color name
            domainColor = Core.Colors[this.domainColor.toLowerCase()];
        }
        if (!domainColor) { domainColor = Plot.STROKE_COLOR; }

        // Grid color
        let gridColor: Core.ColorRGB;
        if (this.gridColor) {
            // Check if value is a valid color name
            gridColor = Core.Colors[this.gridColor.toLowerCase()];
        }
        if (!gridColor) { gridColor = Plot.STROKE_COLOR; }

        // Axis domain (baseline), default true
        const domain = this.domain !== false;
        if (domain) {
            // Position
            switch (this.edgeId) {
                // x
                case 0:
                    gridPositionsYArray.push(group.y + group.height);
                    gridPositionsZArray.push(group.z + group.depth);
                    break;
                case 2:
                    gridPositionsYArray.push(group.y + group.height);
                    gridPositionsZArray.push(group.z);
                    break;
                case 4:
                    gridPositionsYArray.push(group.y);
                    gridPositionsZArray.push(group.z + group.depth);
                    break;
                case 6:
                    gridPositionsYArray.push(group.y);
                    gridPositionsZArray.push(group.z);
                    break;
                // y
                case 8:
                    gridPositionsXArray.push(group.x + group.width);
                    gridPositionsZArray.push(group.z + group.depth);
                    break;
                case 9:
                    gridPositionsXArray.push(group.x + group.width);
                    gridPositionsZArray.push(group.z);
                    break;
                case 10:
                    gridPositionsXArray.push(group.x);
                    gridPositionsZArray.push(group.z);
                    break;
                case 11:
                    gridPositionsXArray.push(group.x);
                    gridPositionsZArray.push(group.z + group.depth);
                    break;
                // z
                case 1:
                    gridPositionsXArray.push(group.x + group.width);
                    gridPositionsYArray.push(group.y + group.height);
                    break;
                case 3:
                    gridPositionsXArray.push(group.x);
                    gridPositionsYArray.push(group.y + group.height);
                    break;
                case 5:
                    gridPositionsXArray.push(group.x + group.width);
                    gridPositionsYArray.push(group.y);
                    break;
                case 7:
                    gridPositionsXArray.push(group.x);
                    gridPositionsYArray.push(group.y);
                    break;
            }
            // Position, size
            const domainWidth = this.domainWidth || 1;
            switch (this.edgeId) {
                // x
                case 0:
                case 2:
                case 4:
                case 6:
                    gridPositionsXArray.push(group.x + group.width / 2);
                    gridSizesXArray.push(group.width);
                    gridSizesYArray.push(domainWidth);
                    gridSizesZArray.push(domainWidth);
                    break;
                // y
                case 8:
                case 9:
                case 10:
                case 11:
                    gridPositionsYArray.push(group.y + group.height / 2);
                    gridSizesXArray.push(domainWidth);
                    gridSizesYArray.push(group.height);
                    gridSizesZArray.push(domainWidth);
                    break;
                // z
                case 1:
                case 3:
                case 5:
                case 7:
                    gridPositionsZArray.push(group.z + group.depth / 2);
                    gridSizesXArray.push(domainWidth);
                    gridSizesYArray.push(domainWidth);
                    gridSizesZArray.push(group.depth);
                    break;
            }
            gridColorsArray.push(domainColor);
        }

        // Labels
        // TODO: Measure max "length" for title position
        const labels = this.labels == undefined ? true : this.labels;

        // Label font
        let labelFont = this.labelFont || Plot.FONT;
        let labelFontSize = this.labelFontSize || Plot.FONT_SIZE;
        let labelFontWeight = this.labelFontWeight || Plot.FONT_WEIGHT;

        // Label rotation
        let labelAngleX = -this.labelAngleX;
        let labelAngleY = -this.labelAngleY;
        let labelAngleZ = -this.labelAngleZ;
        let labelRotation: Core.Quaternion = this.labelRotation || [0, 0, 0, 1];
        if (labelAngleX) { Core.quaternion.rotateX(labelRotation, Core.Constants.RADIANS_PER_DEGREE * labelAngleX, labelRotation); }
        if (labelAngleY) { Core.quaternion.rotateY(labelRotation, Core.Constants.RADIANS_PER_DEGREE * labelAngleY, labelRotation); }
        if (labelAngleZ) { Core.quaternion.rotateZ(labelRotation, Core.Constants.RADIANS_PER_DEGREE * labelAngleZ, labelRotation); }

        // Label offsets
        // TODO: labelPadding for distance between ticks and labels
        let labelOffsetX = 0;
        let labelOffsetY = 0;
        let labelOffsetZ = 0;
        if (this.labelOffset) {
            // Axis offset applies along the axis
            switch (this.edgeId) {
                // x
                case 0:
                case 2:
                case 4:
                case 6:
                    labelOffsetX = this.labelOffset;
                    break;
                // y
                case 8:
                case 9:
                case 10:
                case 11:
                    labelOffsetY = this.labelOffset;
                    break;
                // z
                case 1:
                case 3:
                case 5:
                case 7:
                    labelOffsetZ = this.labelOffset;
                    break;
            }
        }

        // Override offsets
        if (this.labelOffsetX) { labelOffsetX = this.labelOffsetX; }
        if (this.labelOffsetY) { labelOffsetY = this.labelOffsetY; }
        if (this.labelOffsetZ) { labelOffsetZ = this.labelOffsetZ; }

        // Alignment
        let labelAlign = this.labelAlign;
        let labelBaseline = this.labelBaseline;
        let horizontalAlignment: string;
        switch (labelAlign) {
            case "left":
                horizontalAlignment = "left";
                break;
            case "center":
            default:
                horizontalAlignment = "center";
                break;
            case "right":
                horizontalAlignment = "right";
                break;
        }
        let verticalALignment: string;
        switch (labelBaseline) {
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

        // Formatting
        // Check field data type
        let labelFormat: Intl.NumberFormat | Intl.DateTimeFormat;
        if (scale && scale.domain.data && scale.domain.field) {
            const columnIndex = scale.domain.data.getColumnIndex(scale.domain.field);
            if (columnIndex != -1) {
                const columnType = scale.domain.data.getColumnType(columnIndex);
                switch (columnType) {
                    case Core.Data.ColumnType.float:
                    case Core.Data.ColumnType.integer:
                        const numberFormatOptions = this.numberFormat;
                        if (numberFormatOptions) { labelFormat = new Intl.NumberFormat('en-US', numberFormatOptions); }
                        break;
                    case Core.Data.ColumnType.date:
                        const dateTimeFormatOptions = this.dateTimeFormat;
                        if (dateTimeFormatOptions) { labelFormat = new Intl.DateTimeFormat('en-US', dateTimeFormatOptions); }
                }
            }
        }
        else {
            // Check formatType for scales that do not have a strict domain type
            const numberFormatOptions = this.numberFormat;
            if (numberFormatOptions) { labelFormat = new Intl.NumberFormat('en-US', numberFormatOptions); }
        }

        let label: string;
        let tickCount: number;
        let labelPositionX: number, labelPositionY: number, labelPositionZ: number;
        const gridWidth = this.gridWidth || 1;
        const gridWidthX = this.gridWidthX || gridWidth;
        const gridWidthY = this.gridWidthY || gridWidth;
        const gridWidthZ = this.gridWidthZ || gridWidth;
        switch (scale.type) {
            case "band":
            case "point": // Bandwidth = 0
                tickCount = this.tickCount == undefined ? max - min + 1 : this.tickCount;
                if (tickCount > 0) {
                    const dataset = scale.domain.data;
                    // TODO: Provide a function in the scale to get the base value
                    const field = scale.domain.field;
                    const columnIndex = dataset.getColumnIndex(field);
                    const distinctStrings = dataset.all.distinctStrings(columnIndex);
                    for (let i = 0; i < tickCount; i++) {
                        // Base value
                        let value = distinctStrings[i];

                        // Scale
                        const bandwidth = scale.type == "band" ? (scale as Band).bandwidth() : 0;
                        const scaledLabelValue = scale.map(value) + bandwidth * this.bandLabelPosition;
                        const scaledGridValue = scale.map(value) + bandwidth * this.bandGridPosition;
                        let grid = false;
                        switch (this.edgeId) {
                            // x
                            case 0:
                                labelPositionX = group.x + scaledLabelValue;
                                labelPositionY = group.y + group.height;
                                labelPositionZ = group.z + group.depth;
                                if (this.grid || this.gridY) {
                                    grid = true;
                                    gridPositionsXArray.push(group.x + scaledGridValue);
                                    gridPositionsYArray.push(group.y + group.height / 2);
                                    gridPositionsZArray.push(group.z + group.depth);
                                    gridSizesXArray.push(gridWidthX);
                                    gridSizesYArray.push(group.height);
                                    gridSizesZArray.push(gridWidthZ);
                                }
                                else if (this.gridZ) {
                                    grid = true;
                                    gridPositionsXArray.push(group.x + scaledGridValue);
                                    gridPositionsYArray.push(group.y + group.height);
                                    gridPositionsZArray.push(group.z + group.depth / 2);
                                    gridSizesXArray.push(gridWidthX);
                                    gridSizesYArray.push(gridWidthY);
                                    gridSizesZArray.push(group.depth);
                                }
                                break;
                            case 2:
                                labelPositionX = group.x + scaledLabelValue;
                                labelPositionY = group.y + group.height;
                                labelPositionZ = group.z;
                                if (this.grid || this.gridY) {
                                    grid = true;
                                    gridPositionsXArray.push(group.x + scaledGridValue);
                                    gridPositionsYArray.push(group.y + group.height / 2);
                                    gridPositionsZArray.push(group.z);
                                    gridSizesXArray.push(gridWidthX);
                                    gridSizesYArray.push(group.height);
                                    gridSizesZArray.push(gridWidthZ);
                                }
                                else if (this.gridZ) {
                                    grid = true;
                                    gridPositionsXArray.push(group.x + scaledGridValue);
                                    gridPositionsYArray.push(group.y + group.height);
                                    gridPositionsZArray.push(group.z + group.depth / 2);
                                    gridSizesXArray.push(gridWidthX);
                                    gridSizesYArray.push(gridWidthY);
                                    gridSizesZArray.push(group.depth);
                                }
                                break;
                            case 4:
                                labelPositionX = group.x + scaledLabelValue;
                                labelPositionY = group.y;
                                labelPositionZ = group.z + group.depth;
                                if (this.grid || this.gridY) {
                                    grid = true;
                                    gridPositionsXArray.push(group.x + scaledGridValue);
                                    gridPositionsYArray.push(group.y + group.height / 2);
                                    gridPositionsZArray.push(group.z + group.depth);
                                    gridSizesXArray.push(gridWidthX);
                                    gridSizesYArray.push(group.height);
                                    gridSizesZArray.push(gridWidthZ);
                                }
                                else if (this.gridZ) {
                                    grid = true;
                                    gridPositionsXArray.push(group.x + scaledGridValue);
                                    gridPositionsYArray.push(group.y);
                                    gridPositionsZArray.push(group.z + group.depth / 2);
                                    gridSizesXArray.push(gridWidthX);
                                    gridSizesYArray.push(gridWidthY);
                                    gridSizesZArray.push(group.depth);
                                }
                                break;
                            case 6:
                                labelPositionX = group.x + scaledLabelValue;
                                labelPositionY = group.y;
                                labelPositionZ = group.z;
                                if (this.grid || this.gridY) {
                                    grid = true;
                                    gridPositionsXArray.push(group.x + scaledGridValue);
                                    gridPositionsYArray.push(group.y + group.height / 2);
                                    gridPositionsZArray.push(group.z);
                                    gridSizesXArray.push(gridWidthX);
                                    gridSizesYArray.push(group.height);
                                    gridSizesZArray.push(gridWidthZ);
                                }
                                else if (this.gridZ) {
                                    grid = true;
                                    gridPositionsXArray.push(group.x + scaledGridValue);
                                    gridPositionsYArray.push(group.y);
                                    gridPositionsZArray.push(group.z + group.depth / 2);
                                    gridSizesXArray.push(gridWidthX);
                                    gridSizesYArray.push(gridWidthY);
                                    gridSizesZArray.push(group.depth);
                                }
                                break;
                            // y
                            case 8:
                                labelPositionX = group.x + group.width;
                                labelPositionY = group.y + scaledLabelValue;
                                labelPositionZ = group.z + group.depth;
                                if (this.grid || this.gridX) {
                                    grid = true;
                                    gridPositionsXArray.push(group.x + group.width / 2);
                                    gridPositionsYArray.push(group.y + scaledGridValue);
                                    gridPositionsZArray.push(group.z + group.depth);
                                    gridSizesXArray.push(group.width);
                                    gridSizesYArray.push(gridWidthY);
                                    gridSizesZArray.push(gridWidthZ);
                                }
                                else if (this.gridZ) {
                                    grid = true;
                                    gridPositionsXArray.push(group.x + group.width);
                                    gridPositionsYArray.push(group.y + scaledGridValue);
                                    gridPositionsZArray.push(group.z + group.depth / 2);
                                    gridSizesXArray.push(gridWidthX);
                                    gridSizesYArray.push(gridWidthY);
                                    gridSizesZArray.push(group.depth);
                                }
                                break;
                            case 9:
                                labelPositionX = group.x + group.width;
                                labelPositionY = group.y + scaledLabelValue;
                                labelPositionZ = group.z;
                                if (this.grid || this.gridX) {
                                    grid = true;
                                    gridPositionsXArray.push(group.x + group.width / 2);
                                    gridPositionsYArray.push(group.y + scaledGridValue);
                                    gridPositionsZArray.push(group.z);
                                    gridSizesXArray.push(group.width);
                                    gridSizesYArray.push(gridWidthY);
                                    gridSizesZArray.push(gridWidthZ);
                                }
                                else if (this.gridZ) {
                                    grid = true;
                                    gridPositionsXArray.push(group.x + group.width);
                                    gridPositionsYArray.push(group.y + scaledGridValue);
                                    gridPositionsZArray.push(group.z + group.depth / 2);
                                    gridSizesXArray.push(gridWidthX);
                                    gridSizesYArray.push(gridWidthY);
                                    gridSizesZArray.push(group.depth);
                                }
                                break;
                            case 10:
                                labelPositionX = group.x;
                                labelPositionY = group.y + scaledLabelValue;
                                labelPositionZ = group.z;
                                if (this.grid || this.gridX) {
                                    grid = true;
                                    gridPositionsXArray.push(group.x + group.width / 2);
                                    gridPositionsYArray.push(group.y + scaledGridValue);
                                    gridPositionsZArray.push(group.z);
                                    gridSizesXArray.push(group.width);
                                    gridSizesYArray.push(gridWidthY);
                                    gridSizesZArray.push(gridWidthZ);
                                }
                                else if (this.gridZ) {
                                    grid = true;
                                    gridPositionsXArray.push(group.x);
                                    gridPositionsYArray.push(group.y + scaledGridValue);
                                    gridPositionsZArray.push(group.z + group.depth / 2);
                                    gridSizesXArray.push(gridWidthX);
                                    gridSizesYArray.push(gridWidthY);
                                    gridSizesZArray.push(group.depth);
                                }
                                break;
                            case 11:
                                labelPositionX = group.x;
                                labelPositionY = group.y + scaledLabelValue;
                                labelPositionZ = group.z + group.depth;
                                if (this.grid || this.gridX) {
                                    grid = true;
                                    gridPositionsXArray.push(group.x + group.width / 2);
                                    gridPositionsYArray.push(group.y + scaledGridValue);
                                    gridPositionsZArray.push(group.z + group.depth);
                                    gridSizesXArray.push(group.width);
                                    gridSizesYArray.push(gridWidthY);
                                    gridSizesZArray.push(gridWidthZ);
                                }
                                else if (this.gridZ) {
                                    grid = true;
                                    gridPositionsXArray.push(group.x);
                                    gridPositionsYArray.push(group.y + scaledGridValue);
                                    gridPositionsZArray.push(group.z + group.depth / 2);
                                    gridSizesXArray.push(gridWidthX);
                                    gridSizesYArray.push(gridWidthY);
                                    gridSizesZArray.push(group.depth);
                                }
                                break;
                            // z
                            case 1:
                                labelPositionX = group.x + group.width;
                                labelPositionY = group.y + group.height;
                                labelPositionZ = group.z + scaledLabelValue;
                                if (this.grid || this.gridX) {
                                    grid = true;
                                    gridPositionsXArray.push(group.x + group.width / 2);
                                    gridPositionsYArray.push(group.y + group.height);
                                    gridPositionsZArray.push(group.z + scaledGridValue);
                                    gridSizesXArray.push(group.width);
                                    gridSizesYArray.push(gridWidthY);
                                    gridSizesZArray.push(gridWidthZ);
                                }
                                else if (this.gridY) {
                                    grid = true;
                                    gridPositionsXArray.push(group.x + group.width);
                                    gridPositionsYArray.push(group.y + group.height / 2);
                                    gridPositionsZArray.push(group.z + scaledGridValue);
                                    gridSizesXArray.push(gridWidthX);
                                    gridSizesYArray.push(group.height);
                                    gridSizesZArray.push(gridWidthZ);
                                }
                                break;
                            case 3:
                                labelPositionX = group.x;
                                labelPositionY = group.y + group.height;
                                labelPositionZ = group.z + scaledLabelValue;
                                if (this.grid || this.gridX) {
                                    grid = true;
                                    gridPositionsXArray.push(group.x + group.width / 2);
                                    gridPositionsYArray.push(group.y + group.height);
                                    gridPositionsZArray.push(group.z + scaledGridValue);
                                    gridSizesXArray.push(group.width);
                                    gridSizesYArray.push(gridWidthY);
                                    gridSizesZArray.push(gridWidthZ);
                                }
                                else if (this.gridY) {
                                    grid = true;
                                    gridPositionsXArray.push(group.x);
                                    gridPositionsYArray.push(group.y + group.height / 2);
                                    gridPositionsZArray.push(group.z + scaledGridValue);
                                    gridSizesXArray.push(gridWidthX);
                                    gridSizesYArray.push(group.height);
                                    gridSizesZArray.push(gridWidthZ);
                                }
                                break;
                            case 5:
                                labelPositionX = group.x + group.width;
                                labelPositionY = group.y;
                                labelPositionZ = group.z + scaledLabelValue;
                                if (this.grid || this.gridX) {
                                    grid = true;
                                    gridPositionsXArray.push(group.x + group.width / 2);
                                    gridPositionsYArray.push(group.y);
                                    gridPositionsZArray.push(group.z + scaledGridValue);
                                    gridSizesXArray.push(group.width);
                                    gridSizesYArray.push(gridWidthY);
                                    gridSizesZArray.push(gridWidthZ);
                                }
                                else if (this.gridY) {
                                    grid = true;
                                    gridPositionsXArray.push(group.x + group.width);
                                    gridPositionsYArray.push(group.y + group.height / 2);
                                    gridPositionsZArray.push(group.z + scaledGridValue);
                                    gridSizesXArray.push(gridWidthX);
                                    gridSizesYArray.push(group.height);
                                    gridSizesZArray.push(gridWidthZ);
                                }
                                break;
                            case 7:
                                labelPositionX = group.x;
                                labelPositionY = group.y;
                                labelPositionZ = group.z + scaledLabelValue;
                                if (this.grid || this.gridX) {
                                    grid = true;
                                    gridPositionsXArray.push(group.x + group.width / 2);
                                    gridPositionsYArray.push(group.y);
                                    gridPositionsZArray.push(group.z + scaledGridValue);
                                    gridSizesXArray.push(group.width);
                                    gridSizesYArray.push(gridWidthY);
                                    gridSizesZArray.push(gridWidthZ);
                                }
                                else if (this.gridY) {
                                    grid = true;
                                    gridPositionsXArray.push(group.x);
                                    gridPositionsYArray.push(group.y + group.height / 2);
                                    gridPositionsZArray.push(group.z + scaledGridValue);
                                    gridSizesXArray.push(gridWidthX);
                                    gridSizesYArray.push(group.height);
                                    gridSizesZArray.push(gridWidthZ);
                                }
                                break;
                        }
                        if (grid) {
                            gridColorsArray.push(gridColor);
                        }

                        // Offsets
                        labelPositionX += labelOffsetX;
                        labelPositionY += labelOffsetY;
                        labelPositionZ += labelOffsetZ;

                        // Arrays
                        if (labels) {
                            if (dataset) {
                                const columnIndex = dataset.getColumnIndex(scale.domain.field);
                                label = distinctStrings[i];
                                if (labelFormat) {
                                    const columType = dataset.getColumnType(columnIndex);
                                    switch (columType) {
                                        case Core.Data.ColumnType.float:
                                            label = labelFormat.format(parseFloat(label));
                                            break;
                                        case Core.Data.ColumnType.integer:
                                        case Core.Data.ColumnType.date:
                                            label = labelFormat.format(parseInt(label));
                                            break;
                                    }
                                }
                            }
                            else {
                                label = i.toString(); // Formatting?
                            }
                            glyphCount += label.length;
                            labelsArray.push([label]);
                            labelPositionsXArray.push(labelPositionX);
                            labelPositionsYArray.push(labelPositionY);
                            labelPositionsZArray.push(labelPositionZ);
                            labelFontsArray.push(labelFont);
                            labelScalesArray.push(labelFontSize * scaling);
                            labelWeightsArray.push(labelFontWeight);
                            labelRotationsArray.push(labelRotation[0]);
                            labelRotationsArray.push(labelRotation[1]);
                            labelRotationsArray.push(labelRotation[2]);
                            labelRotationsArray.push(labelRotation[3]);
                            labelHorizontalAlignmentsArray.push(horizontalAlignment);
                            labelVerticalAlignmentsArray.push(verticalALignment);
                            labelFillArray.push(labelFill);
                            labelStrokeArray.push(labelStroke);
                            labelStrokeWidthArray.push(labelStrokeWidth * scaling);
                        }
                    }
                }
                break;
            case "linear":
                tickCount = this.tickCount == undefined ? 1 : this.tickCount;
                if (tickCount > 0) {
                    for (let i = 0; i <= tickCount; i++) {
                        const baseValue = min + i * (max - min) / tickCount;
                        const scaledValue = scale.map(baseValue);
                        let grid = false;
                        switch (this.edgeId) {
                            // x
                            case 0:
                                labelPositionX = group.x + scaledValue;
                                labelPositionY = group.y + group.height;
                                labelPositionZ = group.z + group.depth;
                                if (this.grid || this.gridY) {
                                    grid = true;
                                    gridPositionsXArray.push(group.x + scaledValue);
                                    gridPositionsYArray.push(group.y + group.height / 2);
                                    gridPositionsZArray.push(group.z + group.depth);
                                    gridSizesXArray.push(gridWidthX);
                                    gridSizesYArray.push(group.height);
                                    gridSizesZArray.push(gridWidthZ);
                                }
                                else if (this.gridZ) {
                                    grid = true;
                                    gridPositionsXArray.push(group.x + scaledValue);
                                    gridPositionsYArray.push(group.y + group.height);
                                    gridPositionsZArray.push(group.z + group.depth / 2);
                                    gridSizesXArray.push(gridWidthX);
                                    gridSizesYArray.push(gridWidthY);
                                    gridSizesZArray.push(group.depth);
                                }
                                break;
                            case 2:
                                labelPositionX = group.x + scaledValue;
                                labelPositionY = group.y + group.height;
                                labelPositionZ = group.z;
                                if (this.grid || this.gridY) {
                                    grid = true;
                                    gridPositionsXArray.push(group.x + scaledValue);
                                    gridPositionsYArray.push(group.y + group.height / 2);
                                    gridPositionsZArray.push(group.z);
                                    gridSizesXArray.push(gridWidthX);
                                    gridSizesYArray.push(group.height);
                                    gridSizesZArray.push(gridWidthZ);
                                }
                                else if (this.gridZ) {
                                    grid = true;
                                    gridPositionsXArray.push(group.x + scaledValue);
                                    gridPositionsYArray.push(group.y + group.height);
                                    gridPositionsZArray.push(group.z + group.depth / 2);
                                    gridSizesXArray.push(gridWidthX);
                                    gridSizesYArray.push(gridWidthY);
                                    gridSizesZArray.push(group.depth);
                                }
                                break;
                            case 4:
                                labelPositionX = group.x + scaledValue;
                                labelPositionY = group.y;
                                labelPositionZ = group.z + group.depth;
                                if (this.grid || this.gridY) {
                                    grid = true;
                                    gridPositionsXArray.push(group.x + scaledValue);
                                    gridPositionsYArray.push(group.y + group.height / 2);
                                    gridPositionsZArray.push(group.z + group.depth);
                                    gridSizesXArray.push(gridWidthX);
                                    gridSizesYArray.push(group.height);
                                    gridSizesZArray.push(gridWidthZ);
                                }
                                else if (this.gridZ) {
                                    grid = true;
                                    gridPositionsXArray.push(group.x + scaledValue);
                                    gridPositionsYArray.push(group.y);
                                    gridPositionsZArray.push(group.z + group.depth / 2);
                                    gridSizesXArray.push(gridWidthX);
                                    gridSizesYArray.push(gridWidthY);
                                    gridSizesZArray.push(group.depth);
                                }
                                break;
                            case 6:
                                labelPositionX = group.x + scaledValue;
                                labelPositionY = group.y;
                                labelPositionZ = group.z;
                                if (this.grid || this.gridY) {
                                    grid = true;
                                    gridPositionsXArray.push(group.x + scaledValue);
                                    gridPositionsYArray.push(group.y + group.height / 2);
                                    gridPositionsZArray.push(group.z);
                                    gridSizesXArray.push(gridWidthX);
                                    gridSizesYArray.push(group.height);
                                    gridSizesZArray.push(gridWidthZ);
                                }
                                else if (this.gridZ) {
                                    grid = true;
                                    gridPositionsXArray.push(group.x + scaledValue);
                                    gridPositionsYArray.push(group.y);
                                    gridPositionsZArray.push(group.z + group.depth / 2);
                                    gridSizesXArray.push(gridWidthX);
                                    gridSizesYArray.push(gridWidthY);
                                    gridSizesZArray.push(group.depth);
                                }
                                break;
                            // y
                            case 8:
                                labelPositionX = group.x + group.width;
                                labelPositionY = group.y + scaledValue;
                                labelPositionZ = group.z + group.depth;
                                if (this.grid || this.gridX) {
                                    grid = true;
                                    gridPositionsXArray.push(group.x + group.width / 2);
                                    gridPositionsYArray.push(group.y + scaledValue);
                                    gridPositionsZArray.push(group.z + group.depth);
                                    gridSizesXArray.push(group.width);
                                    gridSizesYArray.push(gridWidthY);
                                    gridSizesZArray.push(gridWidthZ);
                                }
                                else if (this.gridZ) {
                                    grid = true;
                                    gridPositionsXArray.push(group.x + group.width);
                                    gridPositionsYArray.push(group.y + scaledValue);
                                    gridPositionsZArray.push(group.z + group.depth / 2);
                                    gridSizesXArray.push(gridWidthX);
                                    gridSizesYArray.push(gridWidthY);
                                    gridSizesZArray.push(group.depth);
                                }
                                break;
                            case 9:
                                labelPositionX = group.x + group.width;
                                labelPositionY = group.y + scaledValue;
                                labelPositionZ = group.z;
                                if (this.grid || this.gridX) {
                                    grid = true;
                                    gridPositionsXArray.push(group.x + group.width / 2);
                                    gridPositionsYArray.push(group.y + scaledValue);
                                    gridPositionsZArray.push(group.z);
                                    gridSizesXArray.push(group.width);
                                    gridSizesYArray.push(gridWidthY);
                                    gridSizesZArray.push(gridWidthZ);
                                }
                                else if (this.gridZ) {
                                    grid = true;
                                    gridPositionsXArray.push(group.x + group.width);
                                    gridPositionsYArray.push(group.y + scaledValue);
                                    gridPositionsZArray.push(group.z + group.depth / 2);
                                    gridSizesXArray.push(gridWidthX);
                                    gridSizesYArray.push(gridWidthY);
                                    gridSizesZArray.push(group.depth);
                                }
                                break;
                            case 10:
                                labelPositionX = group.x;
                                labelPositionY = group.y + scaledValue;
                                labelPositionZ = group.z;
                                if (this.grid || this.gridX) {
                                    grid = true;
                                    gridPositionsXArray.push(group.x + group.width / 2);
                                    gridPositionsYArray.push(group.y + scaledValue);
                                    gridPositionsZArray.push(group.z);
                                    gridSizesXArray.push(group.width);
                                    gridSizesYArray.push(gridWidthY);
                                    gridSizesZArray.push(gridWidthZ);
                                }
                                else if (this.gridZ) {
                                    grid = true;
                                    gridPositionsXArray.push(group.x);
                                    gridPositionsYArray.push(group.y + scaledValue);
                                    gridPositionsZArray.push(group.z + group.depth / 2);
                                    gridSizesXArray.push(gridWidthX);
                                    gridSizesYArray.push(gridWidthY);
                                    gridSizesZArray.push(group.depth);
                                }
                                break;
                            case 11:
                                labelPositionX = group.x;
                                labelPositionY = group.y + scaledValue;
                                labelPositionZ = group.z + group.depth;
                                if (this.grid || this.gridX) {
                                    grid = true;
                                    gridPositionsXArray.push(group.x + group.width / 2);
                                    gridPositionsYArray.push(group.y + scaledValue);
                                    gridPositionsZArray.push(group.z + group.depth);
                                    gridSizesXArray.push(group.width);
                                    gridSizesYArray.push(gridWidthY);
                                    gridSizesZArray.push(gridWidthZ);
                                }
                                else if (this.gridZ) {
                                    grid = true;
                                    gridPositionsXArray.push(group.x);
                                    gridPositionsYArray.push(group.y + scaledValue);
                                    gridPositionsZArray.push(group.z + group.depth / 2);
                                    gridSizesXArray.push(gridWidthX);
                                    gridSizesYArray.push(gridWidthY);
                                    gridSizesZArray.push(group.depth);
                                }
                                break;
                            // z
                            case 1:
                                labelPositionX = group.x + group.width;
                                labelPositionY = group.y + group.height;
                                labelPositionZ = group.z + scaledValue;
                                if (this.grid || this.gridX) {
                                    grid = true;
                                    gridPositionsXArray.push(group.x + group.width / 2);
                                    gridPositionsYArray.push(group.y + group.height);
                                    gridPositionsZArray.push(group.z + scaledValue);
                                    gridSizesXArray.push(group.width);
                                    gridSizesYArray.push(gridWidthY);
                                    gridSizesZArray.push(gridWidthZ);
                                }
                                else if (this.gridY) {
                                    grid = true;
                                    gridPositionsXArray.push(group.x + group.width);
                                    gridPositionsYArray.push(group.y + group.height / 2);
                                    gridPositionsZArray.push(group.z + scaledValue);
                                    gridSizesXArray.push(gridWidthX);
                                    gridSizesYArray.push(group.height);
                                    gridSizesZArray.push(gridWidthZ);
                                }
                                break;
                            case 3:
                                labelPositionX = group.x;
                                labelPositionY = group.y + group.height;
                                labelPositionZ = group.z + scaledValue;
                                if (this.grid || this.gridX) {
                                    grid = true;
                                    gridPositionsXArray.push(group.x + group.width / 2);
                                    gridPositionsYArray.push(group.y + group.height);
                                    gridPositionsZArray.push(group.z + scaledValue);
                                    gridSizesXArray.push(group.width);
                                    gridSizesYArray.push(gridWidthY);
                                    gridSizesZArray.push(gridWidthZ);
                                }
                                else if (this.gridY) {
                                    grid = true;
                                    gridPositionsXArray.push(group.x);
                                    gridPositionsYArray.push(group.y + group.height / 2);
                                    gridPositionsZArray.push(group.z + scaledValue);
                                    gridSizesXArray.push(gridWidthX);
                                    gridSizesYArray.push(group.height);
                                    gridSizesZArray.push(gridWidthZ);
                                }
                                break;
                            case 5:
                                labelPositionX = group.x + group.width;
                                labelPositionY = group.y;
                                labelPositionZ = group.z + scaledValue;
                                if (this.grid || this.gridX) {
                                    grid = true;
                                    gridPositionsXArray.push(group.x + group.width / 2);
                                    gridPositionsYArray.push(group.y);
                                    gridPositionsZArray.push(group.z + scaledValue);
                                    gridSizesXArray.push(group.width);
                                    gridSizesYArray.push(gridWidthY);
                                    gridSizesZArray.push(gridWidthZ);
                                }
                                else if (this.gridY) {
                                    grid = true;
                                    gridPositionsXArray.push(group.x + group.width);
                                    gridPositionsYArray.push(group.y + group.height / 2);
                                    gridPositionsZArray.push(group.z + scaledValue);
                                    gridSizesXArray.push(gridWidthX);
                                    gridSizesYArray.push(group.height);
                                    gridSizesZArray.push(gridWidthZ);
                                }
                                break;
                            case 7:
                                labelPositionX = group.x;
                                labelPositionY = group.y;
                                labelPositionZ = group.z + scaledValue;
                                if (this.grid || this.gridX) {
                                    grid = true;
                                    gridPositionsXArray.push(group.x + group.width / 2);
                                    gridPositionsYArray.push(group.y);
                                    gridPositionsZArray.push(group.z + scaledValue);
                                    gridSizesXArray.push(group.width);
                                    gridSizesYArray.push(gridWidthY);
                                    gridSizesZArray.push(gridWidthZ);
                                }
                                else if (this.gridY) {
                                    grid = true;
                                    gridPositionsXArray.push(group.x);
                                    gridPositionsYArray.push(group.y + group.height / 2);
                                    gridPositionsZArray.push(group.z + scaledValue);
                                    gridSizesXArray.push(gridWidthX);
                                    gridSizesYArray.push(group.height);
                                    gridSizesZArray.push(gridWidthZ);
                                }
                                break;
                        }
                        if (grid) {
                            gridColorsArray.push(gridColor);
                        }

                        // Offsets
                        labelPositionX += labelOffsetX;
                        labelPositionY += labelOffsetY;
                        labelPositionZ += labelOffsetZ;

                        // Arrays
                        if (labels) {
                            // label = (min + i * (max - min) / tickCount).toString();
                            if (labelFormat) { label = labelFormat.format((min + i * (max - min) / tickCount)); }
                            else { label = (min + i * (max - min) / tickCount).toString(); }
                            glyphCount += label.length;
                            labelsArray.push([label]);
                            labelPositionsXArray.push(labelPositionX);
                            labelPositionsYArray.push(labelPositionY);
                            labelPositionsZArray.push(labelPositionZ);
                            labelFontsArray.push(labelFont);
                            labelScalesArray.push(labelFontSize * scaling);
                            labelWeightsArray.push(labelFontWeight);
                            labelRotationsArray.push(labelRotation[0]);
                            labelRotationsArray.push(labelRotation[1]);
                            labelRotationsArray.push(labelRotation[2]);
                            labelRotationsArray.push(labelRotation[3]);
                            labelHorizontalAlignmentsArray.push(horizontalAlignment);
                            labelVerticalAlignmentsArray.push(verticalALignment);
                            labelFillArray.push(labelFill);
                            labelStrokeArray.push(labelStroke);
                            labelStrokeWidthArray.push(labelStrokeWidth * scaling);
                        }
                    }
                }
                break;
            case "log":
                break;
            case "time":
                break;
            default:
                console.log(`Unknown scale type ${scale.type} `);
                break;
        }

        // Title
        label = this.title;
        if (label) {
            // Title color
            if (this.titleFill) {
                // Check if value is a valid color name
                labelFill = Core.Colors[this.titleFill.toLowerCase()];
            }
            if (!labelFill) { labelFill = Plot.TEXT_COLOR; }
            if (this.titleStroke) {
                // Check if value is a valid color name
                labelStroke = Core.Colors[this.titleStroke.toLowerCase()];
            }
            if (!labelStroke) { labelStroke = Plot.TEXT_STROKE_COLOR; }
            labelStrokeWidth = this.titleStrokeWidth || 0;

            // Title font
            labelFontSize = this.titleFontSize || Plot.FONT_SIZE;
            labelFontWeight = this.titleFontWeight || Plot.FONT_WEIGHT;

            // Title rotation
            labelAngleX = -this.titleAngleX;
            labelAngleY = -this.titleAngleY;
            labelAngleZ = -this.titleAngleZ;
            labelRotation = this.titleRotation || [0, 0, 0, 1];
            if (labelAngleX) { Core.quaternion.rotateX(labelRotation, Core.Constants.RADIANS_PER_DEGREE * labelAngleX, labelRotation); }
            if (labelAngleY) { Core.quaternion.rotateY(labelRotation, Core.Constants.RADIANS_PER_DEGREE * labelAngleY, labelRotation); }
            if (labelAngleZ) { Core.quaternion.rotateZ(labelRotation, Core.Constants.RADIANS_PER_DEGREE * labelAngleZ, labelRotation); }

            // Title offsets
            labelOffsetX = this.titleOffsetX || 0;
            labelOffsetY = this.titleOffsetY || 0;
            labelOffsetZ = this.titleOffsetZ || 0;

            // Alignment
            labelAlign = this.titleAlign;
            labelBaseline = this.titleBaseline;
            switch (labelAlign) {
                case "left":
                    horizontalAlignment = "left";
                    break;
                case "center":
                default:
                    horizontalAlignment = "center";
                    break;
                case "right":
                    horizontalAlignment = "right";
                    break;
            }
            switch (labelBaseline) {
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

            // Title position
            // TODO: TitleAnchor
            const midRange = (scale.range.min + scale.range.max) / 2;
            switch (this.edgeId) {
                // x
                case 0:
                    labelPositionX = group.x + midRange;
                    labelPositionY = group.y + group.height;
                    labelPositionZ = group.z + group.depth;
                    break;
                case 2:
                    labelPositionX = group.x + midRange;
                    labelPositionY = group.y + group.height;
                    labelPositionZ = group.z;
                    break;
                case 4:
                    labelPositionX = group.x + midRange;
                    labelPositionY = group.y;
                    labelPositionZ = group.z + group.depth;
                    break;
                case 6:
                    labelPositionX = group.x + midRange;
                    labelPositionY = group.y;
                    labelPositionZ = group.z;
                    break;
                // y
                case 8:
                    labelPositionX = group.x + group.width;
                    labelPositionY = group.y + midRange;
                    labelPositionZ = group.z + group.depth;
                    break;
                case 9:
                    labelPositionX = group.x + group.width;
                    labelPositionY = group.y + midRange;
                    labelPositionZ = group.z;
                    break;
                case 10:
                    labelPositionX = group.x;
                    labelPositionY = group.y + midRange;
                    labelPositionZ = group.z;
                    break;
                case 11:
                    labelPositionX = group.x;
                    labelPositionY = group.y + midRange;
                    labelPositionZ = group.z + group.depth;
                    break;
                // z
                case 1:
                    labelPositionX = group.x + group.width;
                    labelPositionY = group.y + group.height;
                    labelPositionZ = group.z + midRange;
                    break;
                case 3:
                    labelPositionX = group.x;
                    labelPositionY = group.y + group.height;
                    labelPositionZ = group.z + midRange;
                    break;
                case 5:
                    labelPositionX = group.x + group.width;
                    labelPositionY = group.y;
                    labelPositionZ = group.z + midRange;
                    break;
                case 7:
                    labelPositionX = group.x;
                    labelPositionY = group.y;
                    labelPositionZ = group.z + midRange;
                    break;
            }
            labelPositionX += labelOffsetX;
            labelPositionY += labelOffsetY;
            labelPositionZ += labelOffsetZ;
            glyphCount += label.length;
            labelsArray.push([label]);
            labelPositionsXArray.push(labelPositionX);
            labelPositionsYArray.push(labelPositionY);
            labelPositionsZArray.push(labelPositionZ);
            labelFontsArray.push(labelFont);
            labelScalesArray.push(labelFontSize * scaling);
            labelWeightsArray.push(labelFontWeight);
            labelRotationsArray.push(labelRotation[0]);
            labelRotationsArray.push(labelRotation[1]);
            labelRotationsArray.push(labelRotation[2]);
            labelRotationsArray.push(labelRotation[3]);
            labelHorizontalAlignmentsArray.push(horizontalAlignment);
            labelVerticalAlignmentsArray.push(verticalALignment);
            labelFillArray.push(labelFill);
            labelStrokeArray.push(labelStroke);
            labelStrokeWidthArray.push(labelStrokeWidth * scaling);
        }

        // Create label set
        if (labelsArray.length > 0) {
            const labelSetOptions: Core.ILabelSetOptions = {
                // Bounds
                minBoundsX: 0,
                maxBoundsX: scaling * plot.width,
                minBoundsY: 0,
                maxBoundsY: scaling * plot.height,
                minBoundsZ: 0,
                maxBoundsZ: scaling * plot.depth,
                maxGlyphs: glyphCount,
                labels: labelsArray,

                // Scale
                sizes: labelScalesArray,
                strokeWidths: labelStrokeWidthArray,

                // Font
                // TODO: font styles
                fonts: labelFontsArray,
                fontWeights: labelWeightsArray,

                // Rotation
                rotations: labelRotationsArray,

                // Alignment
                horizontalAlignments: labelHorizontalAlignmentsArray,
                verticalAlignments: labelVerticalAlignmentsArray,

                // Positions
                positionsX: labelPositionsXArray,
                positionsY: labelPositionsYArray,
                positionsZ: labelPositionsZArray,

                // Scaling
                positionScalingX: scaling,
                positionScalingY: scaling,
                positionScalingZ: scaling,
            };
            const materials: Core.Material[] = new Array(labelsArray.length);
            for (let i = 0; i < labelsArray.length; i++) {
                materials[i] = new Core.Material();
                materials[i].type = Core.MaterialType.diffuse;
                materials[i].fill = labelFillArray[i];
                materials[i].stroke = labelStrokeArray[i];
            }
            labelSetOptions.materials = materials;
            const labelSet = new Core.LabelSet(labelSetOptions)
            scene.labels.push(labelSet);
        }

        // Create transition buffer for gridlines
        if (gridPositionsXArray.length > 0) {
            // Ids
            const ids = new Uint32Array(gridPositionsXArray.length);
            for (let i = 0; i < gridPositionsXArray.length; i++) { ids[i] = i; }

            // Buffer
            const bufferOptions: Core.IBufferOptions = {
                ids: ids,
                isInteractive: false,
            }
            const buffer = new Core.Buffer(bufferOptions);

            // Unit type
            buffer.unitType = "box";

            // Layout
            const scatter = new Core.Layouts.Scatter();
            let scatterLayoutOptions: Core.Layouts.IScatterLayoutOptions = {
                positionsX: gridPositionsXArray,
                positionsY: gridPositionsYArray,
                positionsZ: gridPositionsZArray,
                positionScalingX: scaling,
                positionScalingY: scaling,
                positionScalingZ: scaling,
                sizesX: gridSizesXArray,
                sizesY: gridSizesYArray,
                sizesZ: gridSizesZArray,
                sizeScaling: scaling,
            };
            scatter.layout(buffer, ids, scatterLayoutOptions);

            // Update
            let vertexOptions: Core.Layouts.IScatterVertexOptions = {
                minBoundsX: 0,
                maxBoundsX: scaling * plot.width,
                minBoundsY: 0,
                maxBoundsY: scaling * plot.height,
                minBoundsZ: 0,
                maxBoundsZ: scaling * plot.depth,
            };
            // Materials
            const materials: Core.Material[] = new Array(gridColorsArray.length);
            for (let i = 0; i < gridColorsArray.length; i++) {
                materials[i] = new Core.Material();
                materials[i].type = Core.MaterialType.diffuse;
                materials[i].fill = gridColorsArray[i];
            }
            vertexOptions.materials = materials;
            scatter.update(buffer, ids, vertexOptions);

            // Add to scene
            scene.buffers.push(buffer);
        }
    }
}