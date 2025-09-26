import { IAtlasVisual } from "./atlas.js";
import { Font, IFontOptions } from "./font.js";
import { Vector4 } from "./matrix.js";

export interface ITextMetrics {
    readonly actualBoundingBoxAscent: number;
    readonly actualBoundingBoxDescent: number;
    readonly actualBoundingBoxRight: number;
    readonly baseline: number; // Ratio of descent to ascent, [0,1]
    readonly width: number;
}

export interface IGlyph {
    key: number; // Char code
    width: number; // px
    height: number; // px
    left: number; // px
    top: number; // px
    advance: number; // px
    baseline: number;
    edgeValue: number; // px
    border: number; // px
    maxDistance: number; // px (required to normalize stroke width)
    texCoords: Vector4; // Texture coordinates (u0, v0, u1, v1), [0,1]
    distances: Uint8ClampedArray; // SDF distances, [0,0xff]
}

export interface IGlyphRasterizerOptions {
    size: number; // Font size, px
    border: number; // SDF border, px
    edgeValue: number; // Edge value for distance field, [0,0xff]
    maxDistance: number; // Maximum distance for distance field, [0,0xff]
}

export class GlyphRasterizer {
    protected _size: number;
    public get size(): number { return this._size; }
    protected _border: number;
    public get border(): number { return this._border; }
    protected _edgeValue: number;
    public get edgeValue(): number { return this._edgeValue; }
    protected _maxDistance: number;
    public get maxDistance(): number { return this._maxDistance; }

    constructor(options: IGlyphRasterizerOptions) {
        this._size = options.size;
        this._border = options.border;
        this._edgeValue = options.edgeValue;
        this._maxDistance = options.maxDistance;
    }
}

export interface IGlyphRasterizerVisual {
    atlasVisual: IAtlasVisual;
    glyphRasterizer: GlyphRasterizer;
    measure(font: Font, text: string): { width: number, height: number, baseline: number };
    draw(font: Font, char: string): IGlyph;
}

class GlyphCache {
    private _glyphs: { [key: string]: IGlyph };
    public get glyphs(): { [key: string]: IGlyph } { return this._glyphs; }
    constructor() {
        this._glyphs = {};
    }
}

export abstract class GlyphRasterizerVisual implements IGlyphRasterizerVisual {
    protected _glyphRasterizer: GlyphRasterizer;
    public get glyphRasterizer(): GlyphRasterizer { return this._glyphRasterizer; }
    protected _atlasVisual: IAtlasVisual;
    public get atlasVisual(): IAtlasVisual { return this._atlasVisual; }
    protected _glyphCaches: { [key: string]: GlyphCache };
    protected _size: number
    protected _gridOuter: Float64Array;
    protected _gridInner: Float64Array;
    protected _f: Float64Array;
    protected _z: Float64Array;
    protected _v: Uint16Array;

    constructor(glyphRasterizer: GlyphRasterizer, atlasVisual: IAtlasVisual) {
        this._glyphRasterizer = glyphRasterizer;
        this._atlasVisual = atlasVisual;

        // Caches
        this._glyphCaches = {};

        // Buffers
        this._size = glyphRasterizer.size + glyphRasterizer.border * 4; // Add border for distance field, glyph may be bigger than font size
        this._gridOuter = new Float64Array(this._size * this._size);
        this._gridInner = new Float64Array(this._size * this._size);
        this._f = new Float64Array(this._size);
        this._z = new Float64Array(this._size + 1);
        this._v = new Uint16Array(this._size);
    }

    protected abstract _measure(font: IFontOptions, size: number, char: string): ITextMetrics; // Measure text size, used for glyph rasterization
    protected abstract _draw(font: IFontOptions, size: number, char: string, glyph: IGlyph): Uint8ClampedArray; // Draw glyph to image, used for SDF generation

    public measure(font: IFontOptions, text: string): { width: number, height: number, baseline: number } {
        const size = { width: 0, height: 0, baseline: 0 };
        // Handle non-BMP chars
        for (const char of text) {
            const glyph = this.draw(font, char);
            size.width += glyph.advance;
            size.baseline = glyph.baseline; // Same for all glyphs in font
        }
        return size;
    }

