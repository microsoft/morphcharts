// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import { Dataset } from "../dataset.js";
import { Transform } from "./transform.js";
import { Group } from "../marks/group.js";
import { Signal } from "../signal.js";

export class Extent extends Transform {
    /**
     * Generate a sequence of rows based on integer field value
     * @param dataset 
     */
    transform(group: Group, dataset: Dataset): void {
        // Required fields
        const field = this._transformJSON.field;
        if (field == undefined) { return; }

        // Column index
        const columnIndex = dataset.getColumnIndex(field);
        if (columnIndex == -1) { throw new Error(`extent transform column ${field} not found`); }

        // Min, max
        const min = dataset.all.minValue(columnIndex, false);
        const max = dataset.all.maxValue(columnIndex, false);

        // Optional fields
        const name = this._transformJSON.signal || "extent";
        const signal = new Signal();
        signal.name = name;
        signal.update = () => [min, max];
        signal.value = signal.update();
        group.signals[name] = signal;

        console.log(`extent ${name} ${min} ${max}`);
    }
}