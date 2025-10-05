// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import * as Core from "core";
import { Dataset } from "../dataset.js";
import { Group } from "../marks/group.js";
import { Transform } from "./transform.js";

export class Geopoint3D extends Transform {
    transform(group: Group, dataset: Dataset): Dataset {
        // Required fields (longitude, latitude)
        let fields, columnIndex0, columnValues0, columnIndex1, columnValues1, columnIndex2, columnValues2;
        if (this._transformJSON.fields) {
            fields = this._transformJSON.fields;
            if (Array.isArray(fields) && fields.length >= 2) {
                columnIndex0 = dataset.getColumnIndex(fields[0]);
                columnIndex1 = dataset.getColumnIndex(fields[1]);
                if (columnIndex0 == -1) { throw new Error(`geopoint3d transform field "${fields[0]}" not found`); }
                columnValues0 = dataset.all.columnValues(columnIndex0, false);
                if (columnIndex1 == -1) { throw new Error(`geopoint3d transform field "${fields[1]}" not found`); }
                columnValues1 = dataset.all.columnValues(columnIndex1, false);
            }
        }
        if (!columnValues0 || !columnValues1) { return dataset; }

        // Optional fields (altitude)
        if (fields.length == 3) {
            columnIndex2 = dataset.getColumnIndex(fields[2]);
            if (columnIndex2 == -1) { throw new Error(`geopoint3d transform field "${fields[2]}" not found`); }
            columnValues2 = dataset.all.columnValues(columnIndex2, false);
        }

        // As
        let x = "x";
        let y = "y";
        let z = "z";
        if (this._transformJSON.as) {
            const as = this._transformJSON.as;
            if (Array.isArray(as) && as.length == 3) {
                x = as[0].toString();
                y = as[1].toString();
                z = as[2].toString();
            }
        }

        const start = performance.now();
        const xyz: Core.Vector3 = [0, 0, 0];
        for (let i = 0; i < dataset.length; i++) {
            const row = dataset.rows[i];
            const phi = columnValues0[i];
            const theta = columnValues1[i];
            const r = columnValues2 ? columnValues2[i] : 1; // Default to unit sphere
            Core.Angles.sphericalToCartesian(r, theta, phi, xyz);
            row.push(xyz[0].toString()); // x
            row.push(xyz[1].toString()); // y
            row.push(xyz[2].toString()); // z
        }

        // Add headings, columnTypes
        dataset.headings.push(x);
        dataset.columnTypes.push(Core.Data.ColumnType.float);
        dataset.headings.push(y);
        dataset.columnTypes.push(Core.Data.ColumnType.float);
        dataset.headings.push(z);
        dataset.columnTypes.push(Core.Data.ColumnType.float);
        console.log(`geopoint3d ${dataset.length} rows ${Core.Time.formatDuration(performance.now() - start)}`);
        return dataset;
    }
}