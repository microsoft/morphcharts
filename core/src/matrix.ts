// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

export type Vector2 = [number, number];
export type Vector3 = [number, number, number];
export type Vector4 = [number, number, number, number];
export type Quaternion = [number, number, number, number];
export type Matrix2x2 = [
    number, number,
    number, number
];
export type Matrix3x3 = [
    number, number, number,
    number, number, number,
    number, number, number
];
export type Matrix4x4 = [
    number, number, number, number,
    number, number, number, number,
    number, number, number, number,
    number, number, number, number
];

const EPSILON = 1e-6;

export const vector2 = {
    clone(v: Vector2): Vector2 {
        return [v[0], v[1]];
    },
    dot(a: Vector2, b: Vector2): number {
        return a[0] * b[0] + a[1] * b[1];
    },
    length(v: Vector2): number {
        const x = v[0], y = v[1];
        return Math.sqrt(x * x + y * y);
    },
    lengthSquared(v: Vector2): number {
        const x = v[0], y = v[1];
        return x * x + y * y;
    },
    normalize(v: Vector2, out: Vector2): void {
        const x = v[0], y = v[1];
        const length = Math.sqrt(x * x + y * y);
        if (length > 0) {
            const invLength = 1 / length;
            out[0] = x * invLength;
            out[1] = y * invLength;
        }
    },
    nearZero(v: Vector2): boolean {
        return Math.max(Math.abs(v[0]), Math.abs(v[1])) < EPSILON;
    },
    min(v0: Vector2, v1: Vector2, out: Vector2): void {
        out[0] = Math.min(v0[0], v1[0]);
        out[1] = Math.min(v0[1], v1[1]);
    },
    max(v0: Vector2, v1: Vector2, out: Vector2): void {
        out[0] = Math.max(v0[0], v1[0]);
        out[1] = Math.max(v0[1], v1[1]);
    },
}

