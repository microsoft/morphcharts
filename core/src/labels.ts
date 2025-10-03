// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

// text metrics (+ve y is up)
//
//        -   .------------.
// border |   |            |
//        - - |  .------.  | -
//          | |  |      |  | |
//   height | |  |      |  | | top
//          | |  |      |  | |
//          | |  |------|  | - <--baseline 
//        - - |  '------'  |
// border |   |            |
//        -   '------------'
//            |--|      |--|
//           border    border
//
// vertical alignment  
//       center             top                 bottom
//     (baseline)                              .------.
//      .------.                               |      |
//      |      |                               |      |
//      |      |                               |      |
//      |      |                               |------|
// x----|------| 0   x----.------. -top   x----'------' (height - top)
//      '------'          |      |        
//                        |      |
//                        |      |
//                        |------|
//                        '------'
//
// provide an offsetY to allow a vertical shift so I can measure maxTop, maxHeight for multiple glyphs then, e.g. center-align with mid-point between baseline and maxTop instead of baseline
//      .------.
//      |      |
// x----|      | -
//      |      | | center align, offsetY = -maxTop / 2
//      |------| -
//      '------'
//
// Vertical alignment aligns origin with top, center or bottom of text blcok (width = maxWidth, height = lines * lineHeight)
// Baseline is placed at vertical center of this line, then moved down by (maxGlypTop / 2) for the line
// Since each line might have different maxGlyphTop, an optional parameter can provide a maxGlyphTop for all lines (client needs to measure it)
// I could add a VerticalTextAlignment = Baseline | MidTop

import { Color, ColorRGBA } from "./color.js";
import { Config } from "./config.js";
import { IFontOptions } from "./font.js";
import { IGlyphRasterizerVisual } from "./glyph.js";
import { Material } from "./material.js";
import { Quaternion, vector3, Vector3 } from "./matrix.js";
import { Pick } from "./pick.js";
import { Text } from "./text.js";
import { Time } from "./time.js";
import { UnitVertex } from "./vertex.js";

export interface ILabelSetOptions {
    readonly maxGlyphs: number;

    // Labels
    labels: string[][];

    // Font
    font?: string;
    fonts?: string[];
    fontWeight?: number;
    fontWeights?: ArrayLike<number>;
    fontStyle?: string;
    fontStyles?: string[];

    // Position
    positionsX?: ArrayLike<number>;
    positionsY?: ArrayLike<number>;
    positionsZ?: ArrayLike<number>;
    positionScalingX?: number;
    positionScalingY?: number;
    positionScalingZ?: number;

    // Size
    size?: number;
    sizes?: ArrayLike<number>;
    sizeScaling?: number;
    minSize?: number;
    strokeWidth?: number;
    strokeWidths?: ArrayLike<number>;

    // Rotation
    rotation?: Quaternion;
    rotations?: ArrayLike<number>;

    // Alignment
    horizontalAlignment?: string;
    verticalAlignment?: string;
    horizontalAlignments?: string[];
    verticalAlignments?: string[];
    maxGlyphTop?: number;

    // Offset
    offsetX?: number;
    offsetY?: number;
    offsetZ?: number;
    offsetsX?: ArrayLike<number>;
    offsetsY?: ArrayLike<number>;
    offsetsZ?: ArrayLike<number>;
    offsetScalingX?: number;
    offsetScalingY?: number;
    offsetScalingZ?: number;
    offsetScalingsX?: ArrayLike<number>;
    offsetScalingsY?: ArrayLike<number>;
    offsetScalingsZ?: ArrayLike<number>;

    // Bounds
    minBoundsX?: number;
    minBoundsY?: number;
    minBoundsZ?: number;
    maxBoundsX?: number;
    maxBoundsY?: number;
    maxBoundsZ?: number;

    // Reverse
    reverseX?: boolean;
    reverseY?: boolean;
    reverseZ?: boolean;

    // Material
    material?: Material;
    materials?: Material[];

    // Segment
    segmentColor?: ColorRGBA;
    segmentColors?: ColorRGBA[];
}

export class LabelSet {
    protected _hasChanged: boolean;
    public hasChangedCallback: () => void;

