// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import * as Core from "core";
import { Color } from "../color.js";
import { Group } from "../marks/group.js";
import { Scale, TickInfo } from "./scale.js";

export class Pow extends Scale {
    public zero: boolean;
    public clamp: boolean;
    public exponent: number;

    constructor() {
        super();
        this.type = "pow";

        // Defaults
        this.zero = true;
        this.clamp = false;
        this.exponent = 1;
    }

    protected _transform(value: number): number {
        return Math.sign(value) * Math.pow(Math.abs(value), this.exponent);
    }

    public map(value: number): number {
        const range = this.range;
        const domain = this.domain;
        const clamp = this.clamp;
        const reverse = this.reverse;

        // Transform domain bounds and value
        const tMin = this._transform(domain.min);
        const tMax = this._transform(domain.max);
        const tValue = this._transform(value);
        const tSpan = tMax - tMin;
        if (tSpan === 0) { return range.min; }
        const normalized = (tValue - tMin) / tSpan;

        // Map value to range
        if (clamp) {
            if (reverse) { return Math.min(Math.max(range.max + (range.min - range.max) * normalized, range.min), range.max); }
            else { return Math.min(Math.max(range.min + (range.max - range.min) * normalized, range.min), range.max); }
        }
        else {
            if (reverse) { return range.max + (range.min - range.max) * normalized; }
            else { return range.min + (range.max - range.min) * normalized; }
        }
    }

    public tickValues(count: number, format?: Intl.NumberFormat | Intl.DateTimeFormat): TickInfo[] {
        const ticks: TickInfo[] = [];
        const min = this.domain.min;
        const max = this.domain.max;
        for (let i = 0; i <= count; i++) {
            const value = min + i * (max - min) / count;
            const label = format ? format.format(value) : value.toString();
            ticks.push({ value, label });
        }
        return ticks;
    }

