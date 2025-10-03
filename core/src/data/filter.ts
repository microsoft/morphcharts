// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import { Csv } from "../csv.js";
import { Time } from "../time.js";
import { ColumnType } from "./dataset.js";

export class Filter {
    protected _ids: Uint32Array;
    protected _headings: string[];
    protected _rows: string[][];
    protected _columnTypes: ColumnType[];
    protected _numericValues: Float64Array[];
    protected _stringValues: Float64Array[];
    protected _distinctStrings: string[][];
    protected _distinctStringValues: { [key: string]: number }[];
    protected _hasMinMaxValues: boolean[];
    protected _hasMinMaxValuesDiscrete: boolean[];
    protected _minValues: number[];
    protected _maxValues: number[];
    protected _minValuesDiscrete: number[];
    protected _maxValuesDiscrete: number[];
    protected _orderedIds: Uint32Array[];
    protected _orderedValues: Float64Array[];
    public get ids() { return this._ids; }

    constructor(ids: Uint32Array, headings: string[], rows: string[][], columnTypes: ColumnType[], numericValues: Float64Array[]) {
        this._ids = ids;
        this._headings = headings;
        this._rows = rows;
        this._columnTypes = columnTypes;
        this._numericValues = numericValues;

        // String arrays
        this._stringValues = new Array(columnTypes.length); // Create on-demand

        // Caches
        this._numericValues = [];
        this._stringValues = [];
        this._minValues = [];
        this._maxValues = [];
        this._minValuesDiscrete = [];
        this._maxValuesDiscrete = [];
        this._distinctStrings = [];
        this._distinctStringValues = [];
        this._hasMinMaxValues = [];
        this._hasMinMaxValuesDiscrete = [];
        this._orderedIds = [];
        this._orderedValues = [];
    }

    public minValue(column: number, isDiscrete: boolean) {
        this._createMinMaxValues(column, isDiscrete); // Ensure generated
        return isDiscrete ? this._minValuesDiscrete[column] : this._minValues[column];
    }

    public maxValue(column: number, isDiscrete: boolean) {
        this._createMinMaxValues(column, isDiscrete); // Ensure generated
        return isDiscrete ? this._maxValuesDiscrete[column] : this._maxValues[column];
    }

    public columnValues(column: number, discrete: boolean = false): Float64Array {
        let values: Float64Array;
        // Force string type for discrete scales
        if (discrete) {
            values = this._createStringValues(column);
        }
        else {
            // Use native column type
            switch (this._columnTypes[column]) {
                case ColumnType.float:
                case ColumnType.integer:
                case ColumnType.date:
                    values = this._createNumericValues(column);
                    break;
                case ColumnType.string:
                    values = this._createStringValues(column);
                    break;
            }
        }
        return values;
    }

    /**
     * Returns distinct strings in data order.
     * @param column string column
     * @returns distinct strings
     */
    public distinctStrings(column: number): string[] {
        this._createStringValues(column); // Ensure generated
        return this._distinctStrings[column];
    }

    /**
     * Returns distinct string values
     * @param column string column
     * @returns distinct string values
     */
    public distinctStringValues(column: number): { [key: string]: number } {
        this._createStringValues(column); // Ensure generated
        return this._distinctStringValues[column];
    }

    /**
     * Returns ids ordered by the given column.
     * String columns are ordered by the first occurance of each string in the data
     * @param column
     */
    public orderedIds(column: number) {
        if (!this._orderedIds[column]) {
            const start = performance.now();
            const orderedIds = new Uint32Array(this._ids);
            const values = this._columnTypes[column] == ColumnType.string ? this._createStringValues(column) : this._createNumericValues(column);
            orderedIds.sort(function (a, b) { return values[a] - values[b] });
            this._orderedIds[column] = orderedIds;
            console.log(`orderedids ${this._headings[column]} ${orderedIds.length} rows ${Time.formatDuration(performance.now() - start)}`);
        }
        return this._orderedIds[column];
    }

    /**
     * Returns values ordered by the given column.
     * String columns are ordered by the first occurance of each string in the data
     * @param column
     */
    public orderedValues(column: number) {
        if (!this._orderedValues[column]) {
            const start = performance.now();
            const values = this._columnTypes[column] == ColumnType.string ? this._createStringValues(column) : this._createNumericValues(column);
            const orderedIds = this.orderedIds(column);
            const orderedValues = new Float64Array(this._ids.length);
            for (let i = 0; i < this._ids.length; i++) {
                orderedValues[i] = values[orderedIds[i]];
            }
            this._orderedValues[column] = orderedValues;
            console.log(`ordered values ${column} ${Time.formatDuration(performance.now() - start)}`);
        }
        return this._orderedValues[column];
    }

