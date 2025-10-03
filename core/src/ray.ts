// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import { Vector3 } from "./matrix.js";

export class Ray {
    protected _origin: Vector3;
    public get origin() { return this._origin; }
    protected _direction: Vector3;
    public get direction() { return this._direction; }

    constructor() {
        this._origin = [0, 0, 0];
        this._direction = [0, 0, 0];
    }

    public at(t: number, position: Vector3) {
        position[0] = this._origin[0] + t * this._direction[0];
        position[1] = this._origin[1] + t * this._direction[1];
        position[2] = this._origin[2] + t * this._direction[2];
    }
}