    public static fromJSON(group: Group, scaleJSON: any): Pow {
        const pow = new Pow();
        pow._fromJSON(scaleJSON);

        // Optional fields
        if (scaleJSON.zero != undefined) { pow.zero = scaleJSON.zero; }
        if (scaleJSON.clamp != undefined) { pow.clamp = scaleJSON.clamp; }
        if (scaleJSON.exponent != undefined) {
            if (typeof scaleJSON.exponent == "number") { pow.exponent = scaleJSON.exponent; }
            else if (typeof scaleJSON.exponent == "object" && scaleJSON.exponent.signal) {
                pow.exponent = group.parseSignalValue(scaleJSON.exponent.signal);
            }
        }
        if (!isFinite(pow.exponent)) { throw new Error("pow scale exponent must be a finite number"); }

        // Domain
        const domain = pow.domain;
        if (Array.isArray(scaleJSON.domain) && scaleJSON.domain.length == 2) {
            // Min
            if (typeof scaleJSON.domain[0] == "number") { domain.min = scaleJSON.domain[0]; }
            else if (typeof (scaleJSON.domain[0]) == "object" && scaleJSON.domain[0].signal) {
                domain.min = group.parseSignalValue(scaleJSON.domain[0].signal);
            }
            else { throw new Error("pow scale domain min must be a number"); }

            // Max
            if (typeof scaleJSON.domain[1] == "number") { domain.max = scaleJSON.domain[1]; }
            else if (typeof (scaleJSON.domain[1]) == "object" && scaleJSON.domain[1].signal) {
                domain.max = group.parseSignalValue(scaleJSON.domain[1].signal);
            }
            else { throw new Error("pow scale domain max must be a number"); }
        }
        else if (typeof scaleJSON.domain == "object" && scaleJSON.domain.signal) {
            const signalValue = group.parseSignalValue(scaleJSON.domain.signal);
            if (Array.isArray(signalValue) && signalValue.length == 2) {
                domain.min = signalValue[0];
                domain.max = signalValue[1];
            }
            else { throw new Error("pow scale domain signal must be an array of two numbers"); }
        }
        else if (typeof scaleJSON.domain == "object" && scaleJSON.domain.data) {
            // Data reference
            const data = scaleJSON.domain.data;
            const dataset = group.getDataset(data);
            if (!dataset) { throw new Error(`pow scale dataset ${data} not found`); }
            const field = scaleJSON.domain.field;
            if (!field) { throw new Error("pow scale domain field not specified"); }
            domain.data = dataset;
            domain.field = field;
            const columnIndex = dataset.getColumnIndex(field);
            if (columnIndex == -1) { throw new Error(`pow scale field ${field} not found`); }

            // Min, max
            const isDiscrete = false;
            if (scaleJSON.domainMin != undefined) { domain.min = scaleJSON.domainMin; }
            else { domain.min = pow.zero ? Math.min(0, dataset.all.minValue(columnIndex, isDiscrete)) : dataset.all.minValue(columnIndex, isDiscrete); }
            if (scaleJSON.domainMax != undefined) { domain.max = scaleJSON.domainMax; }
            else { domain.max = pow.zero ? Math.max(0, dataset.all.maxValue(columnIndex, isDiscrete)) : dataset.all.maxValue(columnIndex, isDiscrete); }
        }
        else { console.log(`unknown domain type ${scaleJSON.domain}`); }

        // Zero
        if (pow.zero) {
            domain.min = Math.min(0, domain.min);
            domain.max = Math.max(0, domain.max);
        }

        // Override domain min/max with "nice" values
        if (scaleJSON.nice) {
            const span = domain.max - domain.min;
            if (span > 0) {
                const maxTicks = 10;
                const niceScale = Core.Math.niceScale(domain.min, domain.max, maxTicks);
                domain.min = niceScale.niceMin;
                domain.max = niceScale.niceMax;
            }
        }

        // TODO: Move to ScaleRange.fromJSON
        // Range
        const range = pow.range;
        let rangeJSON = scaleJSON.range
        // Check config
        if (typeof rangeJSON == "string") {
            const config = group.config;
            switch (rangeJSON) {
                case "category":
                    rangeJSON = config.json.range.category;
                    break;
                case "diverging":
                    rangeJSON = config.json.range.diverging;
                    break;
                case "ordinal":
                    rangeJSON = config.json.range.ordinal;
                    break;
                case "ramp":
                    rangeJSON = config.json.range.ramp;
                    break;
            }
        }
        if (Array.isArray(rangeJSON) && rangeJSON.length >= 2 && typeof rangeJSON[0] == "string") {
            // Direct array of color values, "range": ["red", "white", "blue"]
            // Interpolate colors
            range.colors = [];
            for (let i = 0; i < rangeJSON.length; i++) {
                const color = Color.parse(rangeJSON[i]);
                if (color) { range.colors.push(color); }
            }
            range.min = 0;
            range.max = 1;
        }
        else if (Array.isArray(rangeJSON)) {
            // Numeric range, "range": [0, 500] or signal references
            if (rangeJSON.length == 2) {
                // Min
                if (typeof rangeJSON[0] == "number") { range.min = rangeJSON[0]; }
                else if (typeof rangeJSON[0] == "object" && rangeJSON[0].signal) {
                    range.min = group.parseSignalValue(rangeJSON[0].signal);
                }

                // Max
                if (typeof rangeJSON[1] == "number") { range.max = rangeJSON[1]; }
                else if (typeof rangeJSON[1] == "object" && rangeJSON[1].signal) {
                    range.max = group.parseSignalValue(rangeJSON[1].signal);
                }
            }
        }
        else if (typeof rangeJSON == "string") {
            // Check for pre-defined signals
            switch (rangeJSON) {
                case "width":
                    range.min = 0;
                    range.max = group.width;
                    break;
                case "height":
                    range.min = 0;
                    range.max = group.height;
                    break;
                case "depth":
                    range.min = 0;
                    range.max = group.depth;
                    break;
            }
        }
        else if (rangeJSON.scheme) {
            range.scheme = rangeJSON.scheme;
            if (Array.isArray(range.scheme)) {
                // Parse array of color values
                range.colors = [];
                for (let i = 0; i < range.scheme.length; i++) {
                    const color = Color.parse(range.scheme[i]);
                    if (color) { range.colors.push(color); }
                }
                range.min = 0;
                range.max = 1;
            }
            else {
                // Check for valid name
                const palette = Core.Palettes[range.scheme];
                if (palette) {
                    // Continuous scales always interpolate across the palette
                    range.min = 0;
                    range.max = 1;
                }
            }
        }
        else { console.log(`unknown range type ${rangeJSON}`); }
        return pow;
    }
}