export const vector3 = {
    clone(v: Vector3): Vector3 {
        return [v[0], v[1], v[2]];
    },
    copy(v: Vector3, out: Vector3): void {
        out[0] = v[0];
        out[1] = v[1];
        out[2] = v[2];
    },
    dot(a: Vector3, b: Vector3): number {
        return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    },
    cross(a: Vector3, b: Vector3, out: Vector3): void {
        out[0] = a[1] * b[2] - a[2] * b[1];
        out[1] = a[2] * b[0] - a[0] * b[2];
        out[2] = a[0] * b[1] - a[1] * b[0];
    },
    length(v: Vector3): number {
        const x = v[0], y = v[1], z = v[2];
        return Math.sqrt(x * x + y * y + z * z);
    },
    lengthSquared(v: Vector3): number {
        const x = v[0], y = v[1], z = v[2];
        return x * x + y * y + z * z;
    },
    distance(a: Vector3, b: Vector3): number {
        const dx = a[0] - b[0], dy = a[1] - b[1], dz = a[2] - b[2];
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    },
    distanceSquared(a: Vector3, b: Vector3): number {
        const dx = a[0] - b[0], dy = a[1] - b[1], dz = a[2] - b[2];
        return dx * dx + dy * dy + dz * dz;
    },
    normalize(v: Vector3, out: Vector3): void {
        const x = v[0], y = v[1], z = v[2];
        const length = Math.sqrt(x * x + y * y + z * z);
        if (length > 0) {
            const invLength = 1 / length;
            out[0] = x * invLength;
            out[1] = y * invLength;
            out[2] = z * invLength;
        }
    },
    min(v0: Vector3, v1: Vector3, out: Vector3): void {
        out[0] = Math.min(v0[0], v1[0]);
        out[1] = Math.min(v0[1], v1[1]);
        out[2] = Math.min(v0[2], v1[2]);
    },
    max(v0: Vector3, v1: Vector3, out: Vector3): void {
        out[0] = Math.max(v0[0], v1[0]);
        out[1] = Math.max(v0[1], v1[1]);
        out[2] = Math.max(v0[2], v1[2]);
    },
    reflect(v: Vector3, n: Vector3, out: Vector3): void {
        const dot = v[0] * n[0] + v[1] * n[1] + v[2] * n[2];
        out[0] = v[0] - 2 * dot * n[0];
        out[1] = v[1] - 2 * dot * n[1];
        out[2] = v[2] - 2 * dot * n[2];
    },
    rotateX(v: Vector3, origin: Vector3, angle: number, out: Vector3): void {
        const x = v[0] - origin[0], y = v[1] - origin[1], z = v[2] - origin[2];
        const cos = Math.cos(angle), sin = Math.sin(angle);
        out[0] = x + origin[0];
        out[1] = y * cos - z * sin + origin[1];
        out[2] = y * sin + z * cos + origin[2];
    },
    rotateY(v: Vector3, origin: Vector3, angle: number, out: Vector3): void {
        const x = v[0] - origin[0], y = v[1] - origin[1], z = v[2] - origin[2];
        const cos = Math.cos(angle), sin = Math.sin(angle);
        out[0] = z * sin + x * cos + origin[0];
        out[1] = y + origin[1];
        out[2] = z * cos - x * sin + origin[2];
    },
    rotateZ(v: Vector3, origin: Vector3, angle: number, out: Vector3): void {
        const x = v[0] - origin[0], y = v[1] - origin[1], z = v[2] - origin[2];
        const cos = Math.cos(angle), sin = Math.sin(angle);
        out[0] = x * cos - y * sin + origin[0];
        out[1] = x * sin + y * cos + origin[1];
        out[2] = z + origin[2];
    },
    transformMatrix3x3(v: Vector3, m: Matrix3x3, out: Vector3): void {
        const x = v[0], y = v[1], z = v[2];
        out[0] = m[0] * x + m[3] * y + m[6] * z;
        out[1] = m[1] * x + m[4] * y + m[7] * z;
        out[2] = m[2] * x + m[5] * y + m[8] * z;
    },
    transformMatrix4x4(v: Vector3, m: Matrix4x4, out: Vector3): void {
        const x = v[0], y = v[1], z = v[2];
        const m00 = m[0], m01 = m[1], m02 = m[2], m03 = m[3];
        const m10 = m[4], m11 = m[5], m12 = m[6], m13 = m[7];
        const m20 = m[8], m21 = m[9], m22 = m[10], m23 = m[11];
        const m30 = m[12], m31 = m[13], m32 = m[14], m33 = m[15];
        out[0] = m00 * x + m10 * y + m20 * z + m30;
        out[1] = m01 * x + m11 * y + m21 * z + m31;
        out[2] = m02 * x + m12 * y + m22 * z + m32;
        const w = m03 * x + m13 * y + m23 * z + m33;
        if (w !== 1 && w !== 0) {
            out[0] /= w;
            out[1] /= w;
            out[2] /= w;
        }
    },
    transformQuaternion(v: Vector3, q: Quaternion, out: Vector3): void {
        const x = v[0], y = v[1], z = v[2];
        const qx = q[0], qy = q[1], qz = q[2], qw = q[3];
        const ix = qw * x + qy * z - qz * y;
        const iy = qw * y + qz * x - qx * z;
        const iz = qw * z + qx * y - qy * x;
        const iw = -qx * x - qy * y - qz * z;
        out[0] = ix * qw + iw * -qx + iy * -qz - iz * -qy;
        out[1] = iy * qw + iw * -qy + iz * -qx - ix * -qz;
        out[2] = iz * qw + iw * -qz + ix * -qy - iy * -qx;
    },
    nearZero(v: Vector3): boolean {
        return Math.max(Math.abs(v[0]), Math.abs(v[1]), Math.abs(v[2])) < EPSILON;
    },
    /**
     * 
     * @param out 
     * @returns a normalized, random point on the unit sphere
     */
    randomUnitVector(out: Vector3): void {
        while (true) {
            out[0] = 2 * Math.random() - 1; // [-1,1]
            out[1] = 2 * Math.random() - 1; // [-1,1]
            out[2] = 2 * Math.random() - 1; // [-1,1]
            const lengthSquared = this.lengthSquared(out);
            // Reject at center or outside unit sphere
            if (EPSILON < lengthSquared && lengthSquared <= 1) {
                const length = Math.sqrt(lengthSquared);
                const invLength = 1 / length;
                out[0] *= invLength;
                out[1] *= invLength;
                out[2] *= invLength;
                break;
            }
        }
    },
    randomOnHemisphere(n: Vector3, out: Vector3): void {
        this.randomUnitVector(out);
        if (this.dot(out, n) < 0) {
            out[0] = -out[0];
            out[1] = -out[1];
            out[2] = -out[2];
        }
    },
    inverse(v: Vector3, out: Vector3) {
        out[0] = 1 / (Math.abs(v[0]) == 0 ? EPSILON : v[0]);
        out[1] = 1 / (Math.abs(v[1]) == 0 ? EPSILON : v[1]);
        out[2] = 1 / (Math.abs(v[2]) == 0 ? EPSILON : v[2]);
    },
    lerp(a: Vector3, b: Vector3, t: number, out: Vector3): void {
        out[0] = a[0] + t * (b[0] - a[0]);
        out[1] = a[1] + t * (b[1] - a[1]);
        out[2] = a[2] + t * (b[2] - a[2]);
    },
};

