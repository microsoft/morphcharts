import * as Core from "core";
import { Dataset } from "../dataset.js";
import { Group } from "../marks/group.js";
import { Transform } from "./transform.js";
import * as Projections from "../projections/index.js";

export class Geopoint extends Transform {
    transform(group: Group, dataset: Dataset): Dataset {
        // Required fields (longitude, latitude)
        let columnIndex0, columnValues0, columnIndex1, columnValues1;
        if (this._transformJSON.fields) {
            const fields = this._transformJSON.fields;
            if (Array.isArray(fields) && fields.length == 2) {
                columnIndex0 = dataset.getColumnIndex(fields[0]);
                columnIndex1 = dataset.getColumnIndex(fields[1]);
                if (columnIndex0 != -1) {
                    columnValues0 = dataset.all.columnValues(columnIndex0, false);
                }
                if (columnIndex1 != -1) {
                    columnValues1 = dataset.all.columnValues(columnIndex1, false);
                }
            }
        }
        
        let projection: Projections.IMapProjection;
        if (this._transformJSON.projection) {
            const name = this._transformJSON.projection;
            projection = group.getProjection(name);
        }
        if (!projection || !columnValues0 || !columnValues1) {
            return dataset;
        }

        const start = performance.now();
        let x = "x";
        let y = "y";
        if (this._transformJSON.as) {
            const as = this._transformJSON.as;
            if (Array.isArray(as) && as.length == 2) {
                x = as[0].toString();
                y = as[1].toString();
            }
        }
        let filtered: boolean;
        let rowIds = [];
        for (let i = 0; i < dataset.length; i++) {
            const row = dataset.rows[i];
            const longitude = columnValues0[i];
            const latitude = columnValues1[i];
            const xy = projection.project(longitude, latitude);
            if (!xy) {
                filtered = true;
                continue;
            }
            row.push(xy[0].toString()); // x
            row.push(xy[1].toString()); // y
            rowIds.push(i);
        }

        // If results are clipped, create a new dataset
        if (filtered) {
            const rows = [];
            for (let i = 0; i < rowIds.length; i++) {
                const rowId = rowIds[i];
                rows.push(dataset.rows[rowId].slice());
            }
            const headings = dataset.headings.slice();
            const columnTypes = dataset.columnTypes.slice();
            dataset = new Dataset(headings, rows, columnTypes);
        }

        // Add headings, columnTypes
        dataset.headings.push(x);
        dataset.columnTypes.push(Core.Data.ColumnType.float);
        dataset.headings.push(y);
        dataset.columnTypes.push(Core.Data.ColumnType.float);
        console.log(`geopoint ${dataset.length} rows ${Core.Time.formatDuration(performance.now() - start)}`);
        return dataset;
    }
}