    // Buffer
    protected _maxGlyphs: number;
    public get maxGlyphs(): number { return this._maxGlyphs; }
    protected _buffer: ArrayBuffer;
    public get buffer(): ArrayBuffer { return this._buffer; }
    protected _dataView: DataView;
    public get dataView(): DataView { return this._dataView; }

    // Position
    protected _positionsX: ArrayLike<number>;
    public get positionsX(): ArrayLike<number> { return this._positionsX; }
    public set positionsX(value: ArrayLike<number>) { if (this._positionsX != value) { this._positionsX = value; this._hasChanged = true; } }
    protected _positionsY: ArrayLike<number>;
    public get positionsY(): ArrayLike<number> { return this._positionsY; }
    public set positionsY(value: ArrayLike<number>) { if (this._positionsY != value) { this._positionsY = value; this._hasChanged = true; } }
    protected _positionsZ: ArrayLike<number>;
    public get positionsZ(): ArrayLike<number> { return this._positionsZ; }
    public set positionsZ(value: ArrayLike<number>) { if (this._positionsZ != value) { this._positionsZ = value; this._hasChanged = true; } }
    protected _positionScalingX: number;
    public get positionScalingX(): number { return this._positionScalingX; }
    public set positionScalingX(value: number) { if (this._positionScalingX != value) { this._positionScalingX = value; this._hasChanged = true; } }
    protected _positionScalingY: number;
    public get positionScalingY(): number { return this._positionScalingY; }
    public set positionScalingY(value: number) { if (this._positionScalingY != value) { this._positionScalingY = value; this._hasChanged = true; } }
    protected _positionScalingZ: number;
    public get positionScalingZ(): number { return this._positionScalingZ; }
    public set positionScalingZ(value: number) { if (this._positionScalingZ != value) { this._positionScalingZ = value; this._hasChanged = true; } }
    protected _reverseX: boolean;
    public get reverseX(): boolean { return this._reverseX; }
    public set reverseX(value: boolean) { if (this._reverseX != value) { this._reverseX = value; this._hasChanged = true; } }
    protected _reverseY: boolean;
    public get reverseY(): boolean { return this._reverseY; }
    public set reverseY(value: boolean) { if (this._reverseY != value) { this._reverseY = value; this._hasChanged = true; } }
    protected _reverseZ: boolean;
    public get reverseZ(): boolean { return this._reverseZ; }
    public set reverseZ(value: boolean) { if (this._reverseZ != value) { this._reverseZ = value; this._hasChanged = true; } }

    // Size
    protected _size: number;
    public get size(): number { return this._size; }
    public set size(value: number) { if (this._size != value) { this._size = value; this._hasChanged = true; } }
    protected _sizes: ArrayLike<number>;
    public get sizes(): ArrayLike<number> { return this._sizes; }
    public set sizes(value: ArrayLike<number>) { if (this._sizes != value) { this._sizes = value; this._hasChanged = true; } }
    protected _sizeScaling: number;
    public get sizeScaling(): number { return this._sizeScaling; }
    public set sizeScaling(value: number) { if (this._sizeScaling != value) { this._sizeScaling = value; this._hasChanged = true; } }
    protected _minSize: number;
    public get minSize(): number { return this._minSize; }
    public set minSize(value: number) { if (this._minSize != value) { this._minSize = value; this._hasChanged = true; } }
    protected _strokeWidth: number;
    public get strokeWidth(): number { return this._strokeWidth; }
    public set strokeWidth(value: number) { if (this._strokeWidth != value) { this._strokeWidth = value; this._hasChanged = true; } }
    protected _strokeWidths: ArrayLike<number>;
    public get strokeWidths(): ArrayLike<number> { return this._strokeWidths; }
    public set strokeWidths(value: ArrayLike<number>) { if (this._strokeWidths != value) { this._strokeWidths = value; this._hasChanged = true; } }

    // Rotation
    protected _rotation: Quaternion;
    public get rotation(): Quaternion { return this._rotation; }
    public set rotation(value: Quaternion) { if (this._rotation != value) { this._rotation = value; this._hasChanged = true; } }
    protected _rotations: ArrayLike<number>;
    public get rotations(): ArrayLike<number> { return this._rotations; }
    public set rotations(value: ArrayLike<number>) { if (this._rotations != value) { this._rotations = value; this._hasChanged = true; } }

