// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import { Config } from "../config.js";
import { Constants } from "../constants.js";
import { matrix4x4, Matrix4x4, quaternion, Quaternion, vector3, Vector3 } from "../matrix.js";

export const CameraType = {
    perspective: 0, // Default
    equalAreaCylindrical: 1,
} as const;
export type CameraType = (typeof CameraType)[keyof typeof CameraType];

export interface ICameraOptions {
    position?: Vector3;
    target?: Vector3;
}

export class Camera {
    protected _position: Vector3;
    protected _target: Vector3;
    protected _forward: Vector3;
    protected _right: Vector3;
    protected _up: Vector3;
    public get position(): Vector3 { return this._position; }
    public set position(value: Vector3) { this._position = value; }
    public get target(): Vector3 { return this._target; }
    public set target(value: Vector3) { this._target = value; }

    constructor(options: ICameraOptions) {
        this._position = options.position || vector3.clone(Config.cameraPosition);
        this._target = options.target || vector3.clone(Config.cameraTarget);
        this._forward = [0, 0, 0];
        this._right = [0, 0, 0];
        this._up = [0, 0, 0];
    }

    public update(elapsedTime: number): void {
        // TODO: Only calculate forward, right, up when position or target changes
        // Forward vector
        this._forward[0] = this._position[0] - this._target[0];
        this._forward[1] = this._position[1] - this._target[1];
        this._forward[2] = this._position[2] - this._target[2];
        vector3.normalize(this._forward, this._forward);

        // Right vector
        vector3.cross(Constants.VECTOR3_UNITY, this._forward, this._right);
        vector3.normalize(this._right, this._right);

        // Up vector
        vector3.cross(this._forward, this._right, this._up);
        vector3.normalize(this._up, this._up);
    }

    public getViewMatrix(out: Matrix4x4): void {
        matrix4x4.lookAt(this._position, this._target, Constants.VECTOR3_UNITY, out);
    }
}

export interface IPerspectiveCameraOptions extends ICameraOptions {
    width?: number;
    height?: number;
    fov?: number; // Field of view, radians
    nearPlane?: number;
    farPlane?: number;
    aperture?: number; // Aperture for depth of field
    focusDistance?: number; // Focus distance for depth of field
}

export class PerspectiveCamera extends Camera {
    protected _width: number;
    protected _height: number;
    protected _nearPlane: number;
    protected _farPlane: number;
    protected _fov: number; // Field of view, radians
    protected _aperture: number; // Aperture for depth of field
    protected _focusDistance: number; // Focus distance for depth of field
    public get fov(): number { return this._fov; }
    public set fov(value: number) { this._fov = value; }
    public get width(): number { return this._width; }
    public set width(value: number) { this._width = value; }
    public get height(): number { return this._height; }
    public set height(value: number) { this._height = value; }
    public get aperture(): number { return this._aperture; }
    public set aperture(value: number) { this._aperture = value; }
    public get focusDistance(): number { return this._focusDistance; }
    public set focusDistance(value: number) { this._focusDistance = value; }

    constructor(options: IPerspectiveCameraOptions) {
        super(options);
        this._fov = options.fov || Config.cameraFov;
        this._width = options.width || Config.width;
        this._height = options.height || Config.height;
        this._nearPlane = options.nearPlane || Config.cameraNearPlane;
        this._farPlane = options.farPlane || Config.cameraFarPlane;
        this._aperture = options.aperture || Config.cameraAperture;
        this._focusDistance = options.focusDistance || Config.cameraFocusDistance;
    }

    public getProjectionMatrix(out: Matrix4x4): void {
        matrix4x4.perspective(this._fov, this._width / this._height, this._nearPlane, this._farPlane, out);
    }

    public translate(x: number, y: number): void {
        // Distance to target
        // const distance  = vector3.distance(this._position, this._target);
        // Distance to origin
        const distance = vector3.length(this._position);
        const height = 2 * distance * Math.tan(this._fov / 2) / this._height;
        x *= height;
        y *= height;

        // Invert
        const dx = this._up[0] * y - this._right[0] * x;
        const dy = this._up[1] * y - this._right[1] * x;
        const dz = this._up[2] * y - this._right[2] * x;
        this._position[0] += dx;
        this._position[1] += dy;
        this._position[2] += dz;
        this._target[0] += dx;
        this._target[1] += dy;
        this._target[2] += dz;
    }

