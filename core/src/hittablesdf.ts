// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import { Quaternion, vector3, Vector3 } from "./matrix.js";
import { Hittable, HittableBox, HittableCylinder, HittableHexPrism, HittableType } from "./hittable.js";
import type { HittableBufferData, IHittableBoxOptions, IHittableCylinderOptions, IHittableHexPrismOptions, IHittableOptions } from "./hittable.js";
import { Bounds } from "./bounds.js";
import { Constants } from "./constants.js";
import { AABB } from "./aabb.js";

export interface IHittableQuadSdfOptions extends IHittableOptions {
    size: Vector3;
    a: number; b: number; c: number; d: number;
}

export class HittableQuadSdf extends Hittable {
    protected _size: Vector3;
    protected _a: number; protected _b: number;
    protected _c: number; protected _d: number;

    constructor(options: IHittableQuadSdfOptions) {
        super(options);
        this._size = options.size;
        this._a = options.a ?? 0;
        this._b = options.b ?? 1;
        this._c = options.c ?? 0;
        this._d = options.d ?? 1;

        // Bounds
        this._bounds.min[0] = this._center[0] - this._size[0] * 0.5;
        this._bounds.min[1] = this._center[1] - this._size[1] * 0.5;
        this._bounds.min[2] = this._center[2] - this._size[2] * 0.5;
        this._bounds.max[0] = this._center[0] + this._size[0] * 0.5;
        this._bounds.max[1] = this._center[1] + this._size[1] * 0.5;
        this._bounds.max[2] = this._center[2] + this._size[2] * 0.5;
    }

    public toBuffer(buffer: HittableBufferData, index: number) {
        super.toBuffer(buffer, index);
        buffer.setSize(index, this._size);
        buffer.setParam(index, this._a, 0);
        buffer.setParam(index, this._b, 1);
        buffer.setParam(index, this._c, 2);
        buffer.setParam(index, this._d, 3);
        buffer.setUnitType(index, HittableType.quadSdf);
    }
}

export interface IHittableBoxSdfOptions extends IHittableBoxOptions {
    rounding: number;
}

export class HittableBoxSdf extends HittableBox {
    protected _rounding: number;

    constructor(options: IHittableBoxSdfOptions) {
        super(options);
        this._rounding = options.rounding;
    }

    public toBuffer(buffer: HittableBufferData, index: number) {
        super.toBuffer(buffer, index);
        // buffer.setRounding(index, this._rounding);
        buffer.setRounding(index, Math.min(this._rounding, this._size[0] * 0.5, this._size[1] * 0.5, this._size[2] * 0.5));
        buffer.setUnitType(index, this._rotation[3] == 1 ? HittableType.boxSdf : HittableType.boxRotatedSdf);
    }
}

export interface IHittableBoxFrameSdfOptions extends IHittableBoxOptions {
    thickness: number;
    rounding: number;
}

export class HittableBoxFrameSdf extends HittableBox {
    protected _thickness: number;
    protected _rounding: number;

    constructor(options: IHittableBoxFrameSdfOptions) {
        super(options);

        this._thickness = options.thickness;
        this._rounding = options.rounding;
    }

    public toBuffer(buffer: HittableBufferData, index: number) {
        super.toBuffer(buffer, index);
        buffer.setUnitType(index, this._rotation[3] == 1 ? HittableType.boxFrameSdf : HittableType.boxFrameRotatedSdf);
        buffer.setRounding(index, Math.min(this._rounding, this._thickness * this._size[0] / 2));
        buffer.setParam(index, this._thickness, 0);
    }
}

export interface IHittableCappedTorusSdfOptions extends IHittableOptions {
    innerRadius: number;
    outerRadius: number;
    startAngle: number;
    endAngle: number;
    padding?: number;
    rotation?: Quaternion;
}

export class HittableCappedTorusSdf extends Hittable {
    protected _innerRadius: number;
    protected _outerRadius: number;
    protected _startAngle: number;
    protected _endAngle: number;
    protected _boundsOffset: Vector3;
    protected _padding: number;
    protected _rotation: Quaternion;

