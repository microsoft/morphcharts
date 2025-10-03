// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import * as Core from "core";
import { Dataset } from "../dataset.js";
import { Transform } from "./transform.js";
import { Group } from "../marks/group.js";

export class Sequence extends Transform {
    /**
     * Generate a sequence of rows based on integer field value
     * @param dataset 
     */
    transform(group: Group): Dataset {
        // Required fields
        if (this._transformJSON.start == undefined || this._transformJSON.stop == undefined) { return null; }
        const _start = performance.now();

        // Start can be number or signal
        let start: number;
        const startJSON = this._transformJSON.start;
        if (typeof startJSON == "number") { start = startJSON; }
        else if (typeof startJSON == "object" && startJSON.signal) {
            start = group.parseSignalValue(startJSON.signal);
        }

        // Stop can be number or signal
        let stop: number;
        const stopJSON = this._transformJSON.stop;
        if (typeof stopJSON == "number") { stop = stopJSON; }
        else if (typeof stopJSON == "object" && stopJSON.signal) {
            stop = group.parseSignalValue(stopJSON.signal);
        }

        // Step can be number or signal, default to 1
        let step: number;
        if (this._transformJSON.step != undefined) {
            const stepJSON = this._transformJSON.step;
            if (typeof stepJSON == "number") { step = stepJSON; }
            else if (typeof stepJSON == "object" && stepJSON.signal) {
                step = group.parseSignalValue(stepJSON.signal);
            }
        }
        else { step = 1; }

        // As
        let as: string;
        if (this._transformJSON.as) { as = this._transformJSON.as; } else { as = "data"; }

        // Create a sequence of integers from start (inclusive) to stop (exclusive), with interger step (positive or negative)
        const rows: string[][] = [];
        if (step > 0) { for (let i = start; i < stop; i += step) { rows.push([i.toString()]); } }
        else { for (let i = start; i > stop; i += step) { rows.push([i.toString()]); } }

        // Create new dataset
        const headings = [as];
        const columnTypes = [Core.Data.ColumnType.integer];
        const dataset = new Dataset(headings, rows, columnTypes);
        console.log(`sequence ${rows.length} rows ${Core.Time.formatDuration(performance.now() - _start)}`);
        return dataset;
    }
}