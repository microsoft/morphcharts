// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import { Quaternion, Vector2, Vector3, Vector4 } from "./matrix.js";

export class Constants {
    // Epsilon
    public static readonly EPSILON = 1e-6;

    // Matrix
    public static readonly VECTOR2_ZERO: Vector2 = [0, 0];
    public static readonly VECTOR3_ZERO: Vector3 = [0, 0, 0];
    public static readonly VECTOR3_UNITX: Vector3 = [1, 0, 0];
    public static readonly VECTOR3_UNITY: Vector3 = [0, 1, 0];
    public static readonly VECTOR3_UNITZ: Vector3 = [0, 0, 1];
    public static readonly VECTOR4_ZERO: Vector4 = [0, 0, 0, 0];
    public static readonly QUATERNION_IDENTITY: Quaternion = [0, 0, 0, 1];

    // Pi
    public static readonly TWO_PI = 6.283185307179586; // 360°
    public static readonly PI = 3.141592653589793; // 180°
    public static readonly PI_OVER_TWO = 1.5707963267948966; // 90°
    public static readonly PI_OVER_THREE = 1.0471975511965976; // 60°
    public static readonly PI_OVER_FOUR = 0.7853981633974483; // 45°
    public static readonly PI_OVER_SIX = 0.5235987755982988; // 30°

    // Anlges
    public static readonly RADIANS_PER_DEGREE = 0.017453292519943295;
    public static readonly DEGREES_PER_RADIAN = 57.29577951308232;

    // Square roots
    public static readonly ROOT_TWO = 1.4142135623730951;
    public static readonly ROOT_TWO_OVER_TWO = 0.7071067811865476;
    public static readonly ROOT_THREE = 1.7320508075688772;
    public static readonly ROOT_THREE_OVER_TWO = 0.8660254037844386;
    public static readonly ROOT_THREE_OVER_THREE = 0.5773502691896257;

    // Time
    public static readonly MILLISECONDS_PER_DAY = 86400000;

    // Data URLs
    public static readonly WHITE_PIXEL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=";
}