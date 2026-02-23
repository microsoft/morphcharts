// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import * as Core from "core";
import { Dataset } from "../dataset.js";
import { Transform } from "./transform.js";

export class Unit extends Transform {
    /**
     * Repeat rows based on integer field value
     * @param dataset 
     * @param readonly 
     */
    transform(dataset: Dataset): Dataset {
        // Required fields
        if (!this._transformJSON.field) {
            return dataset;
        }

        // Required parameters
        const field = this._transformJSON.field;
        const columnIndex = dataset.getColumnIndex(field);
        if (columnIndex == -1) { throw new Error(`unit transform field ${field} not found`); }
        const start = performance.now();
        const columnValues = dataset.all.columnValues(columnIndex, false);
        const rows = [];
        for (let k = 0; k < dataset.length; k++) {
            const count = columnValues[k];
            for (let l = 0; l < count; l++) {
                rows.push(dataset.rows[k].slice());
            }
        }

        // Create new dataset
        dataset = new Dataset(dataset.headings.slice(), rows, dataset.columnTypes.slice());
        console.log(`unit ${rows.length} rows ${Core.Time.formatDuration(performance.now() - start)}`);
        return dataset;
    }
}