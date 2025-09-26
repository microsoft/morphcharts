import * as Core from "core";
import { Dataset } from "../dataset.js";
import { Transform } from "./transform.js";

export class Hexbin extends Transform {
    transform(dataset: Dataset): Dataset {
        // Required fields
        let columnIndexX, columnValuesX, columnIndexY, columnValuesY, fromX, toX, fromY, toY;
        if (this._transformJSON.fields) {
            const fields = this._transformJSON.fields;
            if (Array.isArray(fields) && fields.length == 2) {
                columnIndexX = dataset.getColumnIndex(fields[0]);
                columnIndexY = dataset.getColumnIndex(fields[1]);
                if (columnIndexX != -1) {
                    columnValuesX = dataset.all.columnValues(columnIndexX, false);
                }
                if (columnIndexY != -1) {
                    columnValuesY = dataset.all.columnValues(columnIndexY, false);
                }
            }
        }
        if (this._transformJSON.extent) {
            // [[x0, y0], [x1, y1]]
            const extent = this._transformJSON.extent;
            if (Array.isArray(extent) && extent.length == 2) {
                if (Array.isArray(extent[0]) && extent[0].length == 2) {
                    fromX = extent[0][0];
                    fromY = extent[0][1];
                }
                if (Array.isArray(extent[1]) && extent[1].length == 2) {
                    toX = extent[1][0];
                    toY = extent[1][1];
                }
            }
        }
        if (!columnValuesX || !columnValuesY || fromX == undefined || toX == undefined || fromY == undefined || toY == undefined) {
            return dataset;
        }

        const start = performance.now();
        let xc = "xc";
        let yc = "yc";
        let size = "size";
        if (this._transformJSON.as) {
            const as = this._transformJSON.as;
            if (Array.isArray(as) && as.length == 3) {
                xc = as[0].toString();
                yc = as[1].toString();
                size = as[2].toString();
            }
        }
        const maxbins = this._transformJSON.maxbins || 20;

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
        const hexHeight = Core.Hex.height(hexBinResult.size, hexBinResult.orientation);

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
            row.push(xc.toString());
            row.push(yc.toString());
            row.push(hexHeight.toString());
            rows.push(row);
        }

        // Add headings, columnTypes
        const headings = dataset.headings.slice();
        const columnTypes = dataset.columnTypes.slice();
        headings.push(xc);
        columnTypes.push(Core.Data.ColumnType.float);
        headings.push(yc);
        columnTypes.push(Core.Data.ColumnType.float);
        headings.push(size);
        columnTypes.push(Core.Data.ColumnType.float);

        // Create new dataset
        dataset = new Dataset(headings, rows, columnTypes);
        console.log(`hexbin ${dataset.length} rows ${Core.Time.formatDuration(performance.now() - start)}`);
        return dataset;
    }
}