import * as Core from "core";
import { Dataset } from "../dataset.js";
import { Transform } from "./transform.js";

// TODO: Share base class with Aggregate
export class Window extends Transform {
    private _countOp(dataset: Dataset, spatialIndices: Uint32Array, spatialIndex: number, startRow: number, endRow: number): number {
        let count = 0;
        for (let i = startRow; i <= endRow; i++) {
            if (spatialIndices[i] == spatialIndex) { count++; }
        }
        return count;
    }

    private _sumOp(dataset: Dataset, spatialIndices: Uint32Array, spatialIndex: number, startRow: number, endRow: number, columnValues: ArrayLike<number>): number {
        let sum = 0;
        for (let i = startRow; i <= endRow; i++) {
            if (spatialIndices[i] == spatialIndex) { sum += columnValues[i]; }
        }
        return sum;
    }

    private _meanOp(dataset: Dataset, spatialIndices: Uint32Array, spatialIndex: number, startRow: number, endRow: number, columnValues: ArrayLike<number>): number {
        let count = 0;
        let sum = 0;
        for (let i = startRow; i <= endRow; i++) {
            if (spatialIndices[i] == spatialIndex) {
                count++;
                sum += columnValues[i];
            }
        }
        return count > 0 ? sum / count : 0;
    }

    transform(dataset: Dataset, readonly: boolean): Dataset {
        const start = performance.now();
        if (readonly) { dataset = dataset.clone(); }

        // Group
        const spatialIndices = new Uint32Array(dataset.length);
        const groupby = this._transformJSON.groupby;
        if (groupby && Array.isArray(groupby) && groupby.length > 0) {
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

            // Generate spatial indices and generate groupby rows
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
        }
        else {
            // All spatial indices already initialized to 0
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

            // Add to as if not enough names specified
            for (let i = 0; i < ops.length - as.length; i++) {
                as.push(`${ops[i]}_${fieldColumnNames[i]}`);
            }
        }

        // TODO: Support frame
        // TODO: Process one op at a time to reduce number of passes over data, e.g. can use running total for count, sum, mean
        // const frame = this._transformJSON.frame;
        for (let i = 0; i < dataset.length; i++) {
            const row = dataset.rows[i];
            const spatialIndex = spatialIndices[i];
            // Get frame range for this group
            // For now, assume [null, 0] (i.e. all prior rows including current row)
            let startRow = 0;
            let endRow = i;
            for (let k = 0; k < ops.length; k++) {
                let op = ops[k];
                let result: number;
                switch (op) {
                    case "count":
                    default:
                        result = this._countOp(dataset, spatialIndices, spatialIndex, startRow, endRow);
                        break;
                    case "sum":
                        result = this._sumOp(dataset, spatialIndices, spatialIndex, startRow, endRow, fieldColumnValues[k]);
                        break;
                    case "mean":
                        result = this._meanOp(dataset, spatialIndices, spatialIndex, startRow, endRow, fieldColumnValues[k]);
                        break;
                }
                row.push(result.toString());
            }
        }

        // Add headings, columnTypes
        for (let i = 0; i < ops.length; i++) {
            dataset.headings.push(as[i]);
            dataset.columnTypes.push(Core.Data.ColumnType.float);
        }
        console.log(`window ${dataset.length} rows ${Core.Time.formatDuration(performance.now() - start)}`);
        return dataset;
    }
}