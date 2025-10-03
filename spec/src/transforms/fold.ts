// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import * as Core from "core";
import { Dataset } from "../dataset.js";
import { Transform } from "./transform.js";
import { Group } from "../marks/group.js";

export class Fold extends Transform {
    transform(group: Group, dataset: Dataset): Dataset {
        // Required fields
        if (!this._transformJSON.fields || !Array.isArray(this._transformJSON.fields)) { return dataset; }

        // Break expression into field, operator, value
        const start = performance.now();
        const fields = this._transformJSON.fields;
        let _key = "key";
        let _value = "value";
        const as = this._transformJSON.as;
        if (as && Array.isArray(as)) {
            if (as.length > 0) { _key = as[0]; }
            if (as.length > 1) { _value = as[1]; }
        }
        const rows = [];
        const fieldIndices = [];
        const fieldHeadings = [];
        for (let i = 0; i < fields.length; i++) {
            const field = fields[i];
            const columnIndex = dataset.getColumnIndex(field);
            if (columnIndex != -1) {
                fieldIndices.push(columnIndex);
                fieldHeadings.push(field);
            }
        }
        for (let i = 0; i < dataset.length; i++) {
            for (let j = 0; j < fieldIndices.length; j++) {
                const row = [];
                row.push(fieldHeadings[j]);
                row.push(dataset.rows[i][fieldIndices[j]].toString());
                for (let k = 0; k < dataset.headings.length; k++) {
                    row.push(dataset.rows[i][k]);
                }
                rows.push(row);
            }
        }

        // Insert _key, _value at start of headings
        const headings = [_key, _value];
        for (let i = 0; i < dataset.headings.length; i++) {
            headings.push(dataset.headings[i]);
        }

        // Column types
        const columnTypes: Core.Data.ColumnType[] = [];
        // Add key type
        columnTypes.push(Core.Data.ColumnType.string);
        // Add value type
        // Iterate field column types
        // If all identical, use that type, otherwise use string
        let valueType = dataset.getColumnType(fieldIndices[0]);
        for (let i = 1; i < fieldIndices.length; i++) {
            if (dataset.getColumnType(fieldIndices[i]) != valueType) {
                valueType = Core.Data.ColumnType.string;
                break;
            }
        }
        columnTypes.push(valueType);
        // Add remaining column types
        for (let i = 0; i < dataset.headings.length; i++) {
            columnTypes.push(dataset.getColumnType(i));
        }

        // Create new dataset
        dataset = new Dataset(headings, rows, columnTypes);
        console.log(`fold ${rows.length} rows ${Core.Time.formatDuration(performance.now() - start)}`);
        return dataset;
    }
}