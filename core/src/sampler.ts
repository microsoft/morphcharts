import { ColorRGB } from "./color.js";

export abstract class Sampler {
    protected _u0: number;
    protected _u1: number;
    protected _v0: number;
    protected _v1: number;
    protected _data: Uint8ClampedArray; // RGB
    protected _width: number;
    protected _height: number;
    constructor(u0: number, u1: number, v0: number, v1: number, width: number, height: number, data: Uint8ClampedArray) {
        this._u0 = u0;
        this._u1 = u1;
        this._v0 = v0;
        this._v1 = v1;
        this._width = width;
        this._height = height;
        this._data = data;
    }

    /**
     * 
     * @param u 
     * @param v 
     * @param channel  // 0-3 for RGBA
     * @returns value [0,0xff]
     */
    public abstract channel(u: number, v: number, channel: number): number;

    /**
     * 
     * @param u 
     * @param v 
     * @param color 
     * @returns color [0,1]
     */
    public abstract color(u: number, v: number, color: ColorRGB): void;
}

export class PointSampler extends Sampler {
    private _offset(u: number, v: number) {
        // Image coordinates
        let i = (this._u0 + u * (this._u1 - this._u0)) * this._width;
        let j = (this._v0 + v * (this._v1 - this._v0)) * this._height;

        // i = Math.floor(i);
        // j = Math.floor(j);
        // Caluclate minimum to avoid precision issues with Math.floor at lower bound
        const uMin = Math.round(this._u0 * this._width);
        const vMin = Math.round(this._v0 * this._height);
        i = Math.max(Math.floor(i), uMin);
        j = Math.max(Math.floor(j), vMin);

        // Offset
        const offset = i * 4 + j * this._width * 4;
        return offset;
    }

    public channel(u: number, v: number, channel: number) {
        const offset = this._offset(u, v);
        return this._data[offset + channel];
    }

    public color(u: number, v: number, color: ColorRGB) {
        const offset = this._offset(u, v);
        color[0] = this._data[offset] / 0xff;
        color[1] = this._data[offset + 1] / 0xff;
        color[2] = this._data[offset + 2] / 0xff;
    }
}

export class BilinearSampler extends Sampler {
    private _offset0: number;
    private _offset1: number;
    private _offset2: number;
    private _offset3: number;
    private _x0Scale: number;
    private _x1Scale: number;
    private _y0Scale: number;
    private _y1Scale: number;
    private _offsets(u: number, v: number) {
        // Image coordinates
        const i = (this._u0 + u * (this._u1 - this._u0)) * this._width;
        const j = (this._v0 + v * (this._v1 - this._v0)) * this._height;

        // i = Math.floor(i);
        // j = Math.floor(j);
        // Caluclate minimum to avoid precision issues with Math.floor at lower bound
        const uMin = Math.round(this._u0 * this._width);
        const vMin = Math.round(this._v0 * this._height);

        // Nearest pixel
        const iFloor = Math.max(Math.floor(i), uMin);
        const jFloor = Math.max(Math.floor(j), vMin);

        // Fraction
        const iFract = i - iFloor;
        const jFract = j - jFloor;

        // Scales
        let x0: number;
        let x1: number;
        let y0: number;
        let y1: number;
        if (iFract < 0.5) {
            x0 = Math.max(iFloor - 1, 0);
            x1 = iFloor;

            // iFract [0,0.5]
            this._x0Scale = 0.5 - iFract; // [0.5,0]
            this._x1Scale = 0.5 + iFract; // [0.5,1]
        }
        else {
            x0 = iFloor;
            x1 = Math.min(iFloor + 1, this._width - 1);

            // iFract [0.5, 1]
            this._x0Scale = 1.5 - iFract; // [1,0.5]
            this._x1Scale = iFract - 0.5; // [0,0.5]
        }

        if (jFract < 0.5) {
            y0 = Math.max(jFloor - 1, 0);
            y1 = jFloor;

            // jFract [0,0.5]
            this._y0Scale = 0.5 - jFract; // [0.5,0]
            this._y1Scale = 0.5 + jFract; // [0.5,1]
        }
        else {
            y0 = jFloor;
            y1 = Math.min(jFloor + 1, this._height - 1);

            // jFract [0.5,1]
            this._y0Scale = 1.5 - jFract; // [1,0.5]
            this._y1Scale = jFract - 0.5; // [0,0.5]
        }

        // Offsets
        this._offset0 = x0 * 4 + y0 * this._width * 4;
        this._offset1 = x1 * 4 + y0 * this._width * 4;
        this._offset2 = x0 * 4 + y1 * this._width * 4;
        this._offset3 = x1 * 4 + y1 * this._width * 4;
    }

    public channel(u: number, v: number, channel: number) {
        this._offsets(u, v);
        let value0 = this._data[this._offset0 + channel];
        let value1 = this._data[this._offset1 + channel];
        let value2 = this._data[this._offset2 + channel];
        let value3 = this._data[this._offset3 + channel];
        let r0 = this._x0Scale * value0 + this._x1Scale * value1;
        let r1 = this._x0Scale * value2 + this._x1Scale * value3;
        return this._y0Scale * r0 + this._y1Scale * r1;
    }

    public color(u: number, v: number, color: ColorRGB) {
        this._offsets(u, v);
        let value0 = this._data[this._offset0] / 0xff;
        let value1 = this._data[this._offset1] / 0xff;
        let value2 = this._data[this._offset2] / 0xff;
        let value3 = this._data[this._offset3] / 0xff;
        let r0 = this._x0Scale * value0 + this._x1Scale * value1;
        let r1 = this._x0Scale * value2 + this._x1Scale * value3;
        color[0] = this._y0Scale * r0 + this._y1Scale * r1;

        value0 = this._data[this._offset0 + 1] / 0xff;
        value1 = this._data[this._offset1 + 1] / 0xff;
        value2 = this._data[this._offset2 + 1] / 0xff;
        value3 = this._data[this._offset3 + 1] / 0xff;
        r0 = this._x0Scale * value0 + this._x1Scale * value1;
        r1 = this._x0Scale * value2 + this._x1Scale * value3;
        color[1] = this._y0Scale * r0 + this._y1Scale * r1;

        value0 = this._data[this._offset0 + 2] / 0xff;
        value1 = this._data[this._offset1 + 2] / 0xff;
        value2 = this._data[this._offset2 + 2] / 0xff;
        value3 = this._data[this._offset3 + 2] / 0xff;
        r0 = this._x0Scale * value0 + this._x1Scale * value1;
        r1 = this._x0Scale * value2 + this._x1Scale * value3;
        color[2] = this._y0Scale * r0 + this._y1Scale * r1;
    }
}