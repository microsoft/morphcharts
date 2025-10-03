// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import { Quaternion, vector3, Vector3 } from "./matrix.js";
import { Cube } from "./meshes/cube.js";
import { Bounds } from "./bounds.js";
import { Ray } from "./ray.js";

export class AABB {
    private _min: Vector3;
    private _max: Vector3;
    public get min() { return this._min; }
    public get max() { return this._max; }

    constructor() {
        this._min = [Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE];
        this._max = [-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE];
    }

    public centroid(out: Vector3): void {
        out[0] = (this._min[0] + this._max[0]) / 2;
        out[1] = (this._min[1] + this._max[1]) / 2;
        out[2] = (this._min[2] + this._max[2]) / 2;
    }

    public size(out: Vector3): void {
        out[0] = this._max[0] - this._min[0];
        out[1] = this._max[1] - this._min[1];
        out[2] = this._max[2] - this._min[2];
    }

    // Normalize point from min [0, 0, 0] to max [1, 1, 1];
    public normalize(point: Vector3, out: Vector3): void {
        out[0] = (point[0] - this._min[0]) / (this._max[0] - this._min[0]);
        out[1] = (point[1] - this._min[1]) / (this._max[1] - this._min[1]);
        out[2] = (point[2] - this._min[2]) / (this._max[2] - this._min[2]);
    }

    public unionBounds(bounds: AABB): void {
        this._min[0] = Math.min(this._min[0], bounds.min[0]);
        this._min[1] = Math.min(this._min[1], bounds.min[1]);
        this._min[2] = Math.min(this._min[2], bounds.min[2]);
        this._max[0] = Math.max(this._max[0], bounds.max[0]);
        this._max[1] = Math.max(this._max[1], bounds.max[1]);
        this._max[2] = Math.max(this._max[2], bounds.max[2]);
    }

    public unionPoint(point: Vector3): void {
        this._min[0] = Math.min(this._min[0], point[0]);
        this._min[1] = Math.min(this._min[1], point[1]);
        this._min[2] = Math.min(this._min[2], point[2]);
        this._max[0] = Math.max(this._max[0], point[0]);
        this._max[1] = Math.max(this._max[1], point[1]);
        this._max[2] = Math.max(this._max[2], point[2]);
    }

    public maximumExtent(): number {
        // Diagonal
        const dx = this._max[0] - this._min[0];
        const dy = this._max[1] - this._min[1];
        const dz = this._max[2] - this._min[2];
        if (dx > dy && dx > dz)
            return 0;
        else if (dy > dz) {
            return 1;
        }
        return 2;
    }

    public surfaceArea(): number {
        // Diagonal
        const dx = this._max[0] - this._min[0];
        const dy = this._max[1] - this._min[1];
        const dz = this._max[2] - this._min[2];
        return 2 * (dx * dy + dx * dz + dy * dz);
    }

    public rotate(rotation: Quaternion): void {
        const sizeX = this._max[0] - this._min[0];
        const sizeY = this._max[1] - this._min[1];
        const sizeZ = this._max[2] - this._min[2];
        const min: Vector3 = [Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE];
        const max: Vector3 = [-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE];
        const position: Vector3 = [0, 0, 0];
        const vertices = Cube.POSITIONS;
        for (let i = 0; i < 8; i++) {
            position[0] = vertices[i * 3] * sizeX;
            position[1] = vertices[i * 3 + 1] * sizeY;
            position[2] = vertices[i * 3 + 2] * sizeZ;
            vector3.transformQuaternion(position, rotation, position);
            min[0] = Math.min(this._min[0], position[0]);
            min[1] = Math.min(this._min[1], position[1]);
            min[2] = Math.min(this._min[2], position[2]);
            max[0] = Math.max(this._max[0], position[0]);
            max[1] = Math.max(this._max[1], position[1]);
            max[2] = Math.max(this._max[2], position[2]);
        }
        this._min[0] = min[0];
        this._min[1] = min[1];
        this._min[2] = min[2];
        this._max[0] = max[0];
        this._max[1] = max[1];
        this._max[2] = max[2];
    }

    public fromCylinder(pa: Vector3, pb: Vector3, radius: number): void {
        Bounds.cylinder(pa, pb, radius, this._min, this._max);
    }

    public static hit(center: Vector3, size: Vector3, ray: Ray, invDir: Vector3, tMin: number, tMax: number): boolean {
        const origin = ray.origin;
        for (let i = 0; i < 3; i++) {
            const invD = invDir[i];
            const halfSize = size[i] * 0.5;
            let t0 = (center[i] - halfSize - origin[i]) * invD;
            let t1 = (center[i] + halfSize - origin[i]) * invD;
            if (invD < 0) {
                // Swap
                const temp = t0;
                t0 = t1;
                t1 = temp;
            }
            tMin = t0 > tMin ? t0 : tMin;
            tMax = t1 < tMax ? t1 : tMax;
            if (tMax <= tMin)
                return false;
        }
        return true;
    }
}