// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import * as Core from "core";
import { Dataset } from "../dataset.js";
import { Expression } from "../expression.js";
import { Transform } from "./transform.js";
import { Group } from "../marks/group.js";

export class Filter extends Transform {
    transform(group: Group, dataset: Dataset): Dataset {
        // Required fields
        if (!this._transformJSON.expr) { return dataset; }

        // Break expression into field, operator, value
        const start = performance.now();
        const expr = this._transformJSON.expr;
        const expression = new Expression().parseExpression(expr, group, dataset);
        const rows = [];
        for (let i = 0; i < dataset.length; i++) {
            const keep = expression(group, dataset, i);
            if (keep) { rows.push(dataset.rows[i].slice()); }
        }

        // Create new dataset
        dataset = new Dataset(dataset.headings.slice(), rows, dataset.columnTypes.slice());
        console.log(`filter ${rows.length} rows ${Core.Time.formatDuration(performance.now() - start)}`);
        return dataset;
    }
}