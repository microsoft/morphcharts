import { Atlas, ColorRGB, ColorRGBA, Config, Constants, GlyphRasterizer, IAtlasVisual, IBuffer, IBufferVisual, IGlyphRasterizerVisual, IImageVisual, ILabelSetVisual, Image, ITransitionBuffer, ITransitionBufferVisual, LabelSet, vector3, Vector3 } from "./index.js";

export abstract class Renderer {
    protected _isInitialized: boolean; // Ready to call render()

    // Transition
    public _transitionTime: number;
    public get transitionTime(): number { return this._transitionTime; }
    public set transitionTime(value: number) { this._transitionTime = value; }

    // BVH
    public maxPrimsInNode: number;

    // Lighting
    public ambientColor: ColorRGB;
    public backgroundColor: ColorRGBA;
    public diffuseColor: ColorRGB;
    public specularIntensity: number;
    public directionToLight: Vector3;

    // Render mode (raytrace, color, edge, depth, normal, segment)
    protected _hasRenderModeChanged: boolean;
    protected _renderMode: string;
    public set renderMode(value: string) {
        if (this._renderMode !== value) {
            this._renderMode = value;
            this._hasRenderModeChanged = true;
        }
    }
    public get renderMode(): string { return this._renderMode; }

    // Multisample
    protected _hasMultisampleChanged: boolean;
    protected _multisample: number;
    public set multisample(value: number) {
        if (this._multisample !== value) {
            this._multisample = value;
            this._hasMultisampleChanged = true;
        }
    }
    public get multisample(): number { return this._multisample; }

    // Visual collections
    public atlasVisuals: IAtlasVisual[];
    public imageVisuals: IImageVisual[];
    public bufferVisuals: IBufferVisual[];
    public transitionBufferVisuals: ITransitionBufferVisual[];
    public labelSetVisuals: ILabelSetVisual[];

    // Size
    protected _hasSizeChanged: boolean;
    protected _width: number;
    protected _height: number;
    public set width(value: number) {
        if (this._width != value) {
            this._width = value;
            this._hasSizeChanged = true;
        }
    }
    public get width(): number { return this._width; }
    public set height(value: number) {
        if (this._height != value) {
            this._height = value;
            this._hasSizeChanged = true;
        }
    }
    public get height(): number { return this._height; }

    // Tiles
    protected _hasTilesChanged: boolean;
    protected _tilesX: number;
    protected _tilesY: number;
    protected _tileOffsetX: number;
    protected _tileOffsetY: number;
    public set tilesX(value: number) {
        if (this._tilesX != value) {
            this._tilesX = value;
            this._hasTilesChanged = true;
        }
    }
    public get tilesX(): number { return this._tilesX; }
    public set tilesY(value: number) {
        if (this._tilesY != value) {
            this._tilesY = value;
            this._hasTilesChanged = true;
        }
    }
    public get tilesY(): number { return this._tilesY; }
    public set tileOffsetX(value: number) {
        if (this._tileOffsetX != value) {
            this._tileOffsetX = value;
            this._hasTilesChanged = true;
        }
    }
    public get tileOffsetX(): number { return this._tileOffsetX; }
    public set tileOffsetY(value: number) {
        if (this._tileOffsetY != value) {
            this._tileOffsetY = value;
            this._hasTilesChanged = true;
        }
    }
    public get tileOffsetY(): number { return this._tileOffsetY; }

    // Camera
    protected _cameraTarget: Vector3;
    protected _cameraPosition: Vector3;
    protected _cameraFov: number;
    protected _cameraRight: Vector3;
    protected _cameraUp: Vector3;
    protected _cameraForward: Vector3;
    protected _cameraChanged: boolean;
    protected _cameraAperture: number;
    protected _cameraFocusDistance: number;
    public set cameraTarget(value: Vector3) {
        if (Math.abs(this._cameraTarget[0] - value[0]) > Constants.EPSILON || Math.abs(this._cameraTarget[1] - value[1]) > Constants.EPSILON || Math.abs(this._cameraTarget[2] - value[2]) > Constants.EPSILON) {
            this._cameraChanged = true;
            this._cameraTarget[0] = value[0];
            this._cameraTarget[1] = value[1];
            this._cameraTarget[2] = value[2];
        }
    }
    public set cameraPosition(value: Vector3) {
        if (Math.abs(this._cameraPosition[0] - value[0]) > Constants.EPSILON || Math.abs(this._cameraPosition[1] - value[1]) > Constants.EPSILON || Math.abs(this._cameraPosition[2] - value[2]) > Constants.EPSILON) {
            this._cameraChanged = true;
            this._cameraPosition[0] = value[0];
            this._cameraPosition[1] = value[1];
            this._cameraPosition[2] = value[2];
        }
    }
    public set cameraFov(value: number) {
        if (Math.abs(this._cameraFov - value) > Constants.EPSILON) {
            this._cameraChanged = true;
            this._cameraFov = value;
        }
    }
    public set cameraAperture(value: number) {
        if (Math.abs(this._cameraAperture - value) > Constants.EPSILON) {
            this._cameraChanged = true;
            this._cameraAperture = value;
        }
    }
    public set cameraFocusDistance(value: number) {
        if (Math.abs(this._cameraFocusDistance - value) > Constants.EPSILON) {
            this._cameraChanged = true;
            this._cameraFocusDistance = value;
        }
    }

