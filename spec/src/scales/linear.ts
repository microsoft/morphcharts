// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import * as Core from "core";
import { Group } from "../marks/group.js";
import { Scale } from "./scale.js";

export class Linear extends Scale {
    public zero: boolean;
    public clamp: boolean; // If true, clamp the output value to the range

    constructor() {
        super();
        this.type = "linear";

        // Defaults
        this.zero = true; // Default to zero for linear scales
        this.clamp = false; // Default to no clamping
    }

    public map(value: number): number {
        const range = this.range;
        const domain = this.domain;
        const clamp = this.clamp;
        const reverse = this.reverse;

        // Map value to range
        if (clamp) {
            if (reverse) { return Math.min(Math.max(range.max + (range.min - range.max) * (value - domain.min) / (domain.max - domain.min), range.min), range.max); }
            else { return Math.min(Math.max(range.min + (range.max - range.min) * (value - domain.min) / (domain.max - domain.min), range.min), range.max); }
        }
        else {
            if (reverse) { return range.max + (range.min - range.max) * (value - domain.min) / (domain.max - domain.min); }
            else { return range.min + (range.max - range.min) * (value - domain.min) / (domain.max - domain.min); }
        }
    }

    public static fromJSON(group: Group, scaleJSON: any): Linear {
        const linear = new Linear();
        linear._fromJSON(scaleJSON); // Call the base class method to set name, domain, range, reverse, round

        // Optional fields
        if (scaleJSON.zero != undefined) { linear.zero = scaleJSON.zero; }
        if (scaleJSON.clamp != undefined) { linear.clamp = scaleJSON.clamp; }

        // Domain
        const domain = linear.domain;
        if (Array.isArray(scaleJSON.domain) && scaleJSON.domain.length == 2) {
            // Min
            if (typeof scaleJSON.domain[0] == "number") { domain.min = scaleJSON.domain[0]; }
            else if (typeof (scaleJSON.domain[0]) == "object" && scaleJSON.domain[0].signal) {
                domain.min = group.parseSignalValue(scaleJSON.domain[0].signal);
            }
            else { throw new Error("linear scale domain min signal must be a number"); }

            // Max
            if (typeof scaleJSON.domain[1] == "number") { domain.max = scaleJSON.domain[1]; }
            else if (typeof (scaleJSON.domain[1]) == "object" && scaleJSON.domain[1].signal) {
                domain.max = group.parseSignalValue(scaleJSON.domain[1].signal);
            }
            else { throw new Error("linear scale domain max signal must be a number"); }
        }
        else if (typeof scaleJSON.domain == "object" && scaleJSON.domain.signal) {
            const signalValue = group.parseSignalValue(scaleJSON.domain.signal);
            if (Array.isArray(signalValue) && signalValue.length == 2) {
                domain.min = signalValue[0];
                domain.max = signalValue[1];
            }
            else { throw new Error("linear scale domain signal must be an array of two numbers"); }
        }
        else if (typeof scaleJSON.domain == "object" && scaleJSON.domain.data) {
            // Data reference
            const data = scaleJSON.domain.data;
            const dataset = group.getDataset(data);
            if (!dataset) { throw new Error(`linear scale dataset "${data}" not found`); }
            const field = scaleJSON.domain.field;
            if (!field) { throw new Error("linear scale domain field not specified"); }
            domain.data = dataset;
            domain.field = field;
            const columnIndex = dataset.getColumnIndex(field);
            if (columnIndex == -1) { throw new Error(`linear scale field "${field}" not found`); }

            // Min, max
            const isDiscrete = false; // Linear scales are always continuous
            if (scaleJSON.domainMin != undefined) { domain.min = scaleJSON.domainMin; }
            else { domain.min = linear.zero ? Math.min(0, dataset.all.minValue(columnIndex, isDiscrete)) : dataset.all.minValue(columnIndex, isDiscrete); }
            if (scaleJSON.domainMax != undefined) { domain.max = scaleJSON.domainMax; }
            else { domain.max = linear.zero ? Math.max(0, dataset.all.maxValue(columnIndex, isDiscrete)) : dataset.all.maxValue(columnIndex, isDiscrete); }
        }
        else { console.log(`linear scale unknown domain type "${scaleJSON.domain}"`); }

        // Zero
        if (linear.zero) {
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
        const range = linear.range;
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
        if (Array.isArray(rangeJSON) && rangeJSON.length == 2) {
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
                // TODO: Parse array of color values
            }
            else {
                // Check for valid name
                const palette = Core.Palettes[range.scheme];
                if (palette) {
                    switch (palette.type) {
                        case "sequentialsinglehue":
                        case "sequentialmultihue":
                        case "diverging":
                            range.min = 0;
                            range.max = 1;
                            break;
                        case "qualitative":
                            range.min = 0;
                            // Allow colors to wrap
                            range.max = Math.max(palette.colors.length - 1, domain.max);
                            break;
                    }
                }
            }
        }
        else { console.log(`unknown range type ${rangeJSON}`); }
        return linear;
    }
}