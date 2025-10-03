// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import * as Core from "core";
import { Dataset } from "../dataset.js";
import { Transform } from "./transform.js";
import { Group } from "../marks/group.js";

export class Lookup extends Transform {
    transform(group: Group, dataset: Dataset): Dataset {
        // Required fields
        const start = performance.now();
        if (!this._transformJSON.key || !this._transformJSON.fields) { return dataset; }

        // Lookup data source
        let lookupDataset: Dataset;
        const from = this._transformJSON.from;
        if (from) {
            lookupDataset = group.getDataset(from);
            if (!lookupDataset) {
                console.log(`lookup dataset ${from} not found`);
                return dataset;
            }
        }
        else {
            // Use current dataset as lookup
            lookupDataset = dataset;
        }

        // Key field of lookup data source
        const key = this._transformJSON.key;
        const keyColumnIndex = lookupDataset.getColumnIndex(key);
        if (keyColumnIndex == -1) {
            console.log(`lookup key column ${key} not found`);
            throw new Error(`lookup key column ${key} not found`);
        }

        // Fields: string[], data fields to lookup
        // TODO: Multiple fields
        const fields = this._transformJSON.fields;
        let fieldColumnIndex: number;
        if (!Array.isArray(fields) || fields.length == 0) {
            console.log(`lookup fields not specified or empty`);
            return dataset;
        }
        else {
            fieldColumnIndex = dataset.getColumnIndex(fields[0]);
            if (fieldColumnIndex == -1) {
                console.log(`lookup field column ${fields[0]} not found`);
                throw new Error(`lookup field column ${fields[0]} not found`);
            }
        }

        // Optional fields
        // values to lookup, defaults to all except key
        const values = this._transformJSON.values;
        const valueColumnIndices = [];
        if (values && Array.isArray(values)) {
            for (let i = 0; i < values.length; i++) {
                const value = values[i];
                const valueColumnIndex = lookupDataset.getColumnIndex(value);
                if (valueColumnIndex == -1) {
                    console.log(`lookup value column ${value} not found`);
                    throw new Error(`lookup value column ${value} not found`);
                }
                else { valueColumnIndices.push(valueColumnIndex); }
            }
        }
        else {
            // // Default to all columns except key
            // for (let i = 0; i < lookupDataset.headings.length; i++) {
            //     if (i !== keyColumnIndex) { valueColumnIndices.push(i); }
            // }
            // Default to all columns
            for (let i = 0; i < lookupDataset.headings.length; i++) {
                valueColumnIndices.push(i);
            }
        }

        // lookup field names, defaults to original names
        const as = this._transformJSON.as;
        const headings = dataset.headings.slice(); // Copy original headings
        const columnTypes = dataset.columnTypes.slice(); // Copy original column types
        if (as && Array.isArray(as) && as.length == valueColumnIndices.length) {
            // Use specified headings
            for (let i = 0; i < valueColumnIndices.length; i++) {
                const valueColumnIndex = valueColumnIndices[i];
                const valueHeading = as[i];
                headings.push(valueHeading);
                columnTypes.push(lookupDataset.columnTypes[valueColumnIndex]);
            }
        }
        else {
            // Default to original headings
            for (let i = 0; i < valueColumnIndices.length; i++) {
                const valueColumnIndex = valueColumnIndices[i];
                const valueHeading = lookupDataset.headings[valueColumnIndex];
                headings.push(valueHeading);
                columnTypes.push(lookupDataset.columnTypes[valueColumnIndex]);
            }
        }

        // Order lookup column by key
        const lookupKeyColumnIndex = lookupDataset.getColumnIndex(key);
        const lookupKeyColumnOrderedIds = lookupDataset.all.orderedIds(lookupKeyColumnIndex)
        const rows: string[][] = [];

        // Seperate implemations for number/date and string key columns
        switch (lookupDataset.columnTypes[keyColumnIndex]) {
            case Core.Data.ColumnType.integer:
            case Core.Data.ColumnType.float:
            case Core.Data.ColumnType.date:
                const fieldColumnValues = dataset.all.columnValues(fieldColumnIndex, false);
                const lookupKeyColumnValues = lookupDataset.all.columnValues(lookupKeyColumnIndex, false);
                for (let i = 0; i < dataset.length; i++) {
                    // Lookup value
                    const fieldColumnValue = fieldColumnValues[i];

                    // Binary search column values, using ordered ids
                    let left = 0;
                    let right = lookupDataset.length - 1;
                    while (left <= right) {
                        const mid = Math.floor((left + right) / 2);
                        // Key value
                        const lookupKeyValue = lookupKeyColumnValues[lookupKeyColumnOrderedIds[mid]];
                        if (lookupKeyValue == fieldColumnValue) {
                            // Copy original row
                            const row = dataset.rows[i].slice();

                            // Add values from lookup dataset to row
                            for (let j = 0; j < valueColumnIndices.length; j++) {
                                const valueColumnIndex = valueColumnIndices[j];
                                const value = lookupDataset.rows[lookupKeyColumnOrderedIds[mid]][valueColumnIndex];
                                row.push(value.toString());
                            }
                            rows.push(row);

                            // Find first match only
                            break;
                        }
                        else if (lookupKeyValue < fieldColumnValue) { left = mid + 1; } // Search in the right half
                        else { right = mid - 1; } // Search in the left half
                    }
                }
                break;
            case Core.Data.ColumnType.string:
            default:
                for (let i = 0; i < dataset.length; i++) {
                    // Lookup value
                    const fieldColumnValue = dataset.rows[i][fieldColumnIndex];

                    // Binary search column values, using ordered ids
                    let left = 0;
                    let right = lookupDataset.length - 1;
                    while (left <= right) {
                        const mid = Math.floor((left + right) / 2);
                        // Key value
                        const lookupKeyValue = lookupDataset.rows[lookupKeyColumnOrderedIds[mid]][lookupKeyColumnIndex];
                        if (lookupKeyValue == fieldColumnValue) {
                            // Copy original row
                            const row = dataset.rows[i].slice();

                            // Add values from lookup dataset to row
                            for (let j = 0; j < valueColumnIndices.length; j++) {
                                const valueColumnIndex = valueColumnIndices[j];
                                const value = lookupDataset.rows[lookupKeyColumnOrderedIds[mid]][valueColumnIndex];
                                row.push(value.toString());
                            }
                            rows.push(row);

                            // Find first match only
                            break;
                        }
                        else if (lookupKeyValue < fieldColumnValue) { left = mid + 1; } // Search in the right half
                        else { right = mid - 1; } // Search in the left half
                    }
                }
        }

        // Create new dataset
        dataset = new Dataset(headings, rows, columnTypes);
        console.log(`lookup ${dataset.length} rows ${Core.Time.formatDuration(performance.now() - start)}`);
        return dataset;
    }
}