    protected _createStringValues(column: number): Float64Array {
        if (!this._stringValues[column]) {
            const type = this._columnTypes[column];
            const stringValues = new Float64Array(this._rows.length);
            const distinctStrings = [];
            const distinctStringValues: { [key: string]: number } = {};
            const set = new Set<string>();
            for (let i = 0; i < this._rows.length; i++) {
                // For dates, use the numeric value as the string value
                const string = type == ColumnType.date ? Date.parse(this._rows[i][column]).toString() : this._rows[i][column];
                let value;
                if (!set.has(string)) {
                    distinctStrings.push(string);
                    value = set.size;
                    distinctStringValues[string] = value;
                    set.add(string);
                }
                else {
                    value = distinctStringValues[string];
                }
                stringValues[i] = value;
            }
            this._distinctStrings[column] = distinctStrings;
            this._distinctStringValues[column] = distinctStringValues;
            this._stringValues[column] = stringValues;

            // Min, max
            this._minValuesDiscrete[column] = 0;
            this._maxValuesDiscrete[column] = this._distinctStrings[column].length - 1;
            this._hasMinMaxValuesDiscrete[column] = true;
        }
        return this._stringValues[column];
    }

    protected _createNumericValues(column: number): Float64Array {
        if (!this._numericValues[column]) {
            // Generate for whole dataset (values don't change when filtered)
            const numericValues = new Float64Array(this._rows.length);
            const type = this._columnTypes[column];
            if (type & (ColumnType.float | ColumnType.integer)) {
                for (let i = 0; i < this._rows.length; i++) {
                    numericValues[i] = parseFloat(this._rows[i][column]);
                }
            }
            else if (type == ColumnType.date) {
                for (let i = 0; i < this._rows.length; i++) {
                    numericValues[i] = Date.parse(this._rows[i][column]);
                }
            }
            this._numericValues[column] = numericValues;
        }
        return this._numericValues[column];
    }

    protected _createMinMaxValues(column: number, isDiscrete: boolean) {
        if (!this._hasMinMaxValues[column]) {
            const type = this._columnTypes[column];
            let min, max;
            if (type == ColumnType.string || isDiscrete) {
                this._createStringValues(column);
                min = 0;
                max = this._distinctStrings[column].length - 1;
            }
            else {
                // Numeric
                const numericValues = this._createNumericValues(column);
                min = Number.MAX_VALUE;
                max = -Number.MAX_VALUE;
                for (let i = 0; i < this._rows.length; i++) {
                    const value = numericValues[i];
                    min = Math.min(min, value);
                    max = Math.max(max, value);
                }
            }
            this._minValues[column] = min;
            this._maxValues[column] = max;
            this._hasMinMaxValues[column] = true;
        }
    }

    public toCSV(columns: number[]): string {
        const csv = new Csv();
        const headings = columns.map(i => this._headings[i]);
        let text = csv.writeLine(headings);
        for (let i = 0; i < this._ids.length; i++) {
            const rowIndex = this._ids[i];
            const row = [];
            for (let j = 0; j < columns.length; j++) {
                const columnIndex = columns[j];
                row.push(this._rows[rowIndex][columnIndex]);
            }
            text += csv.writeLine(row);
        }
        return text;
    }

    public toJSON(columns: number[]): string {
        const headings = columns.map(i => this._headings[i]);
        const rows = [];
        for (let i = 0; i < this._ids.length; i++) {
            const rowIndex = this._ids[i];
            const row: { [key: string]: string | number } = {};
            for (let j = 0; j < columns.length; j++) {
                const columnIndex = columns[j];
                switch (this._columnTypes[columnIndex]) {
                    case ColumnType.date:
                    case ColumnType.string:
                        row[headings[columnIndex]] = this._rows[rowIndex][columnIndex];
                        break;
                    case ColumnType.integer:
                    case ColumnType.float:
                        // Write numeric value to avoid quotes in JSON
                        const numericValues = this._createNumericValues(columnIndex); // Ensure generated
                        row[headings[columnIndex]] = numericValues[rowIndex];
                        break;
                }
            }
            rows.push(row);
        }
        // return JSON.stringify(rows);
        // return JSON.stringify(rows, null, 2);
        return `[\n${rows.map(row => JSON.stringify(row)).join(",\n")}\n]`;
    }
}
