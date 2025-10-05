// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import * as Core from "core";
import { Group } from "../marks/group.js";
import { DomainSort, Scale } from "./scale.js";
import { Expression } from "../expression.js";

export class Band extends Scale {
    // Padding as a fraction of the step size (default 0), [0,1]
    public paddingInner: number;
    public paddingOuter: number;

    constructor() {
        super();
        this.type = "band";

        // Defaults
        this.paddingInner = 0;
        this.paddingOuter = 0;
    }

    public map(value: string): number {
        let columnValue = 0;
        if (this.domain.data) {
            const dataset = this.domain.data;
            const columnIndex = dataset.getColumnIndex(this.domain.field);
            if (columnIndex == -1) { throw new Error(`band scale field "${this.domain.field}" not found`); }
            columnValue = dataset.all.distinctStringValues(columnIndex)[value];

            // Order
            if (this.domain.orderedLookup) { columnValue = this.domain.orderedLookup[columnValue]; }
        }

        // Get bandwidth
        const bandwidth = this.bandwidth();
        // Determine step size
        // bandwidth = step * (1 - paddingInner)
        const step = bandwidth / (1 - this.paddingInner);

        // Map value to range
        if (this.reverse) { return this.paddingOuter * step + (this.domain.max - columnValue + this.domain.min) * step; }
        else { return this.paddingOuter * step + (columnValue - this.domain.min) * step; }
    }

    public bandwidth(): number {
        let step = this.range.step;
        if (!step) {
            // Determine step size based on domain cardinality and range
            const domain = this.domain;
            const cardinality = Math.abs(domain.max - domain.min) + 1;
            // bandwidth = step - inner * step
            // bandwidth = step * (1 - inner)
            // range = step * outer * 2 + step * inner * (cardinality - 1) + bandwidth * cardinality
            // range = step * outer * 2 + step * inner * (cardinality - 1) + step * (1 - inner) * cardinality
            // range = step * (outer * 2 + inner * (cardinality - 1) + (1 - inner) * cardinality)
            step = (this.range.max - this.range.min) / (this.paddingOuter * 2 + this.paddingInner * (cardinality - 1) + (1 - this.paddingInner) * cardinality);
        }
        // bandwidth = step - (paddingInner * step)
        // bandwidth = step * (1 - paddingInner)
        return step * (1 - this.paddingInner);
    }

    public static fromJSON(group: Group, scaleJSON: any): Band {
        const band = new Band();
        band._fromJSON(scaleJSON);

        // Padding
        const parsePadding = (paddingJSON: any): number => {
            let padding = 0;
            if (typeof paddingJSON == "number") { padding = paddingJSON; }
            else if (typeof paddingJSON == "object" && paddingJSON.signal) {
                const signal = group.getSignal(paddingJSON.signal);
                if (signal) { padding = signal.value; }
                else { padding = new Expression().parseExpression(paddingJSON.signal, group)(); }
            }
            return padding;
        }
        if (scaleJSON.padding) { band.paddingInner = band.paddingOuter = parsePadding(scaleJSON.padding); }
        if (scaleJSON.paddingInner) { band.paddingInner = parsePadding(scaleJSON.paddingInner); }
        if (scaleJSON.paddingOuter) { band.paddingOuter = parsePadding(scaleJSON.paddingOuter); }

        // Domain
        // TODO: Move to ScaleDomain.fromJSON
        // Check if object-valued or array-valued
        const domain = band.domain;
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
            if (!data) { throw new Error("band scale domain data not specified"); }
            const dataset = group.getDataset(data);
            if (!dataset) { throw new Error(`band scale dataset "${data}" not found`); }
            const field = scaleJSON.domain.field;
            if (!field) { throw new Error("band scale domain field not specified"); }
            domain.data = dataset;
            domain.field = field;
            const columnIndex = dataset.getColumnIndex(field);
            if (columnIndex == -1) { throw new Error(`band scale field "${field}" not found`); }

            // Min, max
            const isDiscrete = true; // Band scales are always discrete
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
                    if (sort.op) {
                        const aggregateColumnIndex = dataset.getColumnIndex(sort.field);
                        if (aggregateColumnIndex == -1) { throw new Error(`band scale op field "${sort.field}" not found`); }
                        const aggregateColumnType = dataset.getColumnType(aggregateColumnIndex);
                        if (aggregateColumnType == Core.Data.ColumnType.float || aggregateColumnType == Core.Data.ColumnType.integer || aggregateColumnType == Core.Data.ColumnType.date) {
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

        // TODO: Move to ScaleRange.fromJSON
        // Range
        const range = band.range;
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
        if (scaleJSON.range.step != undefined) {
            // range.step = scaleJSON.range.step;
            if (typeof scaleJSON.range.step == "number") { range.step = scaleJSON.range.step; }
            else if (typeof scaleJSON.range.step == "object" && scaleJSON.range.step.signal) {
                range.step = group.parseSignalValue(scaleJSON.range.step.signal);
            }
            range.min = 0;
            let cardinality: number;
            // Object values
            if (domain.values) { cardinality = domain.values.length; }
            // Data values
            else { cardinality = domain.data.all.maxValue(domain.data.getColumnIndex(domain.field), true) + 1; }
            // bandwidth = step - inner * step
            // bandwidth = step * (1 - inner)
            // range = step * outer * 2 + step * inner * (cardinality - 1) + bandwidth * cardinality
            // range = step * outer * 2 + step * inner * (cardinality - 1) + step * (1 - inner) * cardinality
            // range = step * (outer * 2 + inner * (cardinality - 1) + (1 - inner) * cardinality)
            range.max = range.step * (band.paddingOuter * 2 + band.paddingInner * (cardinality - 1) + (1 - band.paddingInner) * cardinality);
        }
        else if (Array.isArray(scaleJSON.range) && scaleJSON.range.length == 2) {
            // Min
            if (typeof scaleJSON.range[0] == "number") { range.min = scaleJSON.range[0]; }
            else if (typeof scaleJSON.range[0] == "object" && scaleJSON.range[0].signal) {
                range.min = group.parseSignalValue(scaleJSON.range[0].signal);
            }

            // Max
            if (typeof scaleJSON.range[1] == "number") { range.max = scaleJSON.range[1]; }
            else if (typeof scaleJSON.range[1] == "object" && scaleJSON.range[1].signal) {
                range.max = group.parseSignalValue(scaleJSON.range[1].signal);
            }
        }
        else if (typeof scaleJSON.range == "string") {
            // Pre-defined range defaults
            switch (scaleJSON.range) {
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
                // TODO: Color scheme defaults
                default:
                    console.log(`band scale unknown range type "${scaleJSON.range}"`);
                    break;
            }
        }
        else if (scaleJSON.range.scheme) {
            range.scheme = scaleJSON.range.scheme;
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
        return band;
    }
}