    // Offset
    protected _offsetX: number;
    public get offsetX(): number { return this._offsetX; }
    public set offsetX(value: number) { if (this._offsetX != value) { this._offsetX = value; this._hasChanged = true; } }
    protected _offsetY: number;
    public get offsetY(): number { return this._offsetY; }
    public set offsetY(value: number) { if (this._offsetY != value) { this._offsetY = value; this._hasChanged = true; } }
    protected _offsetZ: number;
    public get offsetZ(): number { return this._offsetZ; }
    public set offsetZ(value: number) { if (this._offsetZ != value) { this._offsetZ = value; this._hasChanged = true; } }
    protected _offsetsX: ArrayLike<number>;
    public get offsetsX(): ArrayLike<number> { return this._offsetsX; }
    public set offsetsX(value: ArrayLike<number>) { if (this._offsetsX != value) { this._offsetsX = value; this._hasChanged = true; } }
    protected _offsetsY: ArrayLike<number>;
    public get offsetsY(): ArrayLike<number> { return this._offsetsY; }
    public set offsetsY(value: ArrayLike<number>) { if (this._offsetsY != value) { this._offsetsY = value; this._hasChanged = true; } }
    protected _offsetsZ: ArrayLike<number>;
    public get offsetsZ(): ArrayLike<number> { return this._offsetsZ; }
    public set offsetsZ(value: ArrayLike<number>) { if (this._offsetsZ != value) { this._offsetsZ = value; this._hasChanged = true; } }
    protected _offsetScalingX: number;
    public get offsetScalingX(): number { return this._offsetScalingX; }
    public set offsetScalingX(value: number) { if (this._offsetScalingX != value) { this._offsetScalingX = value; this._hasChanged = true; } }
    protected _offsetScalingY: number;
    public get offsetScalingY(): number { return this._offsetScalingY; }
    public set offsetScalingY(value: number) { if (this._offsetScalingY != value) { this._offsetScalingY = value; this._hasChanged = true; } }
    protected _offsetScalingZ: number;
    public get offsetScalingZ(): number { return this._offsetScalingZ; }
    public set offsetScalingZ(value: number) { if (this._offsetScalingZ != value) { this._offsetScalingZ = value; this._hasChanged = true; } }

    // Bounds
    protected _minBoundsX: number;
    public get minBoundsX(): number { return this._minBoundsX; }
    public set minBoundsX(value: number) { if (this._minBoundsX != value) { this._minBoundsX = value; this._hasChanged = true; } }
    protected _minBoundsY: number;
    public get minBoundsY(): number { return this._minBoundsY; }
    public set minBoundsY(value: number) { if (this._minBoundsY != value) { this._minBoundsY = value; this._hasChanged = true; } }
    protected _minBoundsZ: number;
    public get minBoundsZ(): number { return this._minBoundsZ; }
    public set minBoundsZ(value: number) { if (this._minBoundsZ != value) { this._minBoundsZ = value; this._hasChanged = true; } }
    protected _maxBoundsX: number;
    public get maxBoundsX(): number { return this._maxBoundsX; }
    public set maxBoundsX(value: number) { if (this._maxBoundsX != value) { this._maxBoundsX = value; this._hasChanged = true; } }
    protected _maxBoundsY: number;
    public get maxBoundsY(): number { return this._maxBoundsY; }
    public set maxBoundsY(value: number) { if (this._maxBoundsY != value) { this._maxBoundsY = value; this._hasChanged = true; } }
    protected _maxBoundsZ: number;
    public get maxBoundsZ(): number { return this._maxBoundsZ; }
    public set maxBoundsZ(value: number) { if (this._maxBoundsZ != value) { this._maxBoundsZ = value; this._hasChanged = true; } }

    // Material
    protected _material: Material;
    public get material(): Material { return this._material; }
    public set material(value: Material) { if (this._material != value) { this._material = value; this._hasChanged = true; } }
    protected _materials: Material[];
    public get materials(): Material[] { return this._materials; }
    public set materials(value: Material[]) { if (this._materials != value) { this._materials = value; this._hasChanged = true; } }

    // Segment
    protected _segmentColor: ColorRGBA;
    public get segmentColor(): ColorRGBA { return this._segmentColor; }
    public set segmentColor(value: ColorRGBA) { if (this._segmentColor != value) { this._segmentColor = value; this._hasChanged = true; } }
    protected _segmentColors: ColorRGBA[];
    public get segmentColors(): ColorRGBA[] { return this._segmentColors; }
    public set segmentColors(value: ColorRGBA[]) { if (this._segmentColors != value) { this._segmentColors = value; this._hasChanged = true; } }