    public zoom(scale: number, x: number, y: number): void {
        // Get ray from hover position
        const viewportHeight = 2 * Math.tan(this._fov * 0.5);
        const viewportWidth = viewportHeight * this._width / this._height;;
        const ot: Vector3 = [
            this._target[0] - this._position[0],
            this._target[1] - this._position[1],
            this._target[2] - this._position[2]
        ];
        const focusDistance = Math.abs(vector3.dot(this._forward, ot)); // + this._focusDistance;
        const horizontal: Vector3 = [
            this._right[0] * viewportWidth * focusDistance,
            this._right[1] * viewportWidth * focusDistance,
            this._right[2] * viewportWidth * focusDistance
        ];
        const vertical: Vector3 = [
            this._up[0] * viewportHeight * focusDistance,
            this._up[1] * viewportHeight * focusDistance,
            this._up[2] * viewportHeight * focusDistance
        ];
        const lowerLeftCorner: Vector3 = [
            this._position[0] - horizontal[0] * 0.5 + vertical[0] * 0.5 - this._forward[0] * focusDistance,
            this._position[1] - horizontal[1] * 0.5 + vertical[1] * 0.5 - this._forward[1] * focusDistance,
            this._position[2] - horizontal[2] * 0.5 + vertical[2] * 0.5 - this._forward[2] * focusDistance
        ];
        x /= this.width;
        y /= this.height;
        const direction: Vector3 = [
            lowerLeftCorner[0] + x * horizontal[0] - y * vertical[0] - this._position[0],
            lowerLeftCorner[1] + x * horizontal[1] - y * vertical[1] - this._position[1],
            lowerLeftCorner[2] + x * horizontal[2] - y * vertical[2] - this._position[2]
        ];
        vector3.normalize(direction, direction);

        // Distance to target
        // const distance = vector3.distance(this._position, this._target);
        // Distance to origin
        const distance = vector3.length(this._position);
        scale *= distance;
        // this._position[0] += this._forward[0] * scale;
        // this._position[1] += this._forward[1] * scale;
        // this._position[2] += this._forward[2] * scale;
        // this._target[0] += this._forward[0] * scale;
        // this._target[1] += this._forward[1] * scale;
        // this._target[2] += this._forward[2] * scale;
        const delta: Vector3 = [
            direction[0] * scale,
            direction[1] * scale,
            direction[2] * scale
        ];
        this._position[0] -= delta[0];
        this._position[1] -= delta[1];
        this._position[2] -= delta[2];
        this._target[0] -= delta[0];
        this._target[1] -= delta[1];
        this._target[2] -= delta[2];
    }
}

export interface IAltAzimuthPerspectiveCameraOptions extends IPerspectiveCameraOptions { }

export class AltAzimuthPerspectiveCamera extends PerspectiveCamera {
    private _quat1: Quaternion;
    private _quat2: Quaternion;

    constructor(options: IAltAzimuthPerspectiveCameraOptions) {
        super(options);
        this._quat1 = [0, 0, 0, 0];
        this._quat2 = [0, 0, 0, 0];
    }

    public rotate(x: number, y: number): void {
        // Altitude (pitch around local right axis)
        const length = this._height;
        let angle = -y * Constants.PI / length;
        // Get current altitude angle
        const altitude = Math.acos(vector3.dot(this._forward, Constants.VECTOR3_UNITY)); // [0, PI], with 0 straight up, PI straight down
        // Prevent gimbal lock
        const epsilon = 0.001;
        if (altitude + angle < epsilon) {
            angle = epsilon - altitude; // Prevent gimbal lock at the top
        }
        else if (altitude + angle > Constants.PI - epsilon) {
            angle = Constants.PI - epsilon - altitude; // Prevent gimbal lock at the bottom
        }
        quaternion.setAxisAngle(this._right, angle, this._quat1); // Invert

        // Azimuth (yaw around global up axis)
        angle = -x * Constants.PI / length; // Invert
        quaternion.setAxisAngle(Constants.VECTOR3_UNITY, angle, this._quat2);
        quaternion.multiply(this._quat2, this._quat1, this._quat1);

        // Apply to position
        vector3.transformQuaternion(this._position, this._quat1, this._position);

        // Apply to target
        vector3.transformQuaternion(this._target, this._quat1, this._target);
    }
}