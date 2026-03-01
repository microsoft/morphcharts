// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import { Atlas, ColorRGB, ColorRGBA, Config, Constants, GlyphRasterizer, IAtlasOptions, IAtlasVisual, IBuffer, IBufferVisual, IGlyphRasterizerOptions, IGlyphRasterizerVisual, IImageVisual, ILabelSetVisual, Image, ITransitionBuffer, ITransitionBufferVisual, LabelSet, Light, vector3, Vector3, vector4 } from "./index.js";
import * as Cameras from "./cameras/index.js";

export interface IRendererOptions {
    width?: number;
    height?: number;
    renderMode?: string;
}

export interface IInitializeOptions {
    atlasOptions?: IAtlasOptions;
    glyphRasterizerOptions?: IGlyphRasterizerOptions;
}

export interface ISceneOptions {
    buffers?: IBuffer[];
    labels?: LabelSet[];
    images?: Image[];
    camera?: Cameras.Camera;
    ambient?: ColorRGB;
    background?: ColorRGBA;
    lights?: Light[];
    glyphRasterizerVisual?: IGlyphRasterizerVisual;
}

export abstract class Renderer {
    protected _isInitialized: boolean; // Ready to call render()

    // Glyph rasterizer visual (created during initialization, used by loadScene for label sets)
    // This references an atlas visual in atlasVisuals — do not remove that atlas visual without replacing this
    public glyphRasterizerVisual: IGlyphRasterizerVisual;

    // Transition
    public _transitionTime: number;
    public get transitionTime(): number { return this._transitionTime; }
    public set transitionTime(value: number) { this._transitionTime = value; }

    // BVH
    public maxPrimsInNode: number;

    // Lighting
    public ambientColor: ColorRGB;
    public backgroundColor: ColorRGBA;
    protected _haveLightsChanged: boolean;
    protected _lights: Light[];
    public set lights(value: Light[]) {
        if (value != this._lights) {
            this._lights = value;
            this._haveLightsChanged = true;
        }
    }
    public get lights() { return this._lights; }
    public updateLight(index: number, light: Light) {
        if (this._lights[index] != light) {
            this._lights[index] = light;
            this._haveLightsChanged = true;
        }
    }

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
    protected _hasCameraModeChanged: boolean;
    protected _hasCameraChanged: boolean;
    protected _cameraMode: string;
    protected _cameraPosition: Vector3;
    protected _cameraRight: Vector3;
    protected _cameraUp: Vector3;
    protected _cameraForward: Vector3;
    protected _cameraManipulationOrigin: Vector3;
    protected _cameraFov: number;
    protected _cameraAperture: number;
    protected _cameraFocusDistance: number;
    // Camera mode (perspective, cylindrical)
    public set cameraMode(value: string) {
        if (this._cameraMode !== value) {
            this._cameraMode = value;
            this._hasCameraModeChanged = true;
        }
    }
    public get cameraMode(): string { return this._cameraMode; }
    public set cameraPosition(value: Vector3) {
        if (Math.abs(this._cameraPosition[0] - value[0]) > Constants.EPSILON || Math.abs(this._cameraPosition[1] - value[1]) > Constants.EPSILON || Math.abs(this._cameraPosition[2] - value[2]) > Constants.EPSILON) {
            this._hasCameraChanged = true;
            this._cameraPosition[0] = value[0];
            this._cameraPosition[1] = value[1];
            this._cameraPosition[2] = value[2];
        }
    }
    public set cameraForward(value: Vector3) {
        if (Math.abs(this._cameraForward[0] - value[0]) > Constants.EPSILON || Math.abs(this._cameraForward[1] - value[1]) > Constants.EPSILON || Math.abs(this._cameraForward[2] - value[2]) > Constants.EPSILON) {
            this._hasCameraChanged = true;
            this._cameraForward[0] = value[0];
            this._cameraForward[1] = value[1];
            this._cameraForward[2] = value[2];
        }
    }
    public set cameraRight(value: Vector3) {
        if (Math.abs(this._cameraRight[0] - value[0]) > Constants.EPSILON || Math.abs(this._cameraRight[1] - value[1]) > Constants.EPSILON || Math.abs(this._cameraRight[2] - value[2]) > Constants.EPSILON) {
            this._hasCameraChanged = true;
            this._cameraRight[0] = value[0];
            this._cameraRight[1] = value[1];
            this._cameraRight[2] = value[2];
        }
    }
    public set cameraUp(value: Vector3) {
        if (Math.abs(this._cameraUp[0] - value[0]) > Constants.EPSILON || Math.abs(this._cameraUp[1] - value[1]) > Constants.EPSILON || Math.abs(this._cameraUp[2] - value[2]) > Constants.EPSILON) {
            this._hasCameraChanged = true;
            this._cameraUp[0] = value[0];
            this._cameraUp[1] = value[1];
            this._cameraUp[2] = value[2];
        }
    }
    public set cameraManipulationOrigin(value: Vector3) {
        if (Math.abs(this._cameraManipulationOrigin[0] - value[0]) > Constants.EPSILON || Math.abs(this._cameraManipulationOrigin[1] - value[1]) > Constants.EPSILON || Math.abs(this._cameraManipulationOrigin[2] - value[2]) > Constants.EPSILON) {
            this._hasCameraChanged = true;
            this._cameraManipulationOrigin[0] = value[0];
            this._cameraManipulationOrigin[1] = value[1];
            this._cameraManipulationOrigin[2] = value[2];
        }
    }
    public set cameraFov(value: number) {
        if (Math.abs(this._cameraFov - value) > Constants.EPSILON) {
            this._hasCameraChanged = true;
            this._cameraFov = value;
        }
    }
    public set cameraAperture(value: number) {
        if (Math.abs(this._cameraAperture - value) > Constants.EPSILON) {
            this._hasCameraChanged = true;
            this._cameraAperture = value;
        }
    }
    public set cameraFocusDistance(value: number) {
        if (Math.abs(this._cameraFocusDistance - value) > Constants.EPSILON) {
            this._hasCameraChanged = true;
            this._cameraFocusDistance = value;
        }
    }