    // Alignment
    protected _horizontalAlignment: string;
    public get horizontalAlignment(): string { return this._horizontalAlignment; }
    public set horizontalAlignment(value: string) { if (this._horizontalAlignment != value) { this._horizontalAlignment = value; this._hasChanged = true; } }
    protected _horizontalAlignments: string[];
    public get horizontalAlignments(): string[] { return this._horizontalAlignments; }
    public set horizontalAlignments(value: string[]) { if (this._horizontalAlignments != value) { this._horizontalAlignments = value; this._hasChanged = true; } }
    protected _verticalAlignment: string;
    public get verticalAlignment(): string { return this._verticalAlignment; }
    public set verticalAlignment(value: string) { if (this._verticalAlignment != value) { this._verticalAlignment = value; this._hasChanged = true; } }
    protected _verticalAlignments: string[];
    public get verticalAlignments(): string[] { return this._verticalAlignments; }
    public set verticalAlignments(value: string[]) { if (this._verticalAlignments != value) { this._verticalAlignments = value; this._hasChanged = true; } }
    protected _maxGlyphTop: number;
    public get maxGlyphTop(): number { return this._maxGlyphTop; }
    public set maxGlyphTop(value: number) { if (this._maxGlyphTop != value) { this._maxGlyphTop = value; this._hasChanged = true; } }

    // Font
    protected _font: string;
    public get font(): string { return this._font; }
    public set font(value: string) { if (this._font != value) { this._font = value; this._hasChanged = true; } }
    protected _fonts: string[];
    public get fonts(): string[] { return this._fonts; }
    public set fonts(value: string[]) { if (this._fonts != value) { this._fonts = value; this._hasChanged = true; } }
    protected _fontWeight: number;
    public get fontWeight(): number { return this._fontWeight; }
    public set fontWeight(value: number) { if (this._fontWeight != value) { this._fontWeight = value; this._hasChanged = true; } }
    protected _fontWeights: ArrayLike<number>;
    public get fontWeights(): ArrayLike<number> { return this._fontWeights; }
    public set fontWeights(value: ArrayLike<number>) { if (this._fontWeights != value) { this._fontWeights = value; this._hasChanged = true; } }
    protected _fontStyle: string;
    public get fontStyle(): string { return this._fontStyle; }
    public set fontStyle(value: string) { if (this._fontStyle != value) { this._fontStyle = value; this._hasChanged = true; } }
    protected _fontStyles: string[];
    public get fontStyles(): string[] { return this._fontStyles; }
    public set fontStyles(value: string[]) { if (this._fontStyles != value) { this._fontStyles = value; this._hasChanged = true; } }

    // Labels
    protected _labels: string[][];
    public get labels(): string[][] { return this._labels; }
    public set labels(value: string[][]) { if (this._labels != value) { this._labels = value; this._hasChanged = true; } }

    constructor(options: ILabelSetOptions) {
        // Buffers
        this._maxGlyphs = options.maxGlyphs;
        this._buffer = new ArrayBuffer(UnitVertex.SIZE_BYTES * this._maxGlyphs * 4);
        this._dataView = new DataView(this._buffer);

        // Labels
        this._labels = options.labels;

        // Font
        this._font = options.font;
        this._fonts = options.fonts;
        this._fontWeight = options.fontWeight;
        this._fontWeights = options.fontWeights;
        this._fontStyle = options.fontStyle;
        this._fontStyles = options.fontStyles;

        // Position
        this._positionsX = options.positionsX;
        this._positionsY = options.positionsY;
        this._positionsZ = options.positionsZ;
        this._positionScalingX = options.positionScalingX;
        this._positionScalingY = options.positionScalingY;
        this._positionScalingZ = options.positionScalingZ;
        this._reverseX = options.reverseX;
        this._reverseY = options.reverseY;
        this._reverseZ = options.reverseZ;

        // Size
        this._size = options.size;
        this._sizes = options.sizes;
        this._sizeScaling = options.sizeScaling;
        this._minSize = options.minSize;
        this._strokeWidth = options.strokeWidth;
        this._strokeWidths = options.strokeWidths;

        // Rotation
        this._rotation = options.rotation;
        this._rotations = options.rotations;

        // Offset
        this._offsetX = options.offsetX;
        this._offsetY = options.offsetY;
        this._offsetZ = options.offsetZ;
        this._offsetsX = options.offsetsX;
        this._offsetsY = options.offsetsY;
        this._offsetsZ = options.offsetsZ;
        this._offsetScalingX = options.offsetScalingX;
        this._offsetScalingY = options.offsetScalingY;
        this._offsetScalingZ = options.offsetScalingZ;

        // Alignment
        this._horizontalAlignment = options.horizontalAlignment;
        this._verticalAlignment = options.verticalAlignment;
        this._horizontalAlignments = options.horizontalAlignments;
        this._verticalAlignments = options.verticalAlignments;
        this._maxGlyphTop = options.maxGlyphTop;

        // Bounds
        this._minBoundsX = options.minBoundsX;
        this._minBoundsY = options.minBoundsY;
        this._minBoundsZ = options.minBoundsZ;
        this._maxBoundsX = options.maxBoundsX;
        this._maxBoundsY = options.maxBoundsY;
        this._maxBoundsZ = options.maxBoundsZ;

        // Material
        this._material = options.material;
        this._materials = options.materials;

        // Segment
        this._segmentColor = options.segmentColor;
        this._segmentColors = options.segmentColors;

        // Changed
        this._hasChanged = true;
    }

    public update() {
        if (this._hasChanged) {
            this._hasChanged = false;

            if (this.hasChangedCallback) {
                this.hasChangedCallback();
            }
        }
    }
}

export interface ILabelSetVisual {
    labelSet: LabelSet;
    isVisible: boolean;
    update(): void;
}

export class LabelSetVisual implements ILabelSetVisual {
    protected _hasChanged: boolean;
    protected _isInitialized: boolean;
    protected _glyphRasterizerVisual: IGlyphRasterizerVisual;
    protected _isVisible: boolean;
    public get isVisible(): boolean { return this._isVisible; }
    protected _labelSet: LabelSet;
    public get labelSet(): LabelSet { return this._labelSet; }
    public hasChangedCallback: () => void;

    constructor(labelSet: LabelSet, glyphRasterizerVisual: IGlyphRasterizerVisual) {
        this._labelSet = labelSet;
        this._glyphRasterizerVisual = glyphRasterizerVisual;
        this._isVisible = true;
        this._hasChanged = true;
        labelSet.hasChangedCallback = () => { this._hasChanged = true; };
    }

    public update() {
        if (this._hasChanged && this._isVisible) {
            this._hasChanged = false;
            const start = performance.now();

            // Bounds
            const maxBoundsX = this._labelSet.maxBoundsX || 1;
            const maxBoundsY = this._labelSet.maxBoundsY || 1;
            const maxBoundsZ = this._labelSet.maxBoundsZ || 1;
            const minBoundsX = this._labelSet.minBoundsX || 0;
            const minBoundsY = this._labelSet.minBoundsY || 0;
            const minBoundsZ = this._labelSet.minBoundsZ || 0;
            const modelSizeX = maxBoundsX - minBoundsX;
            const modelSizeY = maxBoundsY - minBoundsY;
            const modelSizeZ = maxBoundsZ - minBoundsZ;
            const maxBounds = Math.max(modelSizeX, Math.max(modelSizeY, modelSizeZ));
            const boundsScaling = maxBounds == 0 ? 1 : 1 / maxBounds;
            const modelOriginX = (minBoundsX + maxBoundsX) / 2;
            const modelOriginY = (minBoundsY + maxBoundsY) / 2;
            const modelOriginZ = (minBoundsZ + maxBoundsZ) / 2;

            // Size
            const size = this._labelSet.size;
            const sizes = this._labelSet.sizes;
            const sizeScaling = this._labelSet.sizeScaling || 1;
            const _strokeWidth = this._labelSet.strokeWidth || 0;
            const strokeWidths = this._labelSet.strokeWidths;

            // Position
            const positionScalingX = this._labelSet.positionScalingX || 1;
            const positionScalingY = this._labelSet.positionScalingY || 1;
            const positionScalingZ = this._labelSet.positionScalingZ || 1;
            const positionsX = this._labelSet.positionsX;
            const positionsY = this._labelSet.positionsY;
            const positionsZ = this._labelSet.positionsZ;
            const reverseX = this._labelSet.reverseX;
            const reverseY = this._labelSet.reverseY;
            const reverseZ = this._labelSet.reverseZ;

            // Offset
            const offsetScalingX = this._labelSet.offsetScalingX || 1;
            const offsetScalingY = this._labelSet.offsetScalingY || 1;
            const offsetScalingZ = this._labelSet.offsetScalingZ || 1;
            const offsetsX = this._labelSet.offsetsX;
            const offsetsY = this._labelSet.offsetsY;
            const offsetsZ = this._labelSet.offsetsZ;
            const _offsetX = this._labelSet.offsetX || 0;
            const _offsetY = this._labelSet.offsetY || 0;
            const _offsetZ = this._labelSet.offsetZ || 0;

            // Rotation
            const rotationOffset: Vector3 = [0, 0, 0];
            const rotation: Quaternion = [0, 0, 0, 1]; // Ensure quaternion identity is written if no roration specified

            // Labels
            let glyphs = 0;
            const labels = this._labelSet.labels;
            const maxGlyphs = this._labelSet.maxGlyphs;
            const position: Vector3 = [0, 0, 0];
            const _scale: Vector3 = [0, 0, 0];
            const sdfBuffer = this._glyphRasterizerVisual.glyphRasterizer.edgeValue;
            const sdfSize = this._glyphRasterizerVisual.glyphRasterizer.size;
            const sdfMaxDistance = this._glyphRasterizerVisual.glyphRasterizer.maxDistance;
            for (let i = 0; i < labels.length; i++) {
                const labelLines = labels[i];
                // Label lines
                // TODO: Measure all lines in first pass to get max width for left, right alignment
                for (let j = 0; j < labelLines.length; j++) {

                    // Prevent overflow
                    const label = Text.truncate(labelLines[j], maxGlyphs - glyphs);

                    // Fonts
                    const font: IFontOptions = {
                        name: this._labelSet.fonts ? this._labelSet.fonts[i] : this._labelSet.font || Config.font,
                        weight: this._labelSet.fontWeights ? this._labelSet.fontWeights[i] : this._labelSet.fontWeight || Config.fontWeight,
                        style: this._labelSet.fontStyles ? this._labelSet.fontStyle[i] : this._labelSet.fontStyle || Config.fontStyle,
                    };

                    // Size
                    let scale = (sizes ? sizes[i] : size);
                    // Stroke width is in same units as size
                    const sdfHalo = 0xff * (sdfSize / sdfMaxDistance) * (strokeWidths ? strokeWidths[i] : _strokeWidth) / scale;
                    scale *= sizeScaling;

                    // Measure
                    const labelSize = this._glyphRasterizerVisual.measure(font, label);
                    const width = labelSize.width * scale;
                    const lineHeight = scale;

                    // Offset
                    let offsetX = offsetsX ? offsetsX[i] * offsetScalingX : _offsetX;
                    let offsetY = offsetsY ? offsetsY[i] * offsetScalingY : _offsetY;
                    let offsetZ = offsetsZ ? offsetsZ[i] * offsetScalingZ : _offsetZ;

                    // Horizontal alignment
                    const horizontalAlignment = this._labelSet.horizontalAlignments ? this._labelSet.horizontalAlignments[i] : this._labelSet.horizontalAlignment;
                    switch (horizontalAlignment) {
                        case "left":
                            break;
                        case "center":
                            offsetX -= width / 2;
                            break;
                        case "right":
                            offsetX -= width;
                            break;
                    }

                    // Vertical alignment
                    const verticalAlignment = this._labelSet.verticalAlignments ? this._labelSet.verticalAlignments[i] : this._labelSet.verticalAlignment;
                    switch (verticalAlignment) {
                        case "top":
                            offsetY -= lineHeight / 2;
                            break;
                        case "center":
                            break;
                        case "bottom":
                            offsetY += lineHeight / 2;
                            break;
                    }
                    // Shift to place middle of text at center
                    offsetY -= (0.5 - labelSize.baseline) * lineHeight;

                    // HACK: Multiline labels
                    offsetY -= j * lineHeight;

                    // Position
                    let positionX = positionsX ? positionsX[i] * positionScalingX : 0;
                    let positionY = positionsY ? positionsY[i] * positionScalingY : 0;
                    let positionZ = positionsZ ? positionsZ[i] * positionScalingZ : 0;
                    if (reverseX) { positionX = minBoundsX + maxBoundsX - positionX; }
                    if (reverseY) { positionY = minBoundsY + maxBoundsY - positionY; }
                    if (reverseZ) { positionZ = minBoundsZ + maxBoundsZ - positionZ; }

                    // Material
                    const material = this._labelSet.material || (this._labelSet.materials && this._labelSet.materials[i]);

                    // Segment
                    let segment: ColorRGBA;
                    if (this._labelSet.segmentColor) {
                        segment = this._labelSet.segmentColor;
                    }
                    else if (this._labelSet.segmentColors) {
                        segment = this._labelSet.segmentColors[i];
                    }
                    else {
                        segment = [0, 0, 0, 0];
                        Color.numberToColorRGBA(Pick.nextPickId, segment);
                    }

                    // Glyphs
                    const dataView = this._labelSet.dataView;
                    let _positionX = 0;
                    for (let j = 0; j < label.length; j++) {
                        const char = label[j];
                        const glyph = this._glyphRasterizerVisual.draw(font, char);

                        // Scale
                        _scale[0] = glyph.width * scale;
                        _scale[1] = glyph.height * scale;

                        // SDF
                        UnitVertex.setSdfBuffer(dataView, glyphs, sdfBuffer);
                        UnitVertex.setSdfHalo(dataView, glyphs, sdfHalo);

                        // Position
                        position[0] = positionX + offsetX - glyph.border * scale + _scale[0] * 0.5;
                        position[1] = positionY + offsetY - (glyph.height - glyph.top - glyph.border) * scale + _scale[1] * 0.5;
                        position[2] = positionZ + offsetZ;

                        // Rotation
                        if (j == 0) { _positionX = positionX; }
                        if (this._labelSet.rotation || this._labelSet.rotations) {
                            if (this._labelSet.rotation) {
                                rotation[0] = this._labelSet.rotation[0];
                                rotation[1] = this._labelSet.rotation[1];
                                rotation[2] = this._labelSet.rotation[2];
                                rotation[3] = this._labelSet.rotation[3];
                            }
                            else {
                                rotation[0] = this._labelSet.rotations[i * 4 + 0];
                                rotation[1] = this._labelSet.rotations[i * 4 + 1];
                                rotation[2] = this._labelSet.rotations[i * 4 + 2];
                                rotation[3] = this._labelSet.rotations[i * 4 + 3];
                            }

                            // Rotation offset
                            rotationOffset[0] = position[0] - _positionX;
                            rotationOffset[1] = position[1] - positionY;
                            rotationOffset[2] = position[2] - positionZ;
                            vector3.transformQuaternion(rotationOffset, rotation, rotationOffset);
                            position[0] = rotationOffset[0] + _positionX;
                            position[1] = rotationOffset[1] + positionY;
                            position[2] = rotationOffset[2] + positionZ;
                        }
                        UnitVertex.setRotation(dataView, glyphs, rotation);
                        position[0] = (position[0] - modelOriginX) * boundsScaling;
                        position[1] = (position[1] - modelOriginY) * boundsScaling;
                        position[2] = (position[2] - modelOriginZ) * boundsScaling;
                        UnitVertex.setTranslation(dataView, glyphs, position);
                        _scale[0] *= boundsScaling;
                        _scale[1] *= boundsScaling;
                        UnitVertex.setScale(dataView, glyphs, _scale);

                        // Materials
                        if (material) { UnitVertex.setMaterial(dataView, glyphs, material); }

                        // Segment
                        UnitVertex.setSegColor(dataView, glyphs, segment);

                        // Texture coordinates
                        UnitVertex.setTexCoords(dataView, glyphs, glyph.texCoords);

                        // Advance
                        positionX += glyph.advance * scale;
                        glyphs++;
                    }
                }
            }
            if (this.hasChangedCallback) {
                this.hasChangedCallback();
            }
            console.log(`labelset update ${labels.length} labels ${glyphs} glyphs ${Time.formatDuration(performance.now() - start)}`);
        }
    }
}