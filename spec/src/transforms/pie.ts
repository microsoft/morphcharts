// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import * as Core from "core";
import { Dataset } from "../dataset.js";
import { Transform } from "./transform.js";
import { Group } from "../marks/group.js";

export class Pie extends Transform {
    transform(group: Group, dataset: Dataset, readonly: boolean): Dataset {
        if (readonly) { dataset = dataset.clone(); }

        let _startAngle = "startAngle";
        let _endAngle = "endAngle";
        const as = this._transformJSON.as;
        if (as && Array.isArray(as)) {
            _startAngle = as[0].toString();
            if (as.length > 0) { _endAngle = as[1].toString(); }
        }

        // Total
        let total = 0;
        const field = this._transformJSON.field;
        const columnIndex = dataset.getColumnIndex(field);
        if (columnIndex == -1) { throw new Error(`pie transform field ${field} not found`); }
        const columnValues = dataset.all.columnValues(columnIndex, false);
        for (let k = 0; k < columnValues.length; k++) { total += columnValues[k]; }

        // Start, end angles
        let startAngle = 0, endAngle = Math.PI * 2;
        if (this._transformJSON.startAngle) {
            if (typeof this._transformJSON.startAngle == "object" && this._transformJSON.startAngle.signal) {
                startAngle = group.parseSignalValue(this._transformJSON.startAngle.signal);
            }
            else if (typeof this._transformJSON.startAngle == "number") {
                startAngle = this._transformJSON.startAngle;
            }
        }
        if (this._transformJSON.endAngle) {
            if (typeof this._transformJSON.endAngle == "object" && this._transformJSON.endAngle.signal) {
                endAngle = group.parseSignalValue(this._transformJSON.endAngle.signal);
            }
            else if (typeof this._transformJSON.endAngle == "number") {
                endAngle = this._transformJSON.endAngle;
            }
        }
        const spanAngle = endAngle - startAngle;

        // Sort
        let sequence = new Uint32Array(columnValues.length);
        for (let i = 0; i < sequence.length; i++) { sequence[i] = i; }
        let sort = false;
        if (this._transformJSON.sort) {
            if (typeof this._transformJSON.sort == "object" && this._transformJSON.sort.signal) {
                sort = group.parseSignalValue(this._transformJSON.sort.signal);
            }
            else if (typeof this._transformJSON.sort == "boolean") {
                sort = this._transformJSON.sort;
            }
            if (sort) {
                // Sort by value
                sequence = sequence.sort((a, b) => { return columnValues[a] - columnValues[b]; });
            }
        }

        // Add startAngle, endAngle columns
        const rows = dataset.rows;
        for (let i = 0; i < dataset.length; i++) {
            const index = sequence[i];
            const endAngle = startAngle + columnValues[index] / total * spanAngle;
            const row = rows[index];
            row.push(startAngle.toString()); // startAngle
            row.push(endAngle.toString()); // endAngle
            startAngle = endAngle;
        }

        // Add headings, columnTypes
        dataset.headings.push(_startAngle);
        dataset.columnTypes.push(Core.Data.ColumnType.float);
        dataset.headings.push(_endAngle);
        dataset.columnTypes.push(Core.Data.ColumnType.float);
        return dataset;
    }
}