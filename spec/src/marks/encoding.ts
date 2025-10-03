// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import * as Core from "core";
import { Color } from "../color.js";
import { Scale } from "../scales/scale.js";
import { Group } from "./group.js";
import { Signal } from "../signal.js";
import { Expression } from "../expression.js";
import { Mark } from "./mark.js";
import { Dataset } from "../dataset.js";

export class TexCoord {
    public x: MarkEncodingValue;
    public y: MarkEncodingValue;
    public x2: MarkEncodingValue;
    public y2: MarkEncodingValue;
}
export class UVCoord {
    public x: MarkEncodingValue;
    public y: MarkEncodingValue;
    public z: MarkEncodingValue;
    public w: MarkEncodingValue;
}

export class MarkEncodingValue {
    public scale: Scale;
    public field: string; // TODO: FieldValue
    public band: number | MarkEncodingValue;
    public color: Color;
    public value: any; // TODO: Type
    public mult: number | MarkEncodingValue;
    public offset: number | MarkEncodingValue;
    public round: boolean; // Round to nearest integer
    public signal: Signal;
    public image: string;
    public checker: any; // TODO: Type
    public texCoords: TexCoord;
    public texOffset: UVCoord;
    public texScale: UVCoord;

    public static fromJSON(mark: Mark, group: Group, json: any): MarkEncodingValue {
        const markEncodingValue = new MarkEncodingValue();
        markEncodingValue.field = json.field;
        markEncodingValue.value = json.value;

        // Scale
        if (json.scale) { markEncodingValue.scale = group.getScale(json.scale); }

        // Band
        if (json.band != undefined) {
            if (!isNaN(json.band)) { markEncodingValue.band = json.band; }
            else { markEncodingValue.band = MarkEncodingValue.fromJSON(mark, group, json.band); }
        }

        // Mult
        if (json.mult != undefined) {
            if (!isNaN(json.mult)) { markEncodingValue.mult = json.mult; }
            else { markEncodingValue.mult = MarkEncodingValue.fromJSON(mark, group, json.mult); }
        }

        // Offset
        if (json.offset != undefined) {
            if (!isNaN(json.offset)) { markEncodingValue.offset = json.offset; }
            else { markEncodingValue.offset = MarkEncodingValue.fromJSON(mark, group, json.offset); }
        }

        // Round
        if (json.round != undefined) {
            if (typeof json.round == "boolean") { markEncodingValue.round = json.round; }
        }

        // Signal
        if (json.signal) {
            const signalJSON = json.signal;
            let signal = group.getSignal(signalJSON);
            if (!signal) {
                // No signal found, try creating inline
                const expr = signalJSON;
                signal = new Signal();
                // Dataset
                let dataset: Dataset;
                if (mark.from && mark.from.data) { dataset = group.getDataset(mark.from.data); }
                signal.update = new Expression().parseExpression(expr, group, dataset);
            }
            markEncodingValue.signal = signal;
        }

        // Color
        if (json.color) {
            markEncodingValue.color = new Color();
            // RGB
            if (json.color.r) { markEncodingValue.color.r = MarkEncodingValue.fromJSON(mark, group, json.color.r); }
            if (json.color.g) { markEncodingValue.color.g = MarkEncodingValue.fromJSON(mark, group, json.color.g); }
            if (json.color.b) { markEncodingValue.color.b = MarkEncodingValue.fromJSON(mark, group, json.color.b); }
            // HSL
            if (json.color.h) { markEncodingValue.color.h = MarkEncodingValue.fromJSON(mark, group, json.color.h); }
            if (json.color.s) { markEncodingValue.color.s = MarkEncodingValue.fromJSON(mark, group, json.color.s); }
            if (json.color.l) { markEncodingValue.color.l = MarkEncodingValue.fromJSON(mark, group, json.color.l); }
        }

        // Image
        if (json.image && typeof json.image == "string") {
            markEncodingValue.image = json.image;
        }
        else if (json.checker) {
            // Color1, Color2
            markEncodingValue.checker = {};
            if (json.checker.color1) { markEncodingValue.checker.color1 = MarkEncodingValue.fromJSON(mark, group, json.checker.color1); }
            if (json.checker.color2) { markEncodingValue.checker.color2 = MarkEncodingValue.fromJSON(mark, group, json.checker.color2); }
        }

        // Texture coordinates
        if (json.texCoords) {
            markEncodingValue.texCoords = new TexCoord();
            if (json.texCoords.x) { markEncodingValue.texCoords.x = MarkEncodingValue.fromJSON(mark, group, json.texCoords.x); }
            if (json.texCoords.y) { markEncodingValue.texCoords.y = MarkEncodingValue.fromJSON(mark, group, json.texCoords.y); }
            if (json.texCoords.x2) { markEncodingValue.texCoords.x2 = MarkEncodingValue.fromJSON(mark, group, json.texCoords.x2); }
            if (json.texCoords.y2) { markEncodingValue.texCoords.y2 = MarkEncodingValue.fromJSON(mark, group, json.texCoords.y2); }
        }

        // Texture offset
        if (json.texOffset) {
            markEncodingValue.texOffset = new UVCoord();
            if (json.texOffset.x) { markEncodingValue.texOffset.x = MarkEncodingValue.fromJSON(mark, group, json.texOffset.x); }
            if (json.texOffset.y) { markEncodingValue.texOffset.y = MarkEncodingValue.fromJSON(mark, group, json.texOffset.y); }
            if (json.texOffset.z) { markEncodingValue.texOffset.z = MarkEncodingValue.fromJSON(mark, group, json.texOffset.z); }
            if (json.texOffset.w) { markEncodingValue.texOffset.w = MarkEncodingValue.fromJSON(mark, group, json.texOffset.w); }
        }

        // Texture scale
        if (json.texScale) {
            markEncodingValue.texScale = new UVCoord();
            if (json.texScale.x) { markEncodingValue.texScale.x = MarkEncodingValue.fromJSON(mark, group, json.texScale.x); }
            if (json.texScale.y) { markEncodingValue.texScale.y = MarkEncodingValue.fromJSON(mark, group, json.texScale.y); }
            if (json.texScale.z) { markEncodingValue.texScale.z = MarkEncodingValue.fromJSON(mark, group, json.texScale.z); }
            if (json.texScale.w) { markEncodingValue.texScale.w = MarkEncodingValue.fromJSON(mark, group, json.texScale.w); }
        }

        return markEncodingValue;
    }
}