    public draw(font: IFontOptions, char: string): IGlyph {
        // Check cache
        const key = Font.key(font);
        let glyphCache = this._glyphCaches[key];
        if (glyphCache) {
            const glyph = glyphCache.glyphs[char];
            if (glyph) { return glyph; }
        }
        else {
            glyphCache = new GlyphCache();
            this._glyphCaches[key] = glyphCache;
        }

        const fontSize = this._glyphRasterizer.size; // Font size for rasterization, px
        const border = this._glyphRasterizer.border;
        const edgeValue = this._glyphRasterizer.edgeValue;
        const maxDistance = this._glyphRasterizer.maxDistance;
        const gridInner = this._gridInner;
        const gridOuter = this._gridOuter;
        const f = this._f;
        const z = this._z;
        const v = this._v;

        // Measure
        const textMetrics = this._measure(font, fontSize, char);
        const glyph: IGlyph = {
            key: char.codePointAt(0),
            left: 0,
            width: Math.ceil(textMetrics.actualBoundingBoxRight),
            height: Math.ceil(textMetrics.actualBoundingBoxAscent + textMetrics.actualBoundingBoxDescent),
            top: Math.ceil(textMetrics.actualBoundingBoxAscent),
            advance: textMetrics.width,
            baseline: textMetrics.baseline,
            texCoords: [0, 0, 0, 0],
            distances: new Uint8ClampedArray(0),
            border: border,
            maxDistance: maxDistance,
            edgeValue: edgeValue,
        };

        // Clamp to canvas size
        glyph.width = Math.min(this._size - border, glyph.width);
        glyph.height = Math.min(this._size - border, glyph.height);

        // Add border
        const width = glyph.width + 2 * border;
        const height = glyph.height + 2 * border;

        // Draw
        if (glyph.width > 0 && glyph.height > 0) { // HTML canvas renders spaces as 0 width
            const imgData = this._draw(font, fontSize, char, glyph);

            // Distance buffer
            const length = width * height;
            const distances = new Uint8ClampedArray(length);
            for (let i = 0; i < length; i++) {
                gridOuter[i] = Number.MAX_VALUE;
                gridInner[i] = 0;
            }
            for (let y = 0; y < glyph.height; y++) {
                for (let x = 0; x < glyph.width; x++) {
                    const a = imgData[4 * (y * glyph.width + x) + 3] / 0xff;
                    // Ignore fully-outside pixels
                    if (a > 0) {
                        const j = (y + border) * width + x + border;
                        // Fully-inside
                        if (a == 1) {
                            gridOuter[j] = 0;
                            gridInner[j] = Number.MAX_VALUE;
                        } else {
                            // Edge
                            const d = 0.5 - a;
                            gridOuter[j] = d > 0 ? d * d : 0;
                            gridInner[j] = d < 0 ? d * d : 0;
                        }
                    }
                }
            }
            this._edt(gridOuter, 0, 0, width, height, width, f, v, z);
            this._edt(gridInner, border, border, glyph.width, glyph.height, width, f, v, z);
            for (let i = 0; i < length; i++) {
                const distance = Math.sqrt(gridOuter[i]) - Math.sqrt(gridInner[i]);
                distances[i] = Math.round(edgeValue - distance * 0xff / maxDistance);
            }
            glyph.distances = distances;

            // Add to atlas, and set texture coordinates
            glyph.texCoords = this._atlasVisual.draw(distances, width, height);
        }

        // Set glyph size
        glyph.width = width;
        glyph.height = height;

        // Normalize scale by font size
        glyph.width /= fontSize;
        glyph.height /= fontSize;
        glyph.left /= fontSize;
        glyph.top /= fontSize;
        glyph.advance /= fontSize;
        glyph.border /= fontSize;

        // Add to cache
        glyphCache.glyphs[char] = glyph;

        // Return glyph
        return glyph;
    }

    protected _edt(data: Float64Array, x0: number, y0: number, width: number, height: number, gridSize: number, f: Float64Array, v: Uint16Array, z: Float64Array) {
        for (let x = x0; x < x0 + width; x++) this._edt1d(data, y0 * gridSize + x, gridSize, height, f, v, z);
        for (let y = y0; y < y0 + height; y++) this._edt1d(data, y * gridSize + x0, 1, width, f, v, z);
    }

    protected _edt1d(grid: Float64Array, offset: number, stride: number, n: number, f: Float64Array, v: Uint16Array, z: Float64Array) {
        v[0] = 0;
        z[0] = -Number.MAX_VALUE;
        z[1] = Number.MAX_VALUE;
        f[0] = grid[offset];
        for (let q = 1, k = 0, s = 0; q < n; q++) {
            f[q] = grid[offset + q * stride];
            const q2 = q * q;
            do {
                const r = v[k];
                s = (f[q] - f[r] + q2 - r * r) / (q - r) / 2;
            } while (s <= z[k] && --k > -1);
            k++;
            v[k] = q;
            z[k] = s;
            z[k + 1] = Number.MAX_VALUE;
        }
        for (let q = 0, k = 0; q < n; q++) {
            while (z[k + 1] < q) {
                k++;
            }
            const r = v[k];
            const qr = q - r;
            grid[offset + q * stride] = f[r] + qr * qr;
        }
    }
}