// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

export class Pick {
    protected static _pickId = 1;
    public static get nextPickId(): number {
        return this._pickId++;
    }
}