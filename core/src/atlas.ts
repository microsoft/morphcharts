import { Vector4 } from "./matrix";

export interface IAtlasOptions {
    type: string; // "font", "sdf"
    width: number;
    height: number;
}

export class Atlas {
    protected _width: number;
    protected _height: number;
    protected _type: string; // "font", "sdf"
    public get type(): string { return this._type; }
    public get width(): number { return this._width; }
    public get height(): number { return this._height; }

    constructor(options: IAtlasOptions) {
        this._type = options.type;
        this._width = options.width;
        this._height = options.height;
    }
}

export interface IAtlasVisual {
    atlas: Atlas;
    buffer: Uint8ClampedArray<ArrayBuffer>;
    draw(data: Uint8ClampedArray, width: number, height: number): Vector4;
    debugImage(): string;
}

export abstract class AtlasVisual implements IAtlasVisual {
    protected _atlas: Atlas;
    protected _buffer: Uint8ClampedArray<ArrayBuffer>;
    public get buffer(): Uint8ClampedArray<ArrayBuffer> { return this._buffer; }
    protected _x: number;
    protected _top: Uint16Array;
    public get atlas(): Atlas { return this._atlas; }

    constructor(atlas: Atlas) {
        this._atlas = atlas;
        this._x = 0;
        this._top = new Uint16Array(atlas.width);
    }

    protected _createBuffer() {
        this._buffer = new Uint8ClampedArray(this._atlas.width * this._atlas.height * 4); // RGBA
    }

    protected abstract _getDataURL(): string;

    public debugImage(): string {
        return this._getDataURL();
    }

    public draw(data: Uint8ClampedArray, width: number, height: number): Vector4 {
        const atlasWidth = this._atlas.width;
        const atlatHeight = this._atlas.height;

        // > width?
        if (this._x + width > atlasWidth) {
            this._x = 0;
        }

        // Find max y
        let y = 0;
        for (let x = this._x; x < this._x + width; x++) {
            y = Math.max(y, this._top[x])
        }

        // > height?
        if (y + height > atlatHeight) {
            console.log("height overflow");
        }

        // Update top
        for (let x = this._x; x < this._x + width; x++) {
            this._top[x] = y + height;
        }

        // Texture coordinates
        const textCoords: Vector4 = [
            this._x / atlasWidth, // u0
            y / atlatHeight, // v0
            (this._x + width) / atlasWidth, // u1
            (y + height) / atlatHeight, // v1
        ];

        // Write data
        for (let i = 0; i < data.length; i++) {
            const dataX = i % width;
            const dataY = Math.floor(i / width);
            const offset = (this._x + dataX + (y + dataY) * atlasWidth) * 4;
            this._buffer[offset + 0] = data[i];
            this._buffer[offset + 1] = data[i];
            this._buffer[offset + 2] = data[i];
            this._buffer[offset + 3] = 0xff;
        }

        // Position
        this._x += width;

        // Return texture coordinates
        return textCoords;
    }
}