    constructor(options: IHittableCappedTorusSdfOptions) {
        super(options);
        this._outerRadius = options.outerRadius;
        this._innerRadius = options.innerRadius;
        this._startAngle = options.startAngle;
        this._endAngle = options.endAngle;
        this._padding = options.padding || 0;
        this._rotation = options.rotation || Constants.QUATERNION_IDENTITY;

        // Tight bounding box
        const min = this._bounds.min;
        const max = this._bounds.max;
        const outerRadius = this._outerRadius;
        const innerRadius = this._innerRadius * this._outerRadius; // Outer radius units
        const thickness = outerRadius - innerRadius;
        const center = this._center;
        const startAngle = this._startAngle;
        const endAngle = this._endAngle;
        // TODO: Take account of padding to reduce bounding box size
        Bounds.ringSegment(center, innerRadius, outerRadius, startAngle, endAngle, min, max);

        // min/max z at the extruded thickness
        min[2] = center[2] - thickness * 0.5;
        max[2] = center[2] + thickness * 0.5;

        // Origin for off-center bounds
        this._boundsOffset = [
            (min[0] + max[0]) / 2 - center[0],
            (min[1] + max[1]) / 2 - center[1],
            (min[2] + max[2]) / 2 - center[2]
        ];

        // Rotated bounds
        if (this._rotation[3] != 1) {
            const rotatedBounds = new AABB();
            Bounds.rotate(this._bounds.min, this._bounds.max, this._rotation, rotatedBounds.min, rotatedBounds.max, this._boundsOffset);
            this._bounds = rotatedBounds;
        }
    }

    public toBuffer(buffer: HittableBufferData, index: number) {
        super.toBuffer(buffer, index);
        buffer.setUnitType(index, this._rotation[3] == 1 ? HittableType.cappedTorusSdf : HittableType.cappedTorusRotatedSdf);
        buffer.setRotation(index, this._rotation);
        buffer.setSize(index, [this._outerRadius * 2, this._outerRadius * 2, this._outerRadius - this._innerRadius * this._outerRadius]);
        buffer.setParam(index, this._innerRadius, 0);
        buffer.setParam(index, this._startAngle, 1);
        buffer.setParam(index, this._endAngle, 2);
        buffer.setParam(index, this._padding, 3);
    }
}

export interface IHittableCylinderSdfOptions extends IHittableCylinderOptions {
    rounding: number;
}

export class HittableCylinderSdf extends HittableCylinder {
    protected _rounding: number;

    constructor(options: IHittableCylinderSdfOptions) {
        super(options);
        this._radius = options.radius;
        this._height = options.height;
        this._rounding = options.rounding;
    }

    public toBuffer(buffer: HittableBufferData, index: number) {
        super.toBuffer(buffer, index);
        buffer.setUnitType(index, this._rotation[3] == 1 ? HittableType.cylinderSdf : HittableType.cylinderRotatedSdf);
        // buffer.setRounding(index, this._rounding);
        buffer.setRounding(index, Math.min(this._rounding, this._radius, this._height * 0.5));
    }
}

export interface IHittableHexPrismSdfOptions extends IHittableHexPrismOptions {
    rounding: number;
}

export class HittableHexPrismSdf extends HittableHexPrism {
    private _rounding: number;

    constructor(options: IHittableHexPrismSdfOptions) {
        super(options);
        this._rounding = options.rounding;
    }

    public toBuffer(buffer: HittableBufferData, index: number) {
        super.toBuffer(buffer, index);
        buffer.setUnitType(index, HittableType.hexPrismSdf);
        // buffer.setRounding(index, this._rounding);
        buffer.setRounding(index, Math.min(this._rounding, this._radius * Constants.ROOT_THREE_OVER_TWO, this._height * 0.5));
    }
}

export interface IHittableRingSdfOptions extends IHittableOptions {
    innerRadius: number;
    outerRadius: number;
    thickness: number;
    startAngle: number;
    endAngle: number;
    padding?: number;
    rotation?: Quaternion;
}

export class HittableRingSdf extends Hittable {
    protected _innerRadius: number;
    protected _outerRadius: number;
    protected _thickness: number;
    protected _startAngle: number;
    protected _endAngle: number;
    protected _boundsOffset: Vector3;
    protected _padding: number;
    protected _rotation: Quaternion;

