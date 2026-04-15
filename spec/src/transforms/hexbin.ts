// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import * as Core from "core";
import { Dataset } from "../dataset.js";
import { Transform } from "./transform.js";

import { Group } from "../marks/group.js";

export class Hexbin extends Transform {
    transform(group: Group, dataset: Dataset): Dataset {
        // Required fields
        let columnIndexX, columnValuesX, columnIndexY, columnValuesY, fromX, toX, fromY, toY;
        if (this._transformJSON.fields) {
            const fields = this._transformJSON.fields;
            if (Array.isArray(fields) && fields.length == 2) {
                columnIndexX = dataset.getColumnIndex(fields[0]);
                columnIndexY = dataset.getColumnIndex(fields[1]);
                if (columnIndexX == -1) { throw new Error(`hexbin transform field ${fields[0]} not found`); }
                columnValuesX = dataset.all.columnValues(columnIndexX, false);
                if (columnIndexY == -1) { throw new Error(`hexbin transform field ${fields[1]} not found`); }
                columnValuesY = dataset.all.columnValues(columnIndexY, false);
            }
        }
        if (this._transformJSON.extent) {
            // [[x0, y0], [x1, y1]]
            const extent = this._transformJSON.extent;
            if (Array.isArray(extent) && extent.length == 2) {
                if (Array.isArray(extent[0]) && extent[0].length == 2) {
                    if (typeof extent[0][0] == "number") { fromX = extent[0][0]; }
                    else if (typeof extent[0][0] == "object" && extent[0][0].signal) { fromX = group.parseSignalValue(extent[0][0].signal); }
                    if (typeof extent[0][1] == "number") { fromY = extent[0][1]; }
                    else if (typeof extent[0][1] == "object" && extent[0][1].signal) { fromY = group.parseSignalValue(extent[0][1].signal); }
                }
                if (Array.isArray(extent[1]) && extent[1].length == 2) {
                    if (typeof extent[1][0] == "number") { toX = extent[1][0]; }
                    else if (typeof extent[1][0] == "object" && extent[1][0].signal) { toX = group.parseSignalValue(extent[1][0].signal); }
                    if (typeof extent[1][1] == "number") { toY = extent[1][1]; }
                    else if (typeof extent[1][1] == "object" && extent[1][1].signal) { toY = group.parseSignalValue(extent[1][1].signal); }
                }
            }
            else if (typeof extent == "object" && extent.signal) {
                const s = group.parseSignalValue(extent.signal);
                if (Array.isArray(s) && s.length == 2) {
                    if (Array.isArray(s[0]) && s[0].length == 2) { fromX = s[0][0]; fromY = s[0][1]; }
                    if (Array.isArray(s[1]) && s[1].length == 2) { toX = s[1][0]; toY = s[1][1]; }
                }
            }
        }
        if (!columnValuesX || !columnValuesY || fromX == undefined || toX == undefined || fromY == undefined || toY == undefined) {
            return dataset;
        }

        const start = performance.now();
        let x0Column = "x0";
        let x1Column = "x1";
        let y0Column = "y0";
        let y1Column = "y1";
        const as = this._transformJSON.as;
        if (Array.isArray(as)) {
            if (as.length > 0) { x0Column = as[0]; }
            if (as.length > 1) { x1Column = as[1]; }
            if (as.length > 2) { y0Column = as[2]; }
            if (as.length > 3) { y1Column = as[3]; }
        }
        let maxbins = 20;
        if (typeof this._transformJSON.maxbins == "number") { maxbins = this._transformJSON.maxbins; }
        else if (typeof this._transformJSON.maxbins == "object" && this._transformJSON.maxbins.signal) { maxbins = group.parseSignalValue(this._transformJSON.maxbins.signal); }

        // Filter by extents
        const ids: number[] = [];
        for (let i = 0; i < dataset.length; i++) {
            const value0 = columnValuesX[i];
            const value1 = columnValuesY[i];
            if (value0 >= fromX && value0 <= toX && value1 >= fromY && value1 <= toY) { ids.push(i); }
        }

        // Hex bin
        const binIds = new Uint32Array(ids.length);
        const hexBinOptions: Core.IHexBinOptions = {
            ids: ids,
            valuesX: columnValuesX,
            valuesY: columnValuesY,
            minValueX: fromX,
            maxValueX: toX,
            minValueY: fromY,
            maxValueY: toY,
            binsX: maxbins,
            binIds: binIds
        };
        const hexBinResult = Core.Hex.bin(hexBinOptions);
        const hexWidth = Core.Hex.width(hexBinResult.size, hexBinResult.orientation);
        const hexHeight = Core.Hex.height(hexBinResult.size, hexBinResult.orientation);
        const halfWidth = hexWidth / 2;
        const halfHeight = hexHeight / 2;

        // Write rows (values outside of extent are ignored)
        const rows = [];
        for (let i = 0; i < ids.length; i++) {
            const id = ids[i];
            const binId = hexBinResult.binIds[id];
            const binIndex = hexBinResult.lookup[binId];
            const xc = hexBinResult.positionsX[binIndex];
            const yc = hexBinResult.positionsY[binIndex];
            const index = ids[i];
            const row = dataset.rows[index].slice();
            row.push((xc - halfWidth).toString());
            row.push((xc + halfWidth).toString());
            row.push((yc - halfHeight).toString());
            row.push((yc + halfHeight).toString());
            rows.push(row);
        }

        // Add headings, columnTypes
        const headings = dataset.headings.slice();
        const columnTypes = dataset.columnTypes.slice();
        headings.push(x0Column);
        columnTypes.push(Core.Data.ColumnType.float);
        headings.push(x1Column);
        columnTypes.push(Core.Data.ColumnType.float);
        headings.push(y0Column);
        columnTypes.push(Core.Data.ColumnType.float);
        headings.push(y1Column);
        columnTypes.push(Core.Data.ColumnType.float);

        // Create new dataset
        dataset = new Dataset(headings, rows, columnTypes);
        console.log(`hexbin ${dataset.length} rows ${Core.Time.formatDuration(performance.now() - start)}`);
        return dataset;
    }
}