export class MarkEncodings {
    public x: MarkEncodingValue;
    public xc: MarkEncodingValue;
    public x2: MarkEncodingValue;
    public y: MarkEncodingValue;
    public yc: MarkEncodingValue;
    public y2: MarkEncodingValue;
    public z: MarkEncodingValue;
    public zc: MarkEncodingValue;
    public z2: MarkEncodingValue;
    public width: MarkEncodingValue;
    public height: MarkEncodingValue;
    public depth: MarkEncodingValue;
    public fill: MarkEncodingValue;
    public stroke: MarkEncodingValue;
    public text: MarkEncodingValue
    public rounding: MarkEncodingValue;
    public thickness: MarkEncodingValue;

    // Material properties
    public fuzz: MarkEncodingValue;
    public refractiveIndex: MarkEncodingValue;
    public gloss: MarkEncodingValue;
    public density: MarkEncodingValue;

    // Segment
    public segmentId: MarkEncodingValue;

    // Text
    public align: string; // left (default), center, right
    public baseline: string; // alphabetic (default), top, middle, bottom, line-top, line-bottom
    public lineBreak: string;
    public font: string;
    public fontStyle: string; // normal (default), italic, oblique
    public fontWeight: number; // 100-900
    public fontSize: MarkEncodingValue;
    public angle: MarkEncodingValue;
    public angleX: MarkEncodingValue;
    public angleY: MarkEncodingValue;
    public angleZ: MarkEncodingValue;
    public rotation: Core.Quaternion; // TODO: MarkEncodingValue
    public dx: MarkEncodingValue;
    public dy: MarkEncodingValue; // Negative values are "up"
    public dz: MarkEncodingValue;
     // Polar coordinates
    public radius: MarkEncodingValue;
    public theta: MarkEncodingValue;
    public angleX2: MarkEncodingValue;
    public angleY2: MarkEncodingValue;
    public angleZ2: MarkEncodingValue;
    public rotation2: Core.Quaternion; // TODO: MarkEncodingValue
    
    // Arc
    public startAngle: MarkEncodingValue;
    public endAngle: MarkEncodingValue;
    public innerRadius: MarkEncodingValue;
    public outerRadius: MarkEncodingValue;
    public padAngle: MarkEncodingValue;
    public padding: MarkEncodingValue;

    // Line
    public strokeWidth: MarkEncodingValue;
    public strokeDepth: MarkEncodingValue;
    public offset: MarkEncodingValue;
    public offset2: MarkEncodingValue;
}