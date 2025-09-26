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
        let isNumeric = true;
        for (let i = 0; i < dataset.length; i++) {
            const row = dataset.rows[i];
            const result = expression(group, dataset, i);
            if (isNaN(result)) { isNumeric = false; }
            row.push(result.toString());
        }

        // Add headings, columnTypes
        dataset.headings.push(as);
        dataset.columnTypes.push(isNumeric ? Core.Data.ColumnType.float : Core.Data.ColumnType.string);
        console.log(`formula ${expr} ${dataset.length} rows ${Core.Time.formatDuration(performance.now() - start)}`);
        return dataset;
    }
}