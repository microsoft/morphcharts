import * as Core from "core";
import { Dataset } from "../dataset.js";
import { Transform } from "./transform.js";

export interface IHierarchy {
    childIds: Uint32Array,
    parentIds: Uint32Array,
    rootIds: number[],
    indices: { [key: number]: number },
    children: { [key: number]: number[] }
}

export class Stratify extends Transform {
    transform(dataset: Dataset): IHierarchy {
        // Required fields
        if (!this._transformJSON.key || !this._transformJSON.parentKey) { return null; }

        const start = performance.now();
        const key = this._transformJSON.key;
        const parentKey = this._transformJSON.parentKey;
        // Both key and parent keys must be same datatype
        const keyColumnIndex = dataset.getColumnIndex(key);
        const parentKeyColumnIndex = dataset.getColumnIndex(parentKey);
        const keyValues = new Uint32Array(dataset.all.columnValues(keyColumnIndex, false));
        const parentKeyValues = new Uint32Array(dataset.all.columnValues(parentKeyColumnIndex, false));
        if (dataset.columnTypes[dataset.getColumnIndex(key)] == Core.Data.ColumnType.string) {
            const keyDistinctStringValues = dataset.all.distinctStringValues(keyColumnIndex);
            const parentKeyDistinctStrings = dataset.all.distinctStrings(parentKeyColumnIndex);
            for (let i = 0; i < parentKeyValues.length; i++) {
                // Re-map parent key string values to numeric values of equivalent key string values
                parentKeyValues[i] = keyDistinctStringValues[parentKeyDistinctStrings[parentKeyValues[i]]];
            }
        }
        const ids = new Uint32Array(dataset.length);
        for (let k = 0; k < dataset.length; k++) { ids[k] = k; }
        const relationships = this._buildRelationships(ids, keyValues, parentKeyValues);
        console.log(`stratify ${ids.length} rows ${Core.Time.formatDuration(performance.now() - start)}`);
        return relationships;
    }

    private _buildRelationships(ids: Uint32Array, keyValues: Uint32Array, parentKeyValues: Uint32Array): IHierarchy {
        const rootIds: number[] = [];
        const indices: { [key: number]: number } = {};
        const children: { [key: number]: number[] } = {};
        for (let i = 0; i < ids.length; i++) {
            const index = ids[i];
            const parentId = parentKeyValues[index];
            const childId = keyValues[index];
            indices[childId] = index;
            if (children[parentId] == undefined) {
                children[parentId] = [];
            }
            if (parentId < 0 || parentId == childId) {
                rootIds.push(parentId);
            }
            else {
                children[parentId].push(childId);
            }
        }
        return {
            rootIds: rootIds,
            indices: indices,
            childIds: keyValues,
            parentIds: parentKeyValues,
            children: children
        };
    }
}