    constructor(options: IHittableRingSdfOptions) {
        super(options);
        this._outerRadius = options.outerRadius;
        this._thickness = options.thickness;
        this._innerRadius = options.innerRadius;
        this._startAngle = options.startAngle;
        this._endAngle = options.endAngle;
        this._padding = options.padding || 0;
        this._rotation = options.rotation || Constants.QUATERNION_IDENTITY;

        // Tight bounding box
        const min = this._bounds.min;
        const max = this._bounds.max;
        const outerRadius = this._outerRadius;
        const innerRadius = this._innerRadius * this._outerRadius; // Outer radius units
        const thickness = this._thickness;
        const center = this._center;
        const startAngle = this._startAngle;
        const endAngle = this._endAngle;
        // TODO: Take account of padding to reduce bounding box size
        Bounds.ringSegment(center, innerRadius, outerRadius, startAngle, endAngle, min, max);

        // min/max z at the extruded thickness
        min[2] = center[2] - thickness * 0.5;
        max[2] = center[2] + thickness * 0.5;

        // Origin for off-center bounds
        this._boundsOffset = [
            (min[0] + max[0]) / 2 - center[0],
            (min[1] + max[1]) / 2 - center[1],
            (min[2] + max[2]) / 2 - center[2]
        ];

        // Rotated bounds
        if (this._rotation[3] != 1) {
            const rotatedBounds = new AABB();
            Bounds.rotate(this._bounds.min, this._bounds.max, this._rotation, rotatedBounds.min, rotatedBounds.max, this._boundsOffset);
            this._bounds = rotatedBounds;
        }
    }

    public toBuffer(buffer: HittableBufferData, index: number) {
        super.toBuffer(buffer, index);
        buffer.setUnitType(index, HittableType.ringRotatedSdf);
        buffer.setRotation(index, this._rotation);
        buffer.setSize(index, [this._outerRadius * 2, this._outerRadius * 2, this._thickness]);
        buffer.setParam(index, this._innerRadius, 0);
        buffer.setParam(index, this._startAngle, 1);
        buffer.setParam(index, this._endAngle, 2);
        buffer.setParam(index, this._padding, 3);
    }
}

export interface IHittableTubeSdfOptions extends IHittableOptions {
    innerRadius: number;
    outerRadius: number,
    height: number;
    rounding: number;
    rotation?: Quaternion;
}

export class HittableTubeSdf extends Hittable {
    protected _innerRadius: number;
    protected _outerRadius: number;
    protected _height: number;
    protected _rounding: number;
    protected _rotation: Quaternion;

    constructor(options: IHittableTubeSdfOptions) {
        super(options);
        this._outerRadius = options.outerRadius;
        this._innerRadius = options.innerRadius;
        this._height = options.height;
        this._rounding = options.rounding;

        // Optional properties
        this._rotation = options.rotation || Constants.QUATERNION_IDENTITY;

        // Bounds
        if (this._rotation[3] == 1) {
            const min = this._bounds.min;
            const max = this._bounds.max;
            min[0] = this._center[0] - this._outerRadius;
            max[0] = this._center[0] + this._outerRadius;
            min[1] = this._center[1] - this._height * 0.5;
            max[1] = this._center[1] + this._height * 0.5;
            min[2] = this._center[2] - this._outerRadius;
            max[2] = this._center[2] + this._outerRadius;
        }
        else {
            // Tight bounds
            const ca: Vector3 = [0, 1, 0];
            if (options.rotation[3] != 1) { vector3.transformQuaternion(ca, options.rotation, ca); }
            const pa: Vector3 = [
                options.center[0] - ca[0] * this._height * 0.5,
                options.center[1] - ca[1] * this._height * 0.5,
                options.center[2] - ca[2] * this._height * 0.5
            ];
            const pb: Vector3 = [
                options.center[0] + ca[0] * this._height * 0.5,
                options.center[1] + ca[1] * this._height * 0.5,
                options.center[2] + ca[2] * this._height * 0.5
            ];
            this._bounds = new AABB();
            this._bounds.fromCylinder(pa, pb, this._outerRadius);
        }
    }

    public toBuffer(buffer: HittableBufferData, index: number) {
        super.toBuffer(buffer, index);
        buffer.setUnitType(index, this._rotation[3] == 1 ? HittableType.tubeSdf : HittableType.tubeRotatedSdf);
        buffer.setSize(index, [this._outerRadius * 2, this._height, this._outerRadius * 2]);
        const thickness = this._outerRadius - this._innerRadius * this._outerRadius;
        buffer.setRounding(index, Math.min(this._rounding, this._outerRadius, this._height * 0.5, thickness / 2));
        buffer.setRotation(index, this._rotation);
        buffer.setParam(index, this._innerRadius, 0);
    }
}