    // Depth
    protected _depthAuto: boolean;
    protected _depthMin: number;
    protected _depthMax: number;
    protected _hasDepthChanged: boolean;
    public set depthAuto(value: boolean) {
        if (this._depthAuto != value) {
            this._hasDepthChanged = true;
            this._depthAuto = value;
        }
    }
    public get depthAuto(): boolean { return this._depthAuto; }
    public set depthMin(value: number) {
        if (Math.abs(this._depthMin - value) > Constants.EPSILON) {
            this._hasDepthChanged = true;
            this._depthMin = value;
        }
    }
    public get depthMin(): number { return this._depthMin; }
    public set depthMax(value: number) {
        if (Math.abs(this._depthMax - value) > Constants.EPSILON) {
            this._hasDepthChanged = true;
            this._depthMax = value;
        }
    }
    public get depthMax(): number { return this._depthMax; }

    constructor(options?: IRendererOptions) {
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
        this.ambientColor = vector3.clone(Config.ambientColor);
        this.backgroundColor = vector4.clone(Config.backgroundColor);

        // Render mode
        this._renderMode = options?.renderMode ?? Config.renderMode;

        // Multisample
        this._multisample = Config.multisample;

        // Camera
        this._cameraMode = Config.cameraMode;
        this._cameraPosition = vector3.clone(Config.cameraPosition);
        this._cameraRight = vector3.clone(Config.cameraRight);
        this._cameraUp = vector3.clone(Config.cameraUp);
        this._cameraForward = vector3.clone(Config.cameraForward);
        this._cameraManipulationOrigin = vector3.clone(Config.cameraManipulationOrigin);
        this._cameraFov = Config.cameraFov;
        this._cameraAperture = Config.cameraAperture;
        this._cameraFocusDistance = Config.cameraFocusDistance;
        this._hasCameraChanged = true; // Force camera update on first render

        // Depth
        this._depthAuto = Config.depthAuto;
        this._depthMin = Config.depthMin;
        this._depthMax = Config.depthMax;

        // Tiles
        this._tilesX = 1;
        this._tilesY = 1;
        this._tileOffsetX = 0;
        this._tileOffsetY = 0;
        this._hasTilesChanged = true; // Force tile update on first render

        // Size
        this._width = options?.width ?? Config.width;
        this._height = options?.height ?? Config.height;
        this._hasSizeChanged = true; // Force size update on first render
    }

