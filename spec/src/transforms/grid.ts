import * as Core from "core";
import { Dataset } from "../dataset.js";
import { Transform } from "./transform.js";

export class Grid extends Transform {
    transform(): Dataset {
        // Required fields
        let fromX, toX, fromY, toY, stepsX, stepsY;
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
        if (this._transformJSON.steps) {
            // [stepsX, stepsY]
            const steps = this._transformJSON.steps;
            if (Array.isArray(steps) && steps.length == 2) {
                stepsX = steps[0];
                stepsY = steps[1];
            }
        }
        if (fromX == undefined || fromY == undefined || toX == undefined || toY == undefined || !stepsX || !stepsY) {
            return null;
        }

        const start = performance.now();
        let x0 = "x0";
        let y0 = "y0";
        let x1 = "x1";
        let y1 = "y1";
        if (this._transformJSON.as) {
            const as = this._transformJSON.as;
            if (Array.isArray(as) && as.length == 4) {
                x0 = as[0].toString();
                y0 = as[1].toString();
                x1 = as[2].toString();
                y1 = as[3].toString();
            }
        }
        const rows = [];
        // Vertical lines
        const stepSizeX = (toX - fromX) / stepsX;
        for (let x = 0; x <= stepsX; x++) {
            const x0 = fromX + stepSizeX * x;
            const x1 = x0;
            const y0 = fromY;
            const y1 = toY;
            const row = [];
            row.push(x0);
            row.push(y0);
            row.push(x1);
            row.push(y1);
            rows.push(row);
        }
        // Horizontal lines
        const stepSizeY = (toY - fromY) / stepsY;
        for (let y = 0; y <= stepsY; y++) {
            const x0 = fromX;
            const x1 = toX;
            const y0 = fromY + stepSizeY * y;
            const y1 = y0;
            const row = [];
            row.push(x0);
            row.push(y0);
            row.push(x1);
            row.push(y1);
            rows.push(row);
        }
        const headings = [
            x0,
            y0,
            x1,
            y1
        ];
        const columnTypes = [
            Core.Data.ColumnType.float,
            Core.Data.ColumnType.float,
            Core.Data.ColumnType.float,
            Core.Data.ColumnType.float
        ];
        const dataset = new Dataset(headings, rows, columnTypes);
        console.log(`grid ${dataset.length} rows ${Core.Time.formatDuration(performance.now() - start)}`);
        return dataset;
    }
}