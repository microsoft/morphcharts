// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import * as Core from "core";
import { Group } from "../marks/group.js";
import { DomainSort, Scale } from "./scale.js";
import { Color } from "../color.js";

export class Ordinal extends Scale {
    constructor() {
        super();
        this.type = "ordinal";
    }

    public map(value: string): number {
        let columnValue = 0;
        if (this.domain.data) {
            const dataset = this.domain.data;
            const columnIndex = dataset.getColumnIndex(this.domain.field);
            if (columnIndex == -1) { throw new Error(`ordinal scale field ${this.domain.field} not found`); }
            columnValue = dataset.all.distinctStringValues(columnIndex)[value];

            // Order
            if (this.domain.orderedLookup) { columnValue = this.domain.orderedLookup[columnValue]; }
        }

        // Map value to range
        if (this.reverse) { return Math.max(this.range.max - columnValue, 0); }
        else { return Math.min(this.range.min + columnValue, this.range.max); }
    }

    public static fromJSON(group: Group, scaleJSON: any): Ordinal {
        const ordinal = new Ordinal();
        ordinal._fromJSON(scaleJSON);

        // Domain
        // TODO: Move to ScaleDomain.fromJSON
        // Check if object-valued or array-valued
        const domain = ordinal.domain;
        if (Array.isArray(scaleJSON.domain) && scaleJSON.domain.length == 2) {
            // Min
            if (typeof scaleJSON.domain[0] == "number") { domain.min = scaleJSON.domain[0]; }
            else if (typeof (scaleJSON.domain[0]) == "object" && scaleJSON.domain[0].signal) {
                domain.min = group.parseSignalValue(scaleJSON.domain[0].signal);
            }

            // Max
            if (typeof scaleJSON.domain[1] == "number") { domain.max = scaleJSON.domain[1]; }
            else if (typeof (scaleJSON.domain[1]) == "object" && scaleJSON.domain[1].signal) {
                domain.max = group.parseSignalValue(scaleJSON.domain[1].signal);
            }
        }
        else if (typeof scaleJSON.domain == "object") {
            // Data reference
            const data = scaleJSON.domain.data;
            if (!data) { throw new Error("ordinal scale domain data not specified"); }
            const dataset = group.getDataset(data);
            if (!dataset) { throw new Error(`ordinal scale dataset "${data}" not found`); }
            const field = scaleJSON.domain.field;
            if (!field) { throw new Error("ordinal scale domain field not specified"); }
            domain.data = dataset;
            domain.field = field;
            const columnIndex = dataset.getColumnIndex(field);
            if (columnIndex == -1) { throw new Error(`ordinal scale field "${field}" not found`); }

            // Min, max
            const isDiscrete = true; // Ordinal scales are always discrete
            domain.min = dataset.all.minValue(columnIndex, isDiscrete);
            domain.max = dataset.all.maxValue(columnIndex, isDiscrete);

            // Sort
            if (scaleJSON.domain.sort) {
                if (typeof scaleJSON.domain.sort == "boolean") {
                    domain.sort = scaleJSON.domain.sort;

                    // Build a lookup table from data values to ordered distinct string values
                    const distinctStrings = dataset.all.distinctStrings(columnIndex);

                    // First build an ordered list of distinct string values
                    let sequence = new Uint32Array(distinctStrings.length);
                    for (let i = 0; i < sequence.length; i++) { sequence[i] = i; }
                    const orderedDistinctStrings = sequence.sort((a, b) => { return distinctStrings[a].localeCompare(distinctStrings[b]); });

                    // Build a lookup table from ordered distinct string values to data values
                    const lookup = new Uint32Array(distinctStrings.length);
                    for (let i = 0; i < sequence.length; i++) { lookup[orderedDistinctStrings[i]] = i; }
                    domain.orderedLookup = lookup;
                }
                else {
                    // Object-valued
                    const sort = new DomainSort();
                    sort.field = scaleJSON.domain.sort.field;
                    sort.order = scaleJSON.domain.sort.order || "ascending";
                    sort.op = scaleJSON.domain.sort.op;

                    // If no sort field, use domain field
                    const sortField = sort.field || field;

                    // If sort field is the same as domain field, no need to aggregate
                    if (sortField == field) {
                        // Build a lookup table from data values to ordered distinct string values
                        const distinctStrings = dataset.all.distinctStrings(columnIndex);

                        // First build an ordered list of distinct string values
                        let sequence = new Uint32Array(distinctStrings.length);
                        for (let i = 0; i < sequence.length; i++) { sequence[i] = i; }
                        const orderedDistinctStrings = sort.order == "descending" ? sequence.sort((a, b) => { return distinctStrings[b].localeCompare(distinctStrings[a]); }) : sequence.sort((a, b) => { return distinctStrings[a].localeCompare(distinctStrings[b]); });

                        // Build a lookup table from ordered distinct string values to data values
                        const lookup = new Uint32Array(distinctStrings.length);
                        for (let i = 0; i < sequence.length; i++) { lookup[orderedDistinctStrings[i]] = i; }
                        domain.orderedLookup = lookup;
                    }
                    else {
                        // Sort field is different from domain field, aggregate provided operation is specified
                        if (sort.op) {
                            const aggregateColumnIndex = dataset.getColumnIndex(sort.field);
                            if (aggregateColumnIndex == -1) { throw new Error(`ordinal scale op field "${sort.field}" not found`); }
                            const aggregateColumnType = dataset.getColumnType(aggregateColumnIndex);
                            if (aggregateColumnType == Core.Data.ColumnType.float || aggregateColumnType == Core.Data.ColumnType.integer) {
                                const groupByColumnValues = dataset.all.columnValues(columnIndex, true); // Discrete
                                const aggregateColumnValues = dataset.all.columnValues(aggregateColumnIndex, false); // Numeric
                                const aggregateValues = new Float32Array(dataset.length);
                                const aggregateCounts = new Float32Array(dataset.length);
                                switch (sort.op) {
                                    case "sum":
                                        for (let i = 0; i < dataset.length; i++) {
                                            const groupByValue = groupByColumnValues[i];
                                            const aggregateValue = aggregateColumnValues[i];
                                            aggregateValues[groupByValue] += aggregateValue;
                                        }
                                        break;
                                    case "max":
                                        for (let i = 0; i < dataset.length; i++) { aggregateValues[i] = -Number.MAX_VALUE; }
                                        for (let i = 0; i < dataset.length; i++) {
                                            const groupByValue = groupByColumnValues[i];
                                            const aggregateValue = aggregateColumnValues[i];
                                            aggregateValues[groupByValue] = Math.max(aggregateValues[groupByValue], aggregateValue);
                                        }
                                        break;
                                    case "mean":
                                        for (let i = 0; i < dataset.length; i++) {
                                            const groupByValue = groupByColumnValues[i];
                                            const aggregateValue = aggregateColumnValues[i];
                                            aggregateValues[groupByValue] += aggregateValue;
                                            aggregateCounts[groupByValue]++;
                                        }
                                        for (let i = 0; i < dataset.length; i++) {
                                            if (aggregateCounts[i] > 0) { aggregateValues[i] /= aggregateCounts[i]; }
                                        }
                                        break;
                                    case "median":
                                        break;
                                }

                                // Build a lookup table from data values to ordered distinct string values
                                const distinctStrings = dataset.all.distinctStrings(columnIndex);

                                // First build an ordered list of distinct string values
                                let sequence = new Uint32Array(distinctStrings.length);
                                for (let i = 0; i < sequence.length; i++) { sequence[i] = i; }
                                const orderedDistinctStrings = sort.order == "descending" ? sequence.sort((a, b) => { return aggregateValues[b] - aggregateValues[a]; }) : sequence.sort((a, b) => { return aggregateValues[a] - aggregateValues[b]; });

                                // Build a lookup table from ordered distinct string values to data values
                                const lookup = new Uint32Array(distinctStrings.length);
                                for (let i = 0; i < sequence.length; i++) { lookup[orderedDistinctStrings[i]] = i; }
                                domain.orderedLookup = lookup;
                            }
                        }
                    }
                }
            }
        }

        // TODO: Move to ScaleRange.fromJSON
        // Range
        const range = ordinal.range;
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
        if (Array.isArray(rangeJSON)) {
            // Parse array of color values
            range.colors = [];
            for (let i = 0; i < rangeJSON.length; i++) {
                const color = Color.parse(rangeJSON[i]);
                if (color) { range.colors.push(color); }
            }
            range.min = 0;
            range.max = Math.max(range.colors.length - 1, domain.max);
        }
        else if (rangeJSON.scheme) {
            range.scheme = rangeJSON.scheme;
            // Check for valid name
            const palette = Core.Palettes[range.scheme];
            if (palette) {
                switch (palette.type) {
                    case "qualitative":
                        range.min = 0;
                        // Allow colors to wrap
                        range.max = Math.max(palette.colors.length - 1, domain.max);
                        break;
                    default:
                        range.min = 0;
                        range.max = domain.max;

                        // Create a color scheme from the palette which maps to the domain
                        range.colors = [];
                        const step = 1 / (domain.max - domain.min + 1);
                        for (let i = 0; i <= domain.max; i++) {
                            const position = (i + 0.5) * step;
                            const color = Core.Palette.sample(palette.colors, position, true);
                            range.colors.push(color);
                        }
                        break;
                }
            }
        }
        return ordinal;
    }
}