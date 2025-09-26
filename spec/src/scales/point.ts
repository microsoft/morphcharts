import * as Core from "core";
import { Group } from "../marks/group.js";
import { DomainSort, Scale } from "./scale.js";

// TODO: Refactor to share base class with Band scale
export class Point extends Scale {
    public paddingOuter: number; // Padding as a fraction of the step size (default 0), [0,1]

    constructor() {
        super();
        this.type = "point";

        // Defaults
        this.paddingOuter = 0;
    }

    public map(value: string): number {
        let columnValue = 0;
        if (this.domain.data) {
            const dataset = this.domain.data;
            const columnIndex = dataset.getColumnIndex(this.domain.field);
            if (columnIndex != -1) { columnValue = dataset.all.distinctStringValues(columnIndex)[value]; }

            // Order
            if (this.domain.orderedLookup) { columnValue = this.domain.orderedLookup[columnValue]; }
        }

        // Determine step size
        let step = this.range.step;
        if (!step) {
            // Determine step size based on domain cardinality and range
            const domain = this.domain;
            const cardinality = Math.abs(domain.max - domain.min) + 1;
            // range = step * outer * 2 + step * (cardinality - 1)
            // range = step * (outer * 2 + (cardinality - 1))
            step = (this.range.max - this.range.min) / (this.paddingOuter * 2 + (cardinality - 1));
        }

        // Padding
        const padding = step * this.paddingOuter;

        // Map value to range
        if (this.reverse) { return this.range.min + padding + (this.domain.max - columnValue + this.domain.min) * step; }
        else { return this.range.min + padding + (columnValue - this.domain.min) * step; }
    }

    public static fromJSON(group: Group, scaleJSON: any): Point {
        const point = new Point();
        point._fromJSON(scaleJSON);

        // Padding can be a number or signal, default to 0
        // Alias for paddingOuter
        if (scaleJSON.padding) {
            if (typeof scaleJSON.padding == "number") { point.paddingOuter = scaleJSON.padding; }
            else if (typeof scaleJSON.padding == "object" && scaleJSON.padding.signal) {
                point.paddingOuter = group.parseSignalValue(scaleJSON.padding.signal);
            }
        }
        else if (scaleJSON.paddingOuter) {
            if (typeof scaleJSON.paddingOuter == "number") { point.paddingOuter = scaleJSON.paddingOuter; }
            else if (typeof scaleJSON.paddingOuter == "object" && scaleJSON.paddingOuter.signal) {
                point.paddingOuter = group.parseSignalValue(scaleJSON.paddingOuter.signal);
            }
        }
        else { point.paddingOuter = 0; }

        // Domain
        // TODO: Move to ScaleDomain.fromJSON
        // Check if object-valued or array-valued
        const domain = point.domain;
        if (typeof scaleJSON.domain == "object") {
            // Data reference
            const data = scaleJSON.domain.data;
            if (!data) { throw new Error("no data specified for scale domain"); }
            const dataset = group.getDataset(data);
            if (!dataset) { throw new Error(`dataset "${data}" not found`); }
            const field = scaleJSON.domain.field;
            if (!field) { throw new Error("no field specified for scale domain"); }
            domain.data = dataset;
            domain.field = field;
            const columnIndex = dataset.getColumnIndex(field);
            if (columnIndex == -1) { throw new Error(`field "${field}" not found`); }

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
        const range = point.range;
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
        if (rangeJSON.step != undefined) {
            range.step = rangeJSON.step;
            range.min = 0;
            let cardinality: number;
            // Object values
            if (domain.values) { cardinality = domain.values.length; }
            // Data values
            else { cardinality = domain.data.all.maxValue(domain.data.getColumnIndex(domain.field), true) + 1; }
            // range = step * outer * 2 + step * (cardinality - 1)
            // range = step * (outer * 2 + (cardinality - 1))
            range.max = range.step * (point.paddingOuter * 2 + (cardinality - 1));
        }
        else if (Array.isArray(rangeJSON)) {
            // TODO: Support signal references as elements of the array
            range.min = rangeJSON[0];
            range.max = rangeJSON[1];
        }
        else if (typeof rangeJSON == "string") {
            // Pre-defined range defaults
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
                // TODO: Color scheme defaults
                default:
                    console.log(`unknown range type ${rangeJSON}`);
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
        return point;
    }
}