import { Filter } from "./filter.js";

export const ColumnType = {
    none: 0,
    float: 1,
    integer: 2,
    string: 4,
    date: 8,
    continuous: 9, // float | date
    discrete: 6, // integer | string
    numeric: 11 // float | integer | date
} as const;
export type ColumnType = (typeof ColumnType)[keyof typeof ColumnType];

export class Dataset {
    protected _headings: string[];
    protected _rows: string[][];
    protected _columnTypes: ColumnType[];
    protected _numericValues: Float64Array[];
    public get columnTypes() { return this._columnTypes; }
    public get headings() { return this._headings; }
    public get rows() { return this._rows; }
    public get length() { return this._rows.length; }

    // Filters
    protected _all: Filter;
    public get all() { return this._all; }
    public filter: Filter;

    public getColumnType(column: number) {
        return this._columnTypes[column];
    }

    public createFilter(ids: Uint32Array): Filter {
        return new Filter(ids, this._headings, this._rows, this._columnTypes, this._numericValues);
    }

    public getColumnIndex(name: string): number {
        return this._headings.indexOf(name);
    }

    constructor(headings: string[], rows: string[][], columnTypes: ColumnType[]) {
        this._headings = headings;
        this._rows = rows;
        this._columnTypes = columnTypes;

        // Numeric arrays
        this._numericValues = new Array(columnTypes.length); // Create on-demand

        // Default filter
        const indices = new Uint32Array(rows.length);
        for (let i = 0; i < rows.length; i++) { indices[i] = i; } // Zero-based, contiguous ids
        this._all = this.createFilter(indices);
    }

    public static inferTypes(data: string[][], firstRow = 0, maxRows = Number.MAX_VALUE): ColumnType[] {
        const columnTypes: ColumnType[] = [];
        // Get compatible types
        // First row
        const types = [];
        const integers = [];
        let values = data[firstRow];
        let parsedFloat, parsedDate;
        for (let i = 0; i < values.length; i++) {
            const value = values[i];
            parsedFloat = Number(value); // Use Number rather than parseFloat, e.g. Number("2021-01-01") = NaN, parseFloat = 2021.
            parsedDate = Date.parse(value);
            let integer = false;
            let type;
            if (!isNaN(parsedFloat)) {
                // Possible float column
                type = ColumnType.float;

                // Possible integer column
                integer = Number.isSafeInteger(parsedFloat);
            }
            else if (!isNaN(parsedDate)) {
                // Possible date column
                type = ColumnType.date;
            }
            else {
                type = ColumnType.string
            }
            types.push(type);
            integers.push(integer);
        }

        // Remaining rows
        for (let i = firstRow + 1; i < Math.min(data.length, firstRow + maxRows); i++) {
            values = data[i];
            for (let j = 0; j < values.length; j++) {
                // Ignore string columns
                if (types[j] != ColumnType.string) {
                    const value = values[j];
                    parsedFloat = Number(value);
                    if (types[j] == ColumnType.float) {
                        if (isNaN(parsedFloat)) {
                            types[j] = ColumnType.string;
                            integers[j] = false;
                        }
                        else if (integers[j]) { // Don't need to check if any previous value wasn't an integer
                            integers[j] = Number.isSafeInteger(parsedFloat);
                        }
                    }
                    else if (types[j] == ColumnType.date) {
                        parsedDate = Date.parse(value);
                        if (isNaN(parsedDate)) {
                            types[j] = ColumnType.string;
                        }
                    }
                }
            }
        }
        const compatibleTypes: ColumnType[] = [];
        for (let i = 0; i < types.length; i++) {
            // Everything can be a string
            let compatible = (types[i] | ColumnType.string) as ColumnType;
            if (integers[i]) {
                compatible |= ColumnType.integer;
            }
            compatibleTypes.push(compatible);
        }

        for (let i = 0; i < compatibleTypes.length; i++) {
            let columnType;
            const compatibleType = compatibleTypes[i];
            if (compatibleType & ColumnType.integer) {
                columnType = ColumnType.integer;
            }
            else if (compatibleType & ColumnType.float) {
                columnType = ColumnType.float;
            }
            else if (compatibleType & ColumnType.date) {
                columnType = ColumnType.date;
            }
            else {
                columnType = ColumnType.string;
            }
            columnTypes.push(columnType);
        }
        return columnTypes;
    }
}