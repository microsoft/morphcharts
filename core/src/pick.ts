// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import { Dataset } from "./data/dataset.js";

export interface IPickInfo {
    dataset: Dataset;
    rowIndex: number;
}

export class Pick {
    protected static _pickId = 1;
    protected static _map = new Map<number, IPickInfo>();

    /** Allocate and return the next unique pick ID */
    public static get nextPickId(): number {
        return this._pickId++;
    }

    /** Look up the dataset and row index for a given pick ID */
    public static get(pickId: number): IPickInfo | undefined {
        return this._map.get(pickId);
    }

    /** Register all pick IDs in a buffer, mapping each to its dataset row */
    public static registerBuffer(pickIds: ArrayLike<number>, ids: ArrayLike<number>, dataset: Dataset): void {
        for (let i = 0; i < pickIds.length; i++) {
            this._map.set(pickIds[i], { dataset, rowIndex: ids[i] });
        }
    }

    /** Clear registrations and reset the pick ID counter */
    public static reset(): void {
        this._pickId = 1;
        this._map.clear();
    }
}