// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import * as Core from "core";
import { Color } from "../color.js";
import { Group } from "../marks/group.js";
import { Scale, TickInfo } from "./scale.js";

export class Log extends Scale {
    public clamp: boolean;
    public base: number;

    constructor() {
        super();
        this.type = "log";

        // Defaults
        this.clamp = false;
        this.base = 10;
    }

    private _logBase(value: number): number {
        return Math.log(value) / Math.log(this.base);
    }

    public map(value: number): number {
        const range = this.range;
        const domain = this.domain;
        const clamp = this.clamp;
        const reverse = this.reverse;

        // Guard against non-positive values
        if (value <= 0) { value = domain.min; }

        const logMin = this._logBase(domain.min);
        const logMax = this._logBase(domain.max);
        const logValue = this._logBase(value);
        const logSpan = logMax - logMin;
        if (logSpan === 0) { return range.min; }
        const normalized = (logValue - logMin) / logSpan;

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

        // Generate ticks at powers of the base within the domain
        const logMin = Math.floor(this._logBase(min));
        const logMax = Math.ceil(this._logBase(max));
        for (let p = logMin; p <= logMax; p++) {
            const value = Math.pow(this.base, p);
            if (value >= min && value <= max) {
                const label = format ? format.format(value) : value.toString();
                ticks.push({ value, label });
            }
        }

        // Fallback: if no powers of base fall in domain, use evenly-spaced in log space
        if (ticks.length === 0) {
            for (let i = 0; i <= count; i++) {
                const logValue = this._logBase(min) + i * (this._logBase(max) - this._logBase(min)) / count;
                const value = Math.pow(this.base, logValue);
                const label = format ? format.format(value) : value.toString();
                ticks.push({ value, label });
            }
        }

        return ticks;
    }

    public defaultTickCount(): number {
        // Number of powers of base in domain (at least 1)
        const logMin = Math.floor(this._logBase(this.domain.min));
        const logMax = Math.ceil(this._logBase(this.domain.max));
        return Math.max(1, logMax - logMin);
    }

    public static fromJSON(group: Group, scaleJSON: any): Log {
        const log = new Log();
        log._fromJSON(scaleJSON);

        // Optional fields
        if (scaleJSON.clamp != undefined) { log.clamp = scaleJSON.clamp; }
        if (scaleJSON.base != undefined) {
            if (typeof scaleJSON.base == "number") { log.base = scaleJSON.base; }
            else if (typeof scaleJSON.base == "object" && scaleJSON.base.signal) {
                log.base = group.parseSignalValue(scaleJSON.base.signal);
            }
        }
        if (!isFinite(log.base) || log.base <= 0 || log.base === 1) { throw new Error("log scale base must be a positive finite number other than 1"); }

        // Domain
        const domain = log.domain;
        if (Array.isArray(scaleJSON.domain) && scaleJSON.domain.length == 2) {
            // Min
            if (typeof scaleJSON.domain[0] == "number") { domain.min = scaleJSON.domain[0]; }
            else if (typeof (scaleJSON.domain[0]) == "object" && scaleJSON.domain[0].signal) {
                domain.min = group.parseSignalValue(scaleJSON.domain[0].signal);
            }
            else { throw new Error("log scale domain min must be a number"); }

            // Max
            if (typeof scaleJSON.domain[1] == "number") { domain.max = scaleJSON.domain[1]; }
            else if (typeof (scaleJSON.domain[1]) == "object" && scaleJSON.domain[1].signal) {
                domain.max = group.parseSignalValue(scaleJSON.domain[1].signal);
            }
            else { throw new Error("log scale domain max must be a number"); }
        }
        else if (typeof scaleJSON.domain == "object" && scaleJSON.domain.signal) {
            const signalValue = group.parseSignalValue(scaleJSON.domain.signal);
            if (Array.isArray(signalValue) && signalValue.length == 2) {
                domain.min = signalValue[0];
                domain.max = signalValue[1];
            }
            else { throw new Error("log scale domain signal must be an array of two numbers"); }
        }
        else if (typeof scaleJSON.domain == "object" && scaleJSON.domain.data) {
            // Data reference
            const data = scaleJSON.domain.data;
            const dataset = group.getDataset(data);
            if (!dataset) { throw new Error(`log scale dataset ${data} not found`); }
            const field = scaleJSON.domain.field;
            if (!field) { throw new Error("log scale domain field not specified"); }
            domain.data = dataset;
            domain.field = field;
            const columnIndex = dataset.getColumnIndex(field);
            if (columnIndex == -1) { throw new Error(`log scale field ${field} not found`); }

            // Min, max
            const isDiscrete = false;
            if (scaleJSON.domainMin != undefined) { domain.min = scaleJSON.domainMin; }
            else { domain.min = dataset.all.minValue(columnIndex, isDiscrete); }
            if (scaleJSON.domainMax != undefined) { domain.max = scaleJSON.domainMax; }
            else { domain.max = dataset.all.maxValue(columnIndex, isDiscrete); }
        }
        else { console.log(`unknown domain type ${scaleJSON.domain}`); }

        // Enforce positive domain for log scale
        if (domain.min <= 0) {
            console.warn(`log scale domain min (${domain.min}) must be positive, clamping to 1e-6`);
            domain.min = 1e-6;
        }
        if (domain.max <= 0) { throw new Error("log scale domain max must be positive"); }

        // TODO: Move to ScaleRange.fromJSON
        // Range
        const range = log.range;
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
        return log;
    }
}