    // Initialize default atlas and glyph rasterizer visuals
    // Call after renderer-specific initialization (e.g. GPU setup)
    protected _initializeDefaultVisuals(options?: IInitializeOptions): void {
        const atlasOptions: IAtlasOptions = options?.atlasOptions ?? {
            width: Config.fontAtlasWidth,
            height: Config.fontAtlasHeight,
            type: "font",
        };
        const atlas = new Atlas(atlasOptions);
        const atlasVisual = this.createAtlasVisual(atlas);
        this.atlasVisuals.push(atlasVisual);

        const glyphRasterizerOptions: IGlyphRasterizerOptions = options?.glyphRasterizerOptions ?? {
            size: Config.glyphRasterizerSize,
            border: Config.glyphRasterizerBorder,
            edgeValue: Config.sdfBuffer,
            maxDistance: Config.glyphRasterizerMaxDistance,
        };
        const glyphRasterizer = new GlyphRasterizer(glyphRasterizerOptions);
        this.glyphRasterizerVisual = this.createGlyphRasterizerVisual(glyphRasterizer, atlasVisual);
    }

    // Load a scene into the renderer, creating visuals for buffers, label sets, images,
    // and applying camera and lighting settings
    public loadScene(options: ISceneOptions): void {
        // Reset visuals
        this.bufferVisuals = [];
        this.labelSetVisuals = [];
        this.imageVisuals = [];

        // Populate visuals
        if (options.buffers) {
            for (const buffer of options.buffers) {
                this.bufferVisuals.push(this.createBufferVisual(buffer));
            }
        }
        if (options.labels) {
            for (const labelSet of options.labels) {
                this.labelSetVisuals.push(this.createLabelSetVisual(labelSet, options.glyphRasterizerVisual));
            }
        }
        if (options.images) {
            for (const image of options.images) {
                this.imageVisuals.push(this.createImageVisual(image));
            }
        }

        // Camera
        if (options.camera) {
            // Base camera properties
            if (options.camera.position != null) this.cameraPosition = options.camera.position;
            if (options.camera.right != null) this.cameraRight = options.camera.right;
            if (options.camera.up != null) this.cameraUp = options.camera.up;
            if (options.camera.forward != null) this.cameraForward = options.camera.forward;

            // Perspective camera properties
            if (options.camera instanceof Cameras.PerspectiveCamera) {
                if (options.camera.fov != null) this.cameraFov = options.camera.fov;
                if (options.camera.aperture != null) this.cameraAperture = options.camera.aperture;
                if (options.camera.focusDistance != null) this.cameraFocusDistance = options.camera.focusDistance;
            }
        }

        // Lighting
        if (options.ambient) this.ambientColor = vector3.clone(options.ambient);
        if (options.background) this.backgroundColor = vector4.clone(options.background);
        if (options.lights) this.lights = options.lights;
    }

    // Copy camera state from an interactive camera to the renderer
    public copyCamera(camera: Cameras.Camera): void {
        this.cameraPosition = camera.position;
        this.cameraRight = camera.right;
        this.cameraUp = camera.up;
        this.cameraForward = camera.forward;
        if (camera instanceof Cameras.PerspectiveCamera) {
            this.cameraFov = camera.fov;
            this.cameraAperture = camera.aperture;
            this.cameraFocusDistance = camera.focusDistance;
        }
    }

    // Factory methods for renderer-specific classes
    public abstract createBufferVisual(buffer: IBuffer): IBufferVisual;
    public abstract createTransitionBufferVisual(transitionBuffer: ITransitionBuffer): ITransitionBufferVisual;
    public abstract createGlyphRasterizerVisual(glyphRasterizser: GlyphRasterizer, atlasVisual: IAtlasVisual): IGlyphRasterizerVisual;
    public abstract createLabelSetVisual(labelSet: LabelSet, glyphRasterizerVisual?: IGlyphRasterizerVisual): ILabelSetVisual;
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

    public capture(callback: (dataURL: string) => void) { throw new Error("capture not implemented"); }
}