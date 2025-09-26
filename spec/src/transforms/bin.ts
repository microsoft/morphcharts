import * as Core from "core";
import { Dataset } from "../dataset.js";
import { Transform } from "./transform.js";
import { Group } from "../marks/group.js";

export class Bin extends Transform {
    transform(group: Group, dataset: Dataset): Dataset {
        // Required fields
        let columnIndex, columnValues, from, to;
        if (this._transformJSON.field) {
            const field = this._transformJSON.field;
            columnIndex = dataset.getColumnIndex(field);
            if (columnIndex != -1) {
                columnValues = dataset.all.columnValues(columnIndex, false);
            }
        }
        if (this._transformJSON.extent) {
            const extent = this._transformJSON.extent;
            if (Array.isArray(extent) && extent.length == 2) {
                if (typeof extent[0] == "number") { from = extent[0]; }
                else if (typeof extent[0] == "object" && extent[0].signal) {
                    from = group.parseSignalValue(extent[0].signal);
                }
                if (typeof extent[1] == "number") { to = extent[1]; }
                else if (typeof extent[1] == "object" && extent[1].signal) {
                    to = group.parseSignalValue(extent[1].signal);
                }
            }
            else if (typeof extent == "object" && extent.signal) {
                const s = group.parseSignalValue(extent.signal);
                if (Array.isArray(s) && s.length == 2) { from = s[0]; to = s[1]; }
            }
        }
        if (!columnValues || from == undefined || to == undefined) { return dataset; }

        const start = performance.now();
        let bin0 = "bin0";
        let bin1 = "bin1";
        if (this._transformJSON.as) {
            const as = this._transformJSON.as;
            if (Array.isArray(as) && as.length == 2) {
                bin0 = as[0].toString();
                bin1 = as[1].toString();
            }
        }
        const width = to - from;

        // Maxbins can be number or signal
        let maxbins: number;
        const maxbinsJSON = this._transformJSON.maxbins;
        if (typeof maxbinsJSON == "number") { maxbins = maxbinsJSON; }
        else if (typeof maxbinsJSON == "object" && maxbinsJSON.signal) {
            maxbins = group.parseSignalValue(maxbinsJSON.signal);
        }
        else {
            maxbins = 20;
        }
        const binFroms = [];
        const binTos = [];
        for (let i = 0; i < maxbins; i++) {
            binFroms.push(from + i / maxbins * width);
            binTos.push(from + (i + 1) / maxbins * width);
        }
        // Write rows (values outside of extent are ignored)
        const rows = [];
        for (let i = 0; i < dataset.length; i++) {
            const value = columnValues[i];
            if (value < from || value > to) { continue; }
            const bin = Math.min(Math.floor((value - from) / width * maxbins), maxbins - 1);
            const row = dataset.rows[i].slice();
            row.push(binFroms[bin].toString()); // bin0
            row.push(binTos[bin].toString()); // bin1
            rows.push(row);
        }

        // Add headings, columnTypes
        const headings = dataset.headings.slice();
        const columnTypes = dataset.columnTypes.slice();
        headings.push(bin0);
        columnTypes.push(Core.Data.ColumnType.float);
        headings.push(bin1);
        columnTypes.push(Core.Data.ColumnType.float);

        // Create new dataset
        dataset = new Dataset(headings, rows, columnTypes);
        console.log(`bin ${dataset.length} rows ${Core.Time.formatDuration(performance.now() - start)}`);
        return dataset;
    }
}