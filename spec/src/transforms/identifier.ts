import * as Core from "core";
import { Dataset } from "../dataset.js";
import { Transform } from "./transform.js";

export class Identifier extends Transform {
    // Unique identifier
    private static _id = 1;
    public static nextId() { return this._id++; }
    public static reset() { this._id = 1; }

    transform(dataset: Dataset, readonly: boolean): Dataset {
        const start = performance.now();
        const id = this._transformJSON.as || "id";
        if (readonly) {
            dataset = dataset.clone();
        }
        for (let i = 0; i < dataset.length; i++) {
            const row = dataset.rows[i];
            row.push(Identifier.nextId().toString());
        }
        dataset.headings.push(id);
        dataset.columnTypes.push(Core.Data.ColumnType.integer);
        console.log(`identifier ${dataset.length} rows ${Core.Time.formatDuration(performance.now() - start)}`);
        return dataset;
    }
}