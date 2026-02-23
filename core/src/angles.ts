// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import { Constants } from "./constants.js";
import { MathUtils } from "./math.js";
import { Vector2, vector3, Vector3 } from "./matrix.js";

export class Angles {
    /**
     * Wrap angle to [-Pi,Pi]
     * @param angle angle, radians
     * @returns wrapped angle
     */
    public static wrapAngle(angle: number): number {
        while (angle > Constants.PI) { angle -= Constants.TWO_PI; }
        while (angle < -Constants.PI) { angle += Constants.TWO_PI; }
        return angle;
    }

    /**
     * Convert spherical to cartesian coordinate (polar axis is y-axis)
     * @param r radius
     * @param theta polar angle, degrees [-90,90]
     * @param phi azimuthal angle, degrees [-180,180]
     * @param result result
     */
    public static sphericalToCartesian(r: number, theta: number, phi: number, result: Vector3) {
        theta = Constants.RADIANS_PER_DEGREE * theta;
        phi = Constants.RADIANS_PER_DEGREE * phi;
        const scale = Math.cos(theta); // [-90,90]
        result[0] = r * scale * Math.sin(phi);
        result[1] = r * Math.sin(theta);
        result[2] = r * scale * Math.cos(phi);
    }

    /**
     * Convert cartesian to spherical coordinate on unit sphere (polar axis is y-axis)
     * @param x x coordinate
     * @param y y coordinate
     * @param z z coordinate
     * @param result theta (polar angle), phi (azimuthal angle), radians
     */
    public static cartesianToSpherical(x: number, y: number, z: number, result: Vector2) {
        result[0] = Math.asin(y); // theta (polar angle)
        result[1] = Math.atan2(x, z); // phi (azimuthal angle)
    }

    /**
     * Angle between normalized vectors
     * @param from normalized from vector
     * @param to normalized to vector
     * @returns angle, radians
     */
    public static angleBetweenVectors(from: Vector3, to: Vector3): number {
        if (from[0] == to[0] && from[1] == to[1] && from[2] == to[2]) {
            // Vectors are equal
            return 0;
        }
        else {
            // Prevent rounding errors
            const dot = MathUtils.clamp(vector3.dot(from, to), -1, 1);
            return Math.acos(dot);
        }
    }

    /**
     * Signed angle between normalized vectors
     * @param from normalized from vector
     * @param to normalized to vector
     * @param up normalized up vector
     * @returns signed angle, radians
     */
    public static signedAngleBetweenVectors(from: Vector3, to: Vector3, up: Vector3): number {
        if (from[0] == to[0] && from[1] == to[1] && from[2] == to[2]) {
            // Vectors are equal
            return 0;
        }
        else {
            // Prevent rounding errors
            const dot = MathUtils.clamp(vector3.dot(from, to), -1, 1);
            let angle = Math.acos(dot);

            // Sign
            const cross: Vector3 = [0, 0, 0];
            vector3.cross(from, to, cross);
            if (vector3.dot(cross, up) < 0) { angle = -angle; }
            return angle;
        }
    }
}