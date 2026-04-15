// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import * as Core from "core";
import { Dataset } from "../dataset.js";
import { Expression } from "../expression.js";
import { Transform } from "./transform.js";
import { Group } from "../marks/group.js";

export class Formula extends Transform {
    transform(group: Group, dataset: Dataset, readonly: boolean): Dataset {
        // Required fields
        if (!this._transformJSON.expr || !this._transformJSON.as) { return dataset; }

        const start = performance.now();
        if (readonly) { dataset = dataset.clone(); }
        const expr = this._transformJSON.expr;
        const as = this._transformJSON.as;
        const expression = new Expression().parseExpression(expr, group, dataset);

        // Check if column already exists
        const existingIndex = dataset.getColumnIndex(as);
        let isNumeric = true;

        if (existingIndex >= 0) {
            // Overwrite existing column
            for (let i = 0; i < dataset.length; i++) {
                const result = expression(group, dataset, i);
                if (isNaN(result)) { isNumeric = false; }
                dataset.rows[i][existingIndex] = result.toString();
            }
            // Update column type and invalidate caches
            dataset.columnTypes[existingIndex] = isNumeric ? Core.Data.ColumnType.float : Core.Data.ColumnType.string;
            dataset.all.invalidateColumn(existingIndex);
        }
        else {
            // Append new column
            for (let i = 0; i < dataset.length; i++) {
                const result = expression(group, dataset, i);
                if (isNaN(result)) { isNumeric = false; }
                dataset.rows[i].push(result.toString());
            }
            dataset.headings.push(as);
            dataset.columnTypes.push(isNumeric ? Core.Data.ColumnType.float : Core.Data.ColumnType.string);
        }

        console.log(`formula ${expr} ${dataset.length} rows ${Core.Time.formatDuration(performance.now() - start)}`);
        return dataset;
    }
}