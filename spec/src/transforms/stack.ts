// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import * as Core from "core";
import { Dataset } from "../dataset.js";
import { Transform } from "./transform.js";

export class Stack extends Transform {
    transform(dataset: Dataset, readonly: boolean): Dataset {
        const start = performance.now();
        if (readonly) {
            dataset = dataset.clone();
        }

        let _y0 = "y0";
        let _y1 = "y1";
        const as = this._transformJSON.as;
        if (as && Array.isArray(as)) {
            _y0 = as[0].toString();
            if (as.length > 0) { _y1 = as[1].toString(); }
        }

        // TODO: Offset parameter

        // Sort (compare function with field and order)
        let orderedIds: ArrayLike<number>;
        if (this._transformJSON.sort) {
            const sort = this._transformJSON.sort;
            if (sort.field) {
                const columnIndex = dataset.getColumnIndex(sort.field);
                if (columnIndex == -1) { throw new Error(`stack transform sort field ${sort.field} not found`); }
                orderedIds = dataset.all.orderedIds(columnIndex);
                // Order
                if (sort.order && sort.order.toLowerCase() == "descending") {
                    orderedIds = Array.from(orderedIds).reverse(); // Reverse order
                }
            }
        }
        else { orderedIds = dataset.all.ids; } // No sort, use original order

        // Field
        const field = this._transformJSON.field;
        let columnValues;
        if (field) {
            const columnIndex = dataset.getColumnIndex(field);
            if (columnIndex == -1) { throw new Error(`stack transform field ${field} not found`); }
            columnValues = dataset.all.columnValues(columnIndex, false);
        }

        const groupby = this._transformJSON.groupby || [];
        const groupbyColumnIndices = [];
        const groupbyColumnValues = [];
        const groupbyMultipliers = []; // Spatial index multiplier
        let multiplier = 1;
        for (let i = 0; i < groupby.length; i++) {
            const columnIndex = dataset.getColumnIndex(groupby[i]);
            if (columnIndex == -1) { throw new Error(`stack transform groupby field ${groupby[i]} not found`); }
            groupbyColumnIndices.push(columnIndex);
            // Force discrete to get count of unique values to allow creation of spatial index
            groupbyColumnValues.push(dataset.all.columnValues(columnIndex, true));
            const distinctValues = dataset.all.distinctStrings(columnIndex).length;
            groupbyMultipliers.push(multiplier);
            multiplier *= distinctValues;
        }

        const spatialIndices = new Array(dataset.length);
        const totals: { [key: number]: number } = {};
        for (let i = 0; i < dataset.length; i++) {
            const index = orderedIds[i]; // Use ordered index
            // Generate spatial indices and add to lookup
            let spatialIndex = 0;
            for (let j = 0; j < groupby.length; j++) {
                const value = groupbyColumnValues[j][index];
                spatialIndex += groupbyMultipliers[j] * value;
            }
            spatialIndices[i] = spatialIndex;

            // Sum values for each spatial index and write y0, y1
            const value = columnValues ? columnValues[index] : 1; // Unit stack if no value column
            const row = dataset.rows[index];
            let y0, y1;
            if (totals[spatialIndex]) {
                y0 = totals[spatialIndex];
                totals[spatialIndex] += value;
                y1 = y0 + value;
            }
            else {
                y0 = 0;
                totals[spatialIndex] = value;
                y1 = value;
            }
            row.push(y0.toString());
            row.push(y1.toString());
        }

        // Add headings, columnTypes
        dataset.headings.push(_y0);
        dataset.columnTypes.push(Core.Data.ColumnType.float);
        dataset.headings.push(_y1);
        dataset.columnTypes.push(Core.Data.ColumnType.float);
        console.log(`stack ${dataset.length} rows ${Core.Time.formatDuration(performance.now() - start)}`);
        return dataset;
    }
}