export const vector4 = {
    clone(v: Vector4): Vector4 {
        return [v[0], v[1], v[2], v[3]];
    },
}

export const quaternion = {
    clone(q: Quaternion): Quaternion {
        return [q[0], q[1], q[2], q[3]];
    },
    multiply(a: Quaternion, b: Quaternion, out: Quaternion): void {
        const ax = a[0], ay = a[1], az = a[2], aw = a[3];
        const bx = b[0], by = b[1], bz = b[2], bw = b[3];
        out[0] = ax * bw + aw * bx + ay * bz - az * by;
        out[1] = ay * bw + aw * by + az * bx - ax * bz;
        out[2] = az * bw + aw * bz + ax * by - ay * bx;
        out[3] = aw * bw - ax * bx - ay * by - az * bz;
    },
    normalize(q: Quaternion, out: Quaternion): void {
        const x = q[0], y = q[1], z = q[2], w = q[3];
        const length = Math.sqrt(x * x + y * y + z * z + w * w);
        if (length > 0) {
            const invLength = 1 / length;
            out[0] = x * invLength;
            out[1] = y * invLength;
            out[2] = z * invLength;
            out[3] = w * invLength;
        }
    },
    slerp(a: Quaternion, b: Quaternion, t: number, out: Quaternion): void {
        const cosTheta = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
        const theta = Math.acos(cosTheta);
        const sinTheta = Math.sqrt(1 - cosTheta * cosTheta);
        if (Math.abs(sinTheta) < 0.001) {
            out[0] = a[0] + t * (b[0] - a[0]);
            out[1] = a[1] + t * (b[1] - a[1]);
            out[2] = a[2] + t * (b[2] - a[2]);
            out[3] = a[3] + t * (b[3] - a[3]);
        }
        const ratioA = Math.sin((1 - t) * theta) / sinTheta;
        const ratioB = Math.sin(t * theta) / sinTheta;
        out[0] = a[0] * ratioA + b[0] * ratioB;
        out[1] = a[1] * ratioA + b[1] * ratioB;
        out[2] = a[2] * ratioA + b[2] * ratioB;
        out[3] = a[3] * ratioA + b[3] * ratioB;
    },
    createIdentity(): Quaternion {
        return [0, 0, 0, 1];
    },
    rotateX(q: Quaternion, angle: number, out: Quaternion): void {
        const halfAngle = angle * 0.5;
        const ax = q[0], ay = q[1], az = q[2], aw = q[3];
        const sin = Math.sin(halfAngle), cos = Math.cos(halfAngle);
        out[0] = ax * cos + aw * sin;
        out[1] = ay * cos + az * sin;
        out[2] = az * cos - ay * sin;
        out[3] = aw * cos - ax * sin;
    },
    rotateY(q: Quaternion, angle: number, out: Quaternion): void {
        const halfAngle = angle * 0.5;
        const qx = q[0], qy = q[1], qz = q[2], qw = q[3];
        const sin = Math.sin(halfAngle), cos = Math.cos(halfAngle);
        out[0] = qx * cos - qz * sin;
        out[1] = qy * cos + qw * sin;
        out[2] = qz * cos + qx * sin;
        out[3] = qw * cos - qy * sin;
    },
    rotateZ(q: Quaternion, angle: number, out: Quaternion): void {
        const halfAngle = angle * 0.5;
        const qx = q[0], qy = q[1], qz = q[2], qw = q[3];
        const sin = Math.sin(halfAngle), cos = Math.cos(halfAngle);
        out[0] = qx * cos + qy * sin;
        out[1] = qy * cos - qx * sin;
        out[2] = qz * cos + qw * sin;
        out[3] = qw * cos - qz * sin;
    },
    setAxisAngle(axis: Vector3, angle: number, out: Quaternion): void {
        const halfAngle = angle * 0.5;
        const s = Math.sin(halfAngle);
        out[0] = axis[0] * s;
        out[1] = axis[1] * s;
        out[2] = axis[2] * s;
        out[3] = Math.cos(halfAngle);
    },
    rotationTo(from: Vector3, to: Vector3, out: Quaternion): void {
        const v: Vector3 = [0, 0, 0];
        const x: Vector3 = [1, 0, 0];
        const y: Vector3 = [0, 1, 0];
        const dot = vector3.dot(from, to);
        if (dot < -0.999999) {
            vector3.cross(x, from, v);
            if (vector3.length(v) < 0.000001) { vector3.cross(y, from, v); }
            vector3.normalize(v, v);
            this.setAxisAngle(v, Math.PI, out);
        }
        else if (dot > 0.999999) {
            out[0] = 0;
            out[1] = 0;
            out[2] = 0;
            out[3] = 1;
        }
        else {
            vector3.cross(from, to, v);
            out[0] = v[0];
            out[1] = v[1];
            out[2] = v[2];
            out[3] = 1 + dot;
            quaternion.normalize(out, out);
        }
    },
    /**
     * Calculate the conjugate of a quaternion
     * If the quaternion is unit length, the conjugate is the same as the inverse
     * @param q 
     * @param out 
     */
    conjugate(q: Quaternion, out: Quaternion): void {
        out[0] = -q[0];
        out[1] = -q[1];
        out[2] = -q[2];
        out[3] = q[3];
    },
    /**
     * Calculate a quaternion from a 3x3 rotation matrix
     * @param m 
     * @param out
     */
    fromMatrix3x3(m: Matrix3x3, out: Quaternion): void {
        const m00 = m[0], m01 = m[1], m02 = m[2];
        const m10 = m[3], m11 = m[4], m12 = m[5];
        const m20 = m[6], m21 = m[7], m22 = m[8];
        const trace = m00 + m11 + m22;
        if (trace > 0) {
            const s = 0.5 / Math.sqrt(trace + 1);
            out[3] = 0.25 / s;
            out[0] = (m21 - m12) * s;
            out[1] = (m02 - m20) * s;
            out[2] = (m10 - m01) * s;
        }
        else if (m00 > m11 && m00 > m22) {
            const s = 2 * Math.sqrt(1 + m00 - m11 - m22);
            out[3] = (m21 - m12) / s;
            out[0] = 0.25 * s;
            out[1] = (m01 + m10) / s;
            out[2] = (m02 + m20) / s;
        }
        else if (m11 > m22) {
            const s = 2 * Math.sqrt(1 + m11 - m00 - m22);
            out[3] = (m02 - m20) / s;
            out[0] = (m01 + m10) / s;
            out[1] = 0.25 * s;
            out[2] = (m12 + m21) / s;
        }
        else {
            const s = 2 * Math.sqrt(1 + m22 - m00 - m11);
            out[3] = (m10 - m01) / s;
            out[0] = (m02 + m20) / s;
            out[1] = (m12 + m21) / s;
            out[2] = 0.25 * s;
        }
    },
    /**
     * Create a quaternion from Euler (Tait-Bryan) angles
     * @param pitch, rotation about the x axis, radians
     * @param yaw, rotation about the y axis, radians
     * @param roll, rotation about the z axis, radians
     * @param out
     */
    fromEulerAngles(pitch: number, yaw: number, roll: number, out: Quaternion): void {
        const halfPitch = pitch * 0.5;
        const halfYaw = yaw * 0.5;
        const halfRoll = roll * 0.5;
        const sinPitch = Math.sin(halfPitch);
        const cosPitch = Math.cos(halfPitch);
        const sinYaw = Math.sin(halfYaw);
        const cosYaw = Math.cos(halfYaw);
        const sinRoll = Math.sin(halfRoll);
        const cosRoll = Math.cos(halfRoll);
        out[0] = cosYaw * sinPitch * cosRoll + sinYaw * cosPitch * sinRoll;
        out[1] = sinYaw * cosPitch * cosRoll - cosYaw * sinPitch * sinRoll;
        out[2] = cosYaw * cosPitch * sinRoll - sinYaw * sinPitch * cosRoll;
        out[3] = cosYaw * cosPitch * cosRoll + sinYaw * sinPitch * sinRoll;
    }
}

