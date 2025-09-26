import * as Core from "core";
import { Dataset } from "../dataset.js";
import { Transform } from "./transform.js";
import { Group } from "../marks/group.js";

export class UnitStack extends Transform {
    transform(group: Group, dataset: Dataset, readonly: boolean): Dataset {
        // Required fields
        const groupby = this._transformJSON.groupby;
        if (!groupby) { return dataset; }
        const groupbyColumnIndices = [];
        const groupbyColumnValues = [];
        const groupbyMultipliers = [];

        // Optional fields
        // TODO: sort, offset parameters
        const start = performance.now();
        if (readonly) { dataset = dataset.clone(); }

        // Width and depth of each stack (in arbirary units)
        let width = 1, depth = 1;
        if (this._transformJSON.width) {
            if (typeof this._transformJSON.width == "object" && this._transformJSON.width.signal) {
                width = group.parseSignalValue(this._transformJSON.width.signal);
            }
            else if (typeof this._transformJSON.width == "number") { width = this._transformJSON.width; }
        }
        if (this._transformJSON.depth) {
            if (typeof this._transformJSON.depth == "object" && this._transformJSON.depth.signal) {
                depth = group.parseSignalValue(this._transformJSON.depth.signal);
            }
            else if (typeof this._transformJSON.depth == "number") { depth = this._transformJSON.depth; }
        }

        // Number of units per in x, z directions
        let x = 1, z = 1;
        if (this._transformJSON.x) {
            if (typeof this._transformJSON.x == "object" && this._transformJSON.x.signal) {
                x = group.parseSignalValue(this._transformJSON.x.signal);
            }
            else if (typeof this._transformJSON.x == "number") { x = this._transformJSON.x; }
        }
        if (this._transformJSON.z) {
            if (typeof this._transformJSON.z == "object" && this._transformJSON.z.signal) {
                z = group.parseSignalValue(this._transformJSON.z.signal);
            }
            else if (typeof this._transformJSON.z == "number") { z = this._transformJSON.z; }
        }

        // Padding in x, z directions, specified as a number of units (same units as width, depth)
        let paddingX = 0, paddingZ = 0;
        if (this._transformJSON.paddingX) {
            if (typeof this._transformJSON.paddingX == "object" && this._transformJSON.paddingX.signal) {
                paddingX = group.parseSignalValue(this._transformJSON.paddingX.signal);
            }
            else if (typeof this._transformJSON.paddingX == "number") { paddingX = this._transformJSON.paddingX; }
        }
        if (this._transformJSON.paddingZ) {
            if (typeof this._transformJSON.paddingZ == "object" && this._transformJSON.paddingZ.signal) {
                paddingZ = group.parseSignalValue(this._transformJSON.paddingZ.signal);
            }
            else if (typeof this._transformJSON.paddingZ == "number") {
                paddingZ = this._transformJSON.paddingZ;
            }
        }

        // As
        let y0 = "y0";
        let y1 = "y1";
        let x0 = "x0";
        let x1 = "x1";
        let z0 = "z0";
        let z1 = "z1";
        const as = this._transformJSON.as;
        if (as && Array.isArray(as)) {
            y0 = as[0].toString();
            if (as.length > 1) { y1 = as[1].toString(); }
            if (as.length > 2) { x0 = as[2].toString(); }
            if (as.length > 3) { x1 = as[3].toString(); }
            if (as.length > 4) { z0 = as[4].toString(); }
            if (as.length > 5) { z1 = as[5].toString(); }
        }

        // Sort (compare function with field and order)
        let orderedIds: ArrayLike<number>;
        if (this._transformJSON.sort) {
            const sort = this._transformJSON.sort;
            if (sort.field) {
                const columnIndex = dataset.getColumnIndex(sort.field);
                if (columnIndex != -1) {
                    orderedIds = dataset.all.orderedIds(columnIndex);
                    // Order
                    if (sort.order && sort.order.toLowerCase() == "descending") {
                        orderedIds = Array.from(orderedIds).reverse(); // Reverse order
                    }
                }
            }
        }
        else { orderedIds = dataset.all.ids; } // No sort, use original order

        // Spatial index for groupby
        let multiplier = 1;
        for (let i = 0; i < groupby.length; i++) {
            const columnIndex = dataset.getColumnIndex(groupby[i]);
            if (columnIndex != -1) {
                groupbyColumnIndices.push(columnIndex);
                // Force discrete to get count of unique values to allow creation of spatial index
                groupbyColumnValues.push(dataset.all.columnValues(columnIndex, true));
                const distinctValues = dataset.all.distinctStrings(columnIndex).length;
                groupbyMultipliers.push(multiplier);
                multiplier *= distinctValues;
            }
        }
        const spatialIndices = new Array(dataset.length);
        const counts: { [key: number]: number } = {};
        const unitX = width / (x + paddingX);
        const unitZ = depth / (z + paddingZ);
        for (let i = 0; i < dataset.length; i++) {
            const index = orderedIds[i]; // Use ordered index
            // Generate spatial indices and add to lookup
            let spatialIndex = 0;
            for (let j = 0; j < groupby.length; j++) {
                const value = groupbyColumnValues[j][index];
                spatialIndex += groupbyMultipliers[j] * value;
            }
            spatialIndices[i] = spatialIndex;

            // Sum values for each spatial index and write x0, y0, y0, y1, z0, z1
            const row = dataset.rows[index];
            let y0: number, y1: number, x0: number, x1: number, z0: number, z1: number;
            if (counts[spatialIndex]) {
                const count = counts[spatialIndex];
                y0 = Math.floor(count / (x * z));
                y1 = y0 + 1;
                x0 = ((count % x) + 0.5 * paddingX) * unitX;
                x1 = x0 + unitX;
                z0 = (Math.floor(count / x) % z + 0.5 * paddingZ) * unitZ;
                z1 = z0 + unitZ;
                counts[spatialIndex] += 1;
            }
            else {
                counts[spatialIndex] = 1;
                y0 = 0;
                y1 = 1;
                x0 = (0.5 * paddingX) * unitX;
                x1 = x0 + unitX;
                z0 = (0.5 * paddingZ) * unitZ;
                z1 = z0 + unitZ;
            }
            row.push(y0.toString());
            row.push(y1.toString());
            row.push(x0.toString());
            row.push(x1.toString());
            row.push(z0.toString());
            row.push(z1.toString());
        }

        // Add headings, columnTypes
        dataset.headings.push(y0);
        dataset.columnTypes.push(Core.Data.ColumnType.float);
        dataset.headings.push(y1);
        dataset.columnTypes.push(Core.Data.ColumnType.float);
        dataset.headings.push(x0);
        dataset.columnTypes.push(Core.Data.ColumnType.float);
        dataset.headings.push(x1);
        dataset.columnTypes.push(Core.Data.ColumnType.float);
        dataset.headings.push(z0);
        dataset.columnTypes.push(Core.Data.ColumnType.float);
        dataset.headings.push(z1);
        dataset.columnTypes.push(Core.Data.ColumnType.float);
        console.log(`unitstack ${dataset.length} rows ${Core.Time.formatDuration(performance.now() - start)}`);
        return dataset;
    }
}