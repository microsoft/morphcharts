// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import * as Core from "core";
import { Group } from "../marks/group.js";
import { Scale } from "./scale.js";

export class Quantile extends Scale {
    public binIds: Uint32Array; // Lookup of quantile values by distinct string value

    constructor() {
        super();
        this.type = "quantile";
    }

    public map(value: number): number {
        if (this.domain.data) {
            const dataset = this.domain.data;
            const columnIndex = dataset.getColumnIndex(this.domain.field);
            if (columnIndex == -1) { throw new Error(`quantile scale field "${this.domain.field}" not found`); }
            const distinctStringValue = dataset.all.distinctStringValues(columnIndex)[value]; // Get the distinct string value

            // Get the bin for the value
            const bin = this.binIds[distinctStringValue];

            // Map value to range
            return bin;
        }

        // Prevent exceptions
        return 0;
    }

    public static fromJSON(group: Group, scaleJSON: any): Quantile {
        const quantile = new Quantile();
        quantile._fromJSON(scaleJSON); // Call the base class method to set name, domain, range, reverse, round

        // Domain
        const domain = quantile.domain;
        if (typeof scaleJSON.domain.data) {
            // Data reference
            const data = scaleJSON.domain.data;
            if (!data) { throw new Error("quantile scale domain data not specified"); }
            const dataset = group.getDataset(data);
            if (!dataset) { throw new Error(`quantile scale dataset "${data}" not found`); }
            const field = scaleJSON.domain.field;
            if (!field) { throw new Error("quantile scale domain field not specified"); }
            domain.data = dataset;
            domain.field = field;
            const columnIndex = dataset.getColumnIndex(field);
            if (columnIndex == -1) { throw new Error(`quantile scale field "${field}" not found`); }

            // Min, max
            const isDiscrete = true;
            domain.min = dataset.all.minValue(columnIndex, isDiscrete);
            domain.max = dataset.all.maxValue(columnIndex, isDiscrete);
        }
        else { console.log(`quantile scale unknown domain type "${scaleJSON.domain}"`); }


        // Range
        // TODO: Move to ScaleRange.fromJSON
        // Count
        const range = quantile.range;
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
        range.count = rangeJSON.count || (domain.max - domain.min + 1); // Defaults to cardinality of the domain

        // Scheme
        if (rangeJSON.scheme) {
            range.scheme = rangeJSON.scheme;
            if (Array.isArray(range.scheme)) {
                // TODO: Parse array of color values
            }
            else {
                // Check for valid name
                const palette = Core.Palettes[range.scheme];
                if (palette) {
                    range.min = 0;
                    range.max = range.count - 1;

                    // Create a color scheme from the palette which maps to the domain
                    range.colors = [];
                    const step = 1 / range.count;
                    for (let i = 0; i < range.count; i++) {
                        const position = scaleJSON.reverse ? (range.count - i - 0.5) * step : (i + 0.5) * step;
                        const color = Core.Palette.sample(palette.colors, position, true);
                        range.colors.push(color);
                    }
                }
            }
        }
        else { console.log(`unknown range type ${rangeJSON}`); }

        // Build a lookup of discrete value to quantile values
        if (domain.data) {
            const dataset = domain.data;
            const field = domain.field;
            const columnIndex = dataset.getColumnIndex(field);
            if (columnIndex == -1) { throw new Error(`quantile scale field "${field}" not found`); }

            const ids = dataset.all.ids;
            const orderedIds = dataset.all.orderedIds(columnIndex); // Get ordered ids for the column, using discrete values
            const isDiscrete = true; // Quantile scales are always discrete
            const columnValues = dataset.all.columnValues(columnIndex, isDiscrete); // Get column values as strings
            const distinctStrings = dataset.all.distinctStrings(columnIndex); // Get distinct strings for the column
            const distinctStringValues = dataset.all.distinctStringValues(columnIndex);
            quantile.binIds = new Uint32Array(distinctStrings.length);
            const itemsPerBin = ids.length / range.count;
            let bin = 0;
            for (let i = 0; i < ids.length; i++) {
                const id = orderedIds[i];
                if (i > Math.floor(itemsPerBin * (bin + 1))) {
                    bin++;
                }
                const distinctStringValue = distinctStringValues[distinctStrings[columnValues[id]]];
                quantile.binIds[distinctStringValue] = bin;
            }
        }

        return quantile;
    }
}