export const matrix2x2 = {
    clone(m: Matrix2x2): Matrix2x2 {
        return [m[0], m[1],
        m[2], m[3]];
    },
    createIdentity(): Matrix2x2 {
        return [
            1, 0,
            0, 1
        ];
    },
    create(
        m00: number, m01: number,
        m10: number, m11: number): Matrix2x2 {
        return [
            m00, m01,
            m10, m11
        ];
    },
}

export const matrix3x3 = {
    clone(m: Matrix3x3): Matrix3x3 {
        return [m[0], m[1], m[2],
        m[3], m[4], m[5],
        m[6], m[7], m[8]];
    },
    createIdentity(): Matrix3x3 {
        return [
            1, 0, 0,
            0, 1, 0,
            0, 0, 1
        ];
    },
    create(
        m00: number, m01: number, m02: number,
        m10: number, m11: number, m12: number,
        m20: number, m21: number, m22: number): Matrix3x3 {
        return [
            m00, m01, m02,
            m10, m11, m12,
            m20, m21, m22
        ];
    },
    multiply(a: Matrix3x3, b: Matrix3x3, out: Matrix3x3): void {
        const a00 = a[0], a01 = a[1], a02 = a[2];
        const a10 = a[3], a11 = a[4], a12 = a[5];
        const a20 = a[6], a21 = a[7], a22 = a[8];
        const b00 = b[0], b01 = b[1], b02 = b[2];
        const b10 = b[3], b11 = b[4], b12 = b[5];
        const b20 = b[6], b21 = b[7], b22 = b[8];
        out[0] = a00 * b00 + a01 * b10 + a02 * b20;
        out[1] = a00 * b01 + a01 * b11 + a02 * b21;
        out[2] = a00 * b02 + a01 * b12 + a02 * b22;
        out[3] = a10 * b00 + a11 * b10 + a12 * b20;
        out[4] = a10 * b01 + a11 * b11 + a12 * b21;
        out[5] = a10 * b02 + a11 * b12 + a12 * b22;
        out[6] = a20 * b00 + a21 * b10 + a22 * b20;
        out[7] = a20 * b01 + a21 * b11 + a22 * b21;
        out[8] = a20 * b02 + a21 * b12 + a22 * b22;
    },
    transpose(m: Matrix3x3, out: Matrix3x3): void {
        out[0] = m[0];
        out[1] = m[3];
        out[2] = m[6];
        out[3] = m[1];
        out[4] = m[4];
        out[5] = m[7];
        out[6] = m[2];
        out[7] = m[5];
        out[8] = m[8];
    },
    invert(m: Matrix3x3, out: Matrix3x3): void {
        const a00 = m[0], a01 = m[1], a02 = m[2];
        const a10 = m[3], a11 = m[4], a12 = m[5];
        const a20 = m[6], a21 = m[7], a22 = m[8];
        const b01 = a22 * a11 - a12 * a21;
        const b11 = -a22 * a10 + a12 * a20;
        const b21 = a21 * a10 - a11 * a20;
        let det = a00 * b01 + a01 * b11 + a02 * b21;
        if (Math.abs(det) < EPSILON) {
            // return identity if not invertible
            this.identity(out);
            return;
        }
        det = 1.0 / det;
        out[0] = b01 * det;
        out[1] = (-a22 * a01 + a02 * a21) * det;
        out[2] = (a12 * a01 - a02 * a11) * det;
        out[3] = b11 * det;
        out[4] = (a22 * a00 - a02 * a20) * det;
        out[5] = (-a12 * a00 + a02 * a10) * det;
        out[6] = b21 * det;
        out[7] = (-a21 * a00 + a01 * a20) * det;
        out[8] = (a11 * a00 - a01 * a10) * det;
    },
    identity(m: Matrix3x3): void {
        m[0] = 1; m[1] = 0; m[2] = 0;
        m[3] = 0; m[4] = 1; m[5] = 0;
        m[6] = 0; m[7] = 0; m[8] = 1;
    },
    rotateX(angle: number, out: Matrix3x3): void {
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        out[0] = 1; out[1] = 0; out[2] = 0;
        out[3] = 0; out[4] = c; out[5] = -s;
        out[6] = 0; out[7] = s; out[8] = c;
    },
    rotateY(angle: number, out: Matrix3x3): void {
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        out[0] = c; out[1] = 0; out[2] = s;
        out[3] = 0; out[4] = 1; out[5] = 0;
        out[6] = -s; out[7] = 0; out[8] = c;
    },
    rotateZ(angle: number, out: Matrix3x3): void {
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        out[0] = c; out[1] = -s; out[2] = 0;
        out[3] = s; out[4] = c; out[5] = 0;
        out[6] = 0; out[7] = 0; out[8] = 1;
    },
    fromEulerAngles(pitch: number, yaw: number, roll: number, out: Matrix3x3): void {
        const cp = Math.cos(pitch);
        const sp = Math.sin(pitch);
        const cy = Math.cos(yaw);
        const sy = Math.sin(yaw);
        const cr = Math.cos(roll);
        const sr = Math.sin(roll);
        out[0] = cy * cr;
        out[1] = -cy * sr;
        out[2] = sy;
        out[3] = sp * sy * cr + cp * sr;
        out[4] = -sp * sy * sr + cp * cr;
        out[5] = -sp * cy;
        out[6] = -cp * sy * cr + sp * sr;
        out[7] = cp * sy * sr + sp * cr;
        out[8] = cp * cy;
    },
}

export const matrix4x4 = {
    clone(m: Matrix4x4): Matrix4x4 {
        return [m[0], m[1], m[2], m[3],
        m[4], m[5], m[6], m[7],
        m[8], m[9], m[10], m[11],
        m[12], m[13], m[14], m[15]];
    },
    createIdentity(): Matrix4x4 {
        return [
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ];
    },
    identity(m: Matrix4x4): void {
        m[0] = 1; m[1] = 0; m[2] = 0; m[3] = 0;
        m[4] = 0; m[5] = 1; m[6] = 0; m[7] = 0;
        m[8] = 0; m[9] = 0; m[10] = 1; m[11] = 0;
        m[12] = 0; m[13] = 0; m[14] = 0; m[15] = 1;
    },
    create(
        m00: number, m01: number, m02: number, m03: number,
        m10: number, m11: number, m12: number, m13: number,
        m20: number, m21: number, m22: number, m23: number,
        m30: number, m31: number, m32: number, m33: number): Matrix4x4 {
        return [
            m00, m01, m02, m03,
            m10, m11, m12, m13,
            m20, m21, m22, m23,
            m30, m31, m32, m33
        ];
    },
    multiply(a: Matrix4x4, b: Matrix4x4, out: Matrix4x4): void {
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                out[i * 4 + j] = a[i * 4] * b[j] +
                    a[i * 4 + 1] * b[4 + j] +
                    a[i * 4 + 2] * b[8 + j] +
                    a[i * 4 + 3] * b[12 + j];
            }
        }
    },
    lookAt(eye: Vector3, target: Vector3, up: Vector3, out: Matrix4x4): void {
        let x0: number, x1: number, x2: number;
        let y0: number, y1: number, y2: number;
        let z0: number, z1: number, z2: number;
        const eyex = eye[0], eyey = eye[1], eyez = eye[2];
        const upx = up[0], upy = up[1], upz = up[2];
        const targetx = target[0], targety = target[1], targetz = target[2];
        if (Math.abs(eyex - targetx) < EPSILON &&
            Math.abs(eyey - targety) < EPSILON &&
            Math.abs(eyez - targetz) < EPSILON) {
            this.identity(out);
            return;
        }

        // Calculate the forward vector (opposite direction to viewing direction)
        z0 = eyex - targetx;
        z1 = eyey - targety;
        z2 = eyez - targetz;

        // Normalize the forward vector
        let len = 1 / Math.sqrt(z0 * z0 + z1 * z1 + z2 * z2);
        z0 *= len;
        z1 *= len;
        z2 *= len;

        // Calculate the right vector
        x0 = upy * z2 - upz * z1;
        x1 = upz * z0 - upx * z2;
        x2 = upx * z1 - upy * z0;
        len = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2);
        if (len) {
            len = 1 / len;
            x0 *= len;
            x1 *= len;
            x2 *= len;
        }
        else {
            x0 = 0;
            x1 = 0;
            x2 = 0;
        }

        // Calculate the up vector
        y0 = z1 * x2 - z2 * x1;
        y1 = z2 * x0 - z0 * x2;
        y2 = z0 * x1 - z1 * x0;
        len = Math.sqrt(y0 * y0 + y1 * y1 + y2 * y2);

        if (len) {
            len = 1 / len;
            y0 *= len;
            y1 *= len;
            y2 *= len;
        }
        else {
            y0 = 0;
            y1 = 0;
            y2 = 0;
        }
        // Calculate the orthonormal basis and transpose the matrix
        out[0] = x0; out[1] = y0; out[2] = z0; out[3] = 0;
        out[4] = x1; out[5] = y1; out[6] = z1; out[7] = 0;
        out[8] = x2; out[9] = y2; out[10] = z2; out[11] = 0;

        // Translate the matrix to the eye position
        out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
        out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
        out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
        out[15] = 1;
    },
    /**
     * Generate a perspective projection matrix
     * Normalized device coordinates (NDC) are [0,1] for z
     * @param fovY 
     * @param aspect 
     * @param near 
     * @param far 
     * @param out 
     */
    perspective(fovY: number, aspect: number, near: number, far: number, out: Matrix4x4): void {
        const f = 1 / Math.tan(fovY / 2);
        out[0] = f / aspect; out[1] = 0; out[2] = 0; out[3] = 0;
        out[4] = 0; out[5] = f; out[6] = 0; out[7] = 0;
        out[8] = 0; out[9] = 0; out[10] = far / (near - far); out[11] = -1;
        out[12] = 0; out[13] = 0; out[14] = (2 * far * near) / (near - far); out[15] = 0;
    },
    invert(m: Matrix4x4, out: Matrix4x4): void {
        const m00 = m[0], m01 = m[1], m02 = m[2], m03 = m[3];
        const m10 = m[4], m11 = m[5], m12 = m[6], m13 = m[7];
        const m20 = m[8], m21 = m[9], m22 = m[10], m23 = m[11];
        const m30 = m[12], m31 = m[13], m32 = m[14], m33 = m[15];
        const t00 = m00 * m11 - m01 * m10;
        const t01 = m00 * m12 - m02 * m10;
        const t02 = m00 * m13 - m03 * m10;
        const t03 = m01 * m12 - m02 * m11;
        const t04 = m01 * m13 - m03 * m11;
        const t05 = m02 * m13 - m03 * m12;
        const t06 = m20 * m31 - m21 * m30;
        const t07 = m20 * m32 - m22 * m30;
        const t08 = m20 * m33 - m23 * m30;
        const t09 = m21 * m32 - m22 * m31;
        const t10 = m21 * m33 - m23 * m31;
        const t11 = m22 * m33 - m23 * m32;
        const t12 = 1 / (t00 * t11 - t01 * t10 + t02 * t09 + t03 * t08 - t04 * t07 + t05 * t06);
        out[0] = (m11 * t11 - m12 * t10 + m13 * t09) * t12;
        out[1] = (-m01 * t11 + m02 * t10 - m03 * t09) * t12;
        out[2] = (m31 * t05 - m32 * t04 + m33 * t03) * t12;
        out[3] = (-m21 * t05 + m22 * t04 - m23 * t03) * t12;
        out[4] = (-m10 * t11 + m12 * t08 - m13 * t07) * t12;
        out[5] = (m00 * t11 - m02 * t08 + m03 * t07) * t12;
        out[6] = (-m30 * t05 + m32 * t02 - m33 * t01) * t12;
        out[7] = (m20 * t05 - m22 * t02 + m23 * t01) * t12;
        out[8] = (m10 * t10 - m11 * t08 + m13 * t06) * t12;
        out[9] = (-m00 * t10 + m01 * t08 - m03 * t06) * t12;
        out[10] = (m30 * t04 - m31 * t02 + m33 * t00) * t12;
        out[11] = (-m20 * t04 + m21 * t02 - m23 * t00) * t12;
        out[12] = (-m10 * t09 + m11 * t07 - m12 * t06) * t12;
        out[13] = (m00 * t09 - m01 * t07 + m02 * t06) * t12;
        out[14] = (-m30 * t03 + m31 * t01 - m32 * t00) * t12;
        out[15] = (m20 * t03 - m21 * t01 + m22 * t00) * t12;
    },
}