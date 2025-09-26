import * as Core from "core";
import { AtlasVisual } from "./atlas.js";

export class GlyphRasterizerVisual extends Core.GlyphRasterizerVisual implements Core.IGlyphRasterizerVisual {
    private _context: CanvasRenderingContext2D;

    constructor(glyphRasterizer: Core.GlyphRasterizer, atlasVisual: AtlasVisual) {
        super(glyphRasterizer, atlasVisual);

        const canvas = document.createElement("canvas");
        canvas.width = this._size;
        canvas.height = this._size;
        this._context = canvas.getContext("2d", { willReadFrequently: true });
        // this._context.textBaseline = "middle"; // Use middle baseline for all glyphs
        this._context.textAlign = "left"; // Handle RTL
        this._context.fillStyle = "black";
    }

    protected _measure(options: Core.IFontOptions, size: number, char: string): Core.ITextMetrics {
        // CSS font specification
        this._context.font = `${options.style} ${options.weight} ${size}px ${options.name}`;

        // Measure
        const metrics = this._context.measureText(char);
        return {
            actualBoundingBoxRight: metrics.actualBoundingBoxRight,
            actualBoundingBoxAscent: metrics.actualBoundingBoxAscent,
            actualBoundingBoxDescent: metrics.actualBoundingBoxDescent,
            baseline: metrics.fontBoundingBoxDescent / metrics.fontBoundingBoxAscent,
            width: metrics.width,
        };
    }

    protected _draw(options: Core.IFontOptions, size: number, char: string, glyph: Core.IGlyph): Uint8ClampedArray {
        // CSS font specification
        this._context.font = `${options.style} ${options.weight} ${size}px ${options.name} `;

        // Draw
        const border = this.glyphRasterizer.border;
        this._context.clearRect(border, border, glyph.width, glyph.height);
        this._context.fillText(char, border, border + glyph.top);
        return this._context.getImageData(border, border, glyph.width, glyph.height).data;
    }
}