    constructor() {
        // Visual collections
        this.atlasVisuals = [];
        this.imageVisuals = [];
        this.bufferVisuals = [];
        this.transitionBufferVisuals = [];
        this.labelSetVisuals = [];

        // Defaults
        // Transition
        this._transitionTime = 1;

        // BVH
        this.maxPrimsInNode = 1;

        // Lighting
        this.ambientColor = [Config.ambientColor[0], Config.ambientColor[1], Config.ambientColor[2]];
        this.backgroundColor = [Config.backgroundColor[0], Config.backgroundColor[1], Config.backgroundColor[2], Config.backgroundColor[3]];
        this.diffuseColor = [Config.diffuseColor[0], Config.diffuseColor[1], Config.diffuseColor[2]];
        this.specularIntensity = Config.specularIntensity;
        this.directionToLight = [Config.directionToLight[0], Config.directionToLight[1], Config.directionToLight[2]];

        // Render mode
        this._renderMode = Config.renderMode;

        // Multisample
        this._multisample = Config.multisample;

        // Camera
        this._cameraPosition = vector3.clone(Config.cameraPosition);
        this._cameraTarget = vector3.clone(Config.cameraTarget);
        this._cameraFov = Config.cameraFov;
        this._cameraAperture = Config.cameraAperture;
        this._cameraFocusDistance = Config.cameraFocusDistance;
        this._cameraForward = [0, 0, 0];
        this._cameraRight = [0, 0, 0];
        this._cameraUp = [0, 0, 0];
        this._cameraChanged = true; // Force camera update on first render

        // Tiles
        this._tilesX = 1;
        this._tilesY = 1;
        this._tileOffsetX = 0;
        this._tileOffsetY = 0;
        this._hasTilesChanged = true; // Force tile update on first render
    }

    // Factory methods for renderer-specific classes
    public abstract createBufferVisual(buffer: IBuffer): IBufferVisual;
    public abstract createTransitionBufferVisual(transitionBuffer: ITransitionBuffer): ITransitionBufferVisual;
    public abstract createGlyphRasterizerVisual(glyphRasterizser: GlyphRasterizer, atlasVisual: IAtlasVisual): IGlyphRasterizerVisual;
    public abstract createLabelSetVisual(labelSet: LabelSet, glyphRasterizerVisual: IGlyphRasterizerVisual): ILabelSetVisual;
    public abstract createAtlasVisual(atlas: Atlas): IAtlasVisual;
    public abstract createImageVisual(image: Image): IImageVisual;

    public async updateAsync(elapsedTime: number): Promise<void> {
        // Buffer visuals
        for (let i = 0; i < this.bufferVisuals.length; i++) {
            const bufferVisual = this.bufferVisuals[i];
            if (bufferVisual.isVisible) {
                const buffer = bufferVisual.buffer;
                buffer.update();

                // Visual
                bufferVisual.update();
            }
        }

        // Visual collections
        if (this.labelSetVisuals) {
            for (let i = 0; i < this.labelSetVisuals.length; i++) {
                const labelSetVisual = this.labelSetVisuals[i];
                if (labelSetVisual.isVisible) {
                    const labelSet = labelSetVisual.labelSet;
                    labelSet.update();

                    // Visual
                    labelSetVisual.update();
                }
            }
        }
        if (this.imageVisuals) {
            for (let i = 0; i < this.imageVisuals.length; i++) {
                const imageVisual = this.imageVisuals[i];
                const image = imageVisual.image;
                image.update();

                // Visual
                await imageVisual.updateAsync();
            }
        }
    }

    public capture(callback: (dataURL: string) => void) { throw new Error("not implemented"); }
}