// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import * as Core from "core";
import { Dataset } from "../dataset.js";
import { Transform } from "./transform.js";
import { Group } from "../marks/group.js";

export class Collect extends Transform {
    // Adds "fields" property over VEGA collect transform
    transform(group: Group, dataset: Dataset): Dataset {
        const start = performance.now();

        // Row indices
        const rowIndices: Uint32Array = new Uint32Array(dataset.length);
        for (let i = 0; i < dataset.length; i++) { rowIndices[i] = i; }

        // Sort
        const sort = this._transformJSON.sort;
        const sortFieldColumnIndices: number[] = [];
        const sortColumnLookups: Uint32Array[] = [];
        const sortOrders: string[] = [];
        if (sort) {
            const fields = sort.field;
            if (fields) {
                if (typeof fields == "string") {
                    const fieldColumnIndex = dataset.getColumnIndex(fields);
                    if (fieldColumnIndex == -1) {
                        throw new Error(`collect transform field ${fields} not found`);
                    }
                    sortFieldColumnIndices.push(fieldColumnIndex);
                }
                else if (Array.isArray(fields)) {
                    for (let i = 0; i < fields.length; i++) {
                        const field = fields[i];
                        const fieldColumnIndex = dataset.getColumnIndex(field);
                        if (fieldColumnIndex == -1) {
                            throw new Error(`collect transform field ${field} not found`);
                        }
                        sortFieldColumnIndices.push(fieldColumnIndex);
                    }
                }
                for (let i = 0; i < sortFieldColumnIndices.length; i++) {
                    const columnIndex = sortFieldColumnIndices[i];

                    const columnType = dataset.columnTypes[columnIndex];
                    const sortColumnLookup = new Uint32Array(dataset.length);
                    switch (columnType) {
                        case Core.Data.ColumnType.string:
                            // Build a lookup table from data values to ordered distinct string values
                            const distinctStrings = dataset.all.distinctStrings(columnIndex);

                            // First build an ordered list of distinct string values
                            let sequence = new Uint32Array(distinctStrings.length);
                            for (let i = 0; i < sequence.length; i++) { sequence[i] = i; }
                            const orderedDistinctStrings = sequence.sort((a, b) => { return distinctStrings[a].localeCompare(distinctStrings[b]); });

                            // Build a lookup table from ordered distinct string values to data values
                            const lookup = new Uint32Array(distinctStrings.length);
                            for (let i = 0; i < orderedDistinctStrings.length; i++) { lookup[orderedDistinctStrings[i]] = i; }
                            const distinctStringValues = dataset.all.columnValues(columnIndex);
                            for (let i = 0; i < rowIndices.length; i++) {
                                sortColumnLookup[i] = lookup[distinctStringValues[i]];
                            }
                            break;
                        case Core.Data.ColumnType.float:
                        case Core.Data.ColumnType.integer:
                        case Core.Data.ColumnType.date:
                        default:
                            const orderedIds = dataset.all.orderedIds(columnIndex);
                            for (let i = 0; i < orderedIds.length; i++) {
                                sortColumnLookup[orderedIds[i]] = i;
                            }
                            break;
                    }
                    sortColumnLookups.push(sortColumnLookup);
                }
            }

            // Orders
            const orders = sort.order;
            if (orders) {
                if (typeof orders == "string") { sortOrders.push(orders); }
                else if (Array.isArray(orders)) { for (let i = 0; i < orders.length; i++) { sortOrders.push(orders[i]); } }
            }
            // Fill remaining orders with ascending
            for (let i = sortOrders.length; i < sortFieldColumnIndices.length; i++) {
                sortOrders.push("ascending");
            }

            // Sort dataset
            if (sortFieldColumnIndices.length > 0) {
                // Sort row indices
                // TODO: Use dataset orderedIds (see band scale sorting for lookup)
                // TODO: Move lookup generation to core filter class, e.g. filter.orderedLookup, which deals with all datatypes
                rowIndices.sort((a, b) => {
                    for (let i = 0; i < sortFieldColumnIndices.length; i++) {
                        const lookup = sortColumnLookups[i];
                        const order = sortOrders[i];
                        const aIndex = lookup[a];
                        const bIndex = lookup[b];
                        if (aIndex < bIndex) {
                            return order == "ascending" ? -1 : 1;
                        }
                        else if (aIndex > bIndex) {
                            return order == "ascending" ? 1 : -1;
                        }
                        // Else equal, try next sort field
                    }
                    // All sort fields equal
                    return 0;
                });
            }
        }

        // Fields
        const fields = this._transformJSON.fields;
        const fieldColumnIndices = [];
        if (fields && Array.isArray(fields)) {
            for (let i = 0; i < fields.length; i++) {
                const field = fields[i];
                const fieldColumnIndex = dataset.getColumnIndex(field);
                if (fieldColumnIndex == -1) {
                    throw new Error(`collect transform field ${field} not found`);
                }
                fieldColumnIndices.push(fieldColumnIndex);
            }
        }
        else {
            // If no fields specified, use all columns
            for (let i = 0; i < dataset.headings.length; i++) {
                fieldColumnIndices.push(i);
            }
        }

        // Headings, column types
        const as = this._transformJSON.as;
        const headings = [];
        const columnTypes: Core.Data.ColumnType[] = [];
        const length = as && Array.isArray(as) ? as.length : 0;
        for (let i = 0; i < fieldColumnIndices.length; i++) {
            const fieldColumnIndex = fieldColumnIndices[i];
            const fieldHeading = i < length ? as[i] : dataset.headings[fieldColumnIndex];
            headings.push(fieldHeading);
            columnTypes.push(dataset.columnTypes[fieldColumnIndex]);
        }

        const rows = [];
        for (let i = 0; i < dataset.length; i++) {
            const index = rowIndices[i];
            const row = [];
            for (let j = 0; j < fieldColumnIndices.length; j++) {
                const fieldColumnIndex = fieldColumnIndices[j];
                row.push(dataset.rows[index][fieldColumnIndex]);
            }
            rows.push(row);
        }

        // Create new dataset
        dataset = new Dataset(headings, rows, columnTypes);
        console.log(`collect ${rows.length} rows ${Core.Time.formatDuration(performance.now() - start)}`);
        return dataset;
    }
}