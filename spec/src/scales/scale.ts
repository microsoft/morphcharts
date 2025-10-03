// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import * as Core from "core";
import { Dataset } from "../dataset.js";

export abstract class Scale {
    public type: string;
    public name: string;
    public domain: ScaleDomain;
    public range: ScaleRange;
    public reverse: boolean;

    public abstract map(value: number | string): number;

    constructor() {
        this.domain = new ScaleDomain();
        this.range = new ScaleRange();

        // Defaults
        this.reverse = false; // Default to no reverse
    }

    protected _fromJSON(scaleJSON: any) {
        // Required fields
        if (!scaleJSON.name) { throw new Error("scale must have a name"); }
        this.name = scaleJSON.name;

        // Optional fields
        if (scaleJSON.reverse != undefined) { this.reverse = scaleJSON.reverse; }
    }
}

// TODO: Support array literal of domain values, e.g. [0,400], or ["a", "b", "c"]
// TODO: QuantitativeScaleDomain, DiscreteScaleDomain
export class ScaleDomain {
    public data: Dataset;
    public field: string;
    public values: any[];
    public min: number;
    public max: number;
    public sort: boolean | DomainSort; // If a boolean true value, sort the domain values in ascending order. If object-valued, sort the domain according to the provided sort parameters. Sorting is only supported for discrete scale types.
    public orderedLookup: Uint32Array; // Ordered distinct string values for discrete scales
}

export class DomainSort {
    public field: string; // The data field to sort by. If unspecified, defaults to the field specified in the outer data reference.
    public order: string; // The sort order. One of ascending (default) or descending.
    public op: string; // An aggregate operation to perform on the field prior to sorting. Examples include count, mean and median. This property is required in cases where the sort field and the data reference field do not match. The input data objects will be aggregated, grouped by data reference field values. For a full list of operations, see the aggregate transform, and also see below for limitations with multi-field domains.
}

// TODO: QuantitativeScaleRange, DiscreteScaleRange, DiscretizingScaleRange
export class ScaleRange {
    public min: number;
    public max: number;

    // Band step
    public step: number;

    // Color
    public scheme: string; // A color scheme name
    public colors: Core.ColorRGB[]; // An array of color values
    public count: number; // For quantile/quantize scales, defaults to cardinaility of the domain
}