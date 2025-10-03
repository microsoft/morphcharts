// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import * as Core from "core";
import { Dataset } from "../dataset.js";
import { Transform } from "./transform.js";

export class Aggregate extends Transform {
    private _countOp(dataset: Dataset, spatialIndices: Uint32Array): { [key: number]: number } {
        const counts: { [key: number]: number } = {};
        for (let i = 0; i < dataset.length; i++) {
            const spatialIndex = spatialIndices[i];
            if (counts[spatialIndex]) {
                counts[spatialIndex] += 1;
            }
            else {
                counts[spatialIndex] = 1;
            }
        }
        return counts;
    }

    private _sumOp(dataset: Dataset, spatialIndices: Uint32Array, columnValues: ArrayLike<number>): { [key: number]: number } {
        const sums: { [key: number]: number } = {};
        for (let i = 0; i < dataset.length; i++) {
            const spatialIndex = spatialIndices[i];
            const value = columnValues[i];
            if (sums[spatialIndex]) {
                sums[spatialIndex] += value;
            }
            else {
                sums[spatialIndex] = value;
            }
        }
        return sums;
    }

    private _meanOp(dataset: Dataset, spatialIndices: Uint32Array, columnValues: ArrayLike<number>): { [key: number]: number } {
        const counts: { [key: number]: number } = {};
        const sums: { [key: number]: number } = {};
        for (let i = 0; i < dataset.length; i++) {
            const spatialIndex = spatialIndices[i];
            const value = columnValues[i];
            if (counts[spatialIndex]) {
                counts[spatialIndex] += 1;
                sums[spatialIndex] += value;
            }
            else {
                counts[spatialIndex] = 1;
                sums[spatialIndex] = value;
            }
        }
        const means: { [key: number]: number } = {};
        for (const spatialIndex in counts) {
            means[spatialIndex] = sums[spatialIndex] / counts[spatialIndex];
        }
        return means;
    }

    transform(dataset: Dataset): Dataset {
        const start = performance.now();

        // TODO: Fields, as, drop
        // TODO: If groupby not specified, aggregate into single row
        // TODO: Add key property for single groupby field to determine group membership instead of multiple groupby fields
        const groupby = this._transformJSON.groupby;
        const groupbyColumnIndices = [];
        const groupbyColumnValues = [];
        const groupbyMultipliers = []; // Spatial index multiplier
        let multiplier = 1;
        for (let i = 0; i < groupby.length; i++) {
            const columnIndex = dataset.getColumnIndex(groupby[i]);
            if (columnIndex == -1) {
                console.log(`groupby column ${groupby[i]} not found`);
                throw new Error(`groupby column ${groupby[i]} not found`);
            }
            else {
                groupbyColumnIndices.push(columnIndex);
                // Force discrete to get count of unique values to allow creation of spatial index
                groupbyColumnValues.push(dataset.all.columnValues(columnIndex, true));
                const distinctValues = dataset.all.distinctStrings(columnIndex).length;
                groupbyMultipliers.push(multiplier);
                multiplier *= distinctValues;
            }
        }

        // Fields
        const fieldColumnNames = [];
        const fieldColumnValues = [];
        if (this._transformJSON.fields && Array.isArray(this._transformJSON.fields)) {
            for (let i = 0; i < this._transformJSON.fields.length; i++) {
                const columnName = this._transformJSON.fields[i];
                const columnIndex = dataset.getColumnIndex(columnName);
                if (columnIndex == -1) {
                    console.log(`field column ${columnName} not found`);
                    throw new Error(`field column ${columnName} not found`);
                }
                else {
                    fieldColumnNames.push(columnName);
                    fieldColumnValues.push(dataset.all.columnValues(columnIndex, false));
                }
            }
        }

        // Ops
        const ops: string[] = [];
        if (this._transformJSON.ops && Array.isArray(this._transformJSON.ops)) {
            for (let i = 0; i < this._transformJSON.ops.length; i++) {
                ops.push(this._transformJSON.ops[i]);
            }
        }

        // As
        const as: string[] = [];
        if (this._transformJSON.as && Array.isArray(this._transformJSON.as)) {
            for (let i = 0; i < this._transformJSON.as.length; i++) {
                as.push(this._transformJSON.as[i]);
            }
        }

        // If no fields and ops specified, use count
        if (!this._transformJSON.fields && !this._transformJSON.ops) {
            ops.push("count");
            if (as.length == 0) { as.push("count"); }
        }

        // Generate spatial indices and generate groupby rows
        const spatialIndices = new Uint32Array(dataset.length);
        const spatialIndexSet = new Set<number>();
        const groupbyColumnsLookup: { [key: number]: string[] } = {};
        for (let i = 0; i < dataset.length; i++) {
            let spatialIndex = 0;
            for (let j = 0; j < groupby.length; j++) {
                const value = groupbyColumnValues[j][i];
                spatialIndex += groupbyMultipliers[j] * value;
            }
            spatialIndices[i] = spatialIndex;

            // Generate groupby row for new indices
            if (!spatialIndexSet.has(spatialIndex)) {
                const row = dataset.rows[i];
                const groupbyColumns = [];
                for (let j = 0; j < groupby.length; j++) {
                    const groupbyValue = row[groupbyColumnIndices[j]];
                    groupbyColumns.push(groupbyValue);
                }
                groupbyColumnsLookup[spatialIndex] = groupbyColumns;
                spatialIndexSet.add(spatialIndex);
            }
        }

        // Calculate aggregate values for each spatial index for each field
        const aggregateValues: { [key: number]: number }[] = [];
        for (let i = 0; i < ops.length; i++) {
            let op = ops[i];
            switch (op) {
                case "count":
                default:
                    aggregateValues.push(this._countOp(dataset, spatialIndices));
                    op = "count"; // Ensure default is set
                    break;
                case "sum":
                    aggregateValues.push(this._sumOp(dataset, spatialIndices, fieldColumnValues[i]));
                    break;
                case "mean":
                    aggregateValues.push(this._meanOp(dataset, spatialIndices, fieldColumnValues[i]));
                    break;
            }
            // Add to as if not enough names specified
            if (as.length == i) { as.push(`${op}_${fieldColumnNames[i]}`); }
        }

        // Write results
        const rows = [];
        for (const spatialIndex of spatialIndexSet) {
            const row = groupbyColumnsLookup[spatialIndex];
            // Add aggregate values for each field
            for (let i = 0; i < aggregateValues.length; i++) {
                row.push(aggregateValues[i][spatialIndex].toString());
            }
            rows.push(row);
        }

        // Headings, columnTypes
        const headings = [];
        const columnTypes: Core.Data.ColumnType[] = [];
        // Groupby
        for (let i = 0; i < groupby.length; i++) {
            const columnIndex = groupbyColumnIndices[i];
            headings.push(groupby[i]);
            columnTypes.push(dataset.columnTypes[columnIndex]);
        }
        // Aggregate fields
        for (let i = 0; i < as.length; i++) {
            headings.push(as[i]);
            columnTypes.push(Core.Data.ColumnType.float);
        }

        // Create new dataset
        dataset = new Dataset(headings, rows, columnTypes);
        console.log(`aggregate ${rows.length} rows ${Core.Time.formatDuration(performance.now() - start)}`);
        return dataset;
    }
}