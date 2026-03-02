// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import * as Core from "core";
import { AtlasVisual } from "./atlas.js";
import { BufferVisual, TransitionBufferVisual } from "./buffer.js";
import { Config } from "./config.js";
import { GlyphRasterizerVisual } from "./glyph.js";
import { ComputeShaderWgsl, ComputeUniformBufferData } from "./shaders/pathtrace.js";
import { QuadUniformBufferData, QuadWgsl } from "./shaders/quad.js";
import { LabelSetVisual } from "./labels.js";
import { ImageVisual } from "./image.js";
import { LightBufferData } from "core/dist/light.js";

export class Main extends Core.Renderer {
    // DOM
    private _canvas: HTMLCanvasElement;

    // WebGPU API
    private _adapter: GPUAdapter;
    private _device: GPUDevice;
    private _queue: GPUQueue;
    private _sampler: GPUSampler;
    private _context: GPUCanvasContext;
    private _texture: GPUTexture;
    private _presentationFormat: GPUTextureFormat;
    private _maxComputeWorkgroupsPerDimension: number;

    // Compute
    private _computeUniformBuffer: GPUBuffer;
    private _computeUniformBufferData: ComputeUniformBufferData;
    private _depthMinMaxBuffer: GPUBuffer;
    private _depthMinMaxResultBuffer: GPUBuffer;
    private _computeBindGroup1: GPUBindGroup;
    private _computeBindGroup2: GPUBindGroup;
    private _computeBindGroup3: GPUBindGroup;
    private _computePipeline: GPUComputePipeline;
    private _computeColorPipeline: GPUComputePipeline;
    private _computeNormalDepthPipeline: GPUComputePipeline;
    private _computeSegmentPipeline: GPUComputePipeline;
    private _computeTexturePipeline: GPUComputePipeline;
    private _computeBindGroup1Layout: GPUBindGroupLayout
    private _computeBindGroup2Layout: GPUBindGroupLayout
    private _computeBindGroup3Layout: GPUBindGroupLayout
    private _computePipelineLayout: GPUPipelineLayout;

    // Quad
    private _quadUniformBuffer: GPUBuffer;
    private _quadUniformBufferData: QuadUniformBufferData;
    private _quadPipeline: GPURenderPipeline;
    private _quadNormalPipeline: GPURenderPipeline;
    private _quadDepthPipeline: GPURenderPipeline;
    private _quadSegmentPipeline: GPURenderPipeline;
    private _quadTexturePipeline: GPURenderPipeline;
    private _quadEdgePipeline: GPURenderPipeline;
    private _quadBindGroup1: GPUBindGroup;
    private _quadBindGroup2: GPUBindGroup;
    private _quadBindGroup1Layout: GPUBindGroupLayout;
    private _quadBindGroup2Layout: GPUBindGroupLayout;

    // Clear
    private _clearPipeline: GPUComputePipeline;

    // Hittables
    private _hittableBuffer: GPUBuffer;
    private _hittableBufferData: Core.HittableBufferData;

    // Linear BVH nodes
    private _linearBVHNodeBuffer: GPUBuffer;
    private _linearBVHNodeBufferData: Core.LinearBVHNodeBufferData;

    // Visual collections
    private _hasWorldChanged: boolean;
    public bufferVisuals: BufferVisual[];
    public transitionBufferVisuals: TransitionBufferVisual[];
    public labelSetVisuals: LabelSetVisual[];

    // Textures
    private _atlasTexture: GPUTexture;
    private _backgroundTexture: GPUTexture;

    // Lights
    private _lightBuffer: GPUBuffer;
    private _emptyLightBuffer: GPUBuffer;
    private _lightBufferData: LightBufferData;

    constructor(canvas: HTMLCanvasElement, options?: Core.IRendererOptions) {
        super({
            width: options?.width ?? canvas.width,
            height: options?.height ?? canvas.height,
            renderMode: options?.renderMode,
        });

        // Canvas
        this._canvas = canvas;

        // Frames
        this.frameCount = 0;
    }

    // Frames
    public frameCount: number;

    public override loadScene(options: Core.ISceneOptions): void {
        super.loadScene(options);
        this.frameCount = 0;
    }

    public async initializeAsync(options?: Core.IInitializeOptions): Promise<void> {
        await this._initializeAPIAsync()
            .then(async () => { await this._initializeResourcesAsync(); });
        this._initializeDefaultVisuals(options);
    }

    public start(): void { }
    public stop(): void { }
    public get isSupported() { return navigator.gpu !== undefined; }

    private async _initializeAPIAsync(): Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {
            try {
                const start = window.performance.now();
                const gpu: GPU = navigator.gpu;
                this._presentationFormat = gpu.getPreferredCanvasFormat();
                this._adapter = await gpu.requestAdapter();
                const gpuDeviceDescriptor: GPUDeviceDescriptor = {
                    requiredLimits: {
                        // Max storage buffer size
                        maxStorageBufferBindingSize: 134217728,

                        // Match workgroups per dimension to shader
                        maxComputeWorkgroupsPerDimension: 256,
                    }
                };
                this._device = await this._adapter.requestDevice(gpuDeviceDescriptor);
                this._maxComputeWorkgroupsPerDimension = this._device.limits.maxComputeWorkgroupsPerDimension;
                this._queue = this._device.queue;
                this._context = this._canvas.getContext("webgpu");

                // TODO: Handle lost context
                this._device.lost.then(() => {
                    console.log("GPU lost");
                });
                console.log(`WebGPU API initialized ${Core.Time.formatDuration(performance.now() - start)}`);
                resolve(true);
            } catch (error) {
                console.log("WebGPU initialization failed", error);
                reject(error);
            }
        });
    }

    // TODO: Return boolean
    private async _initializeResourcesAsync(): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            try {
                const start = window.performance.now();

                // Canvas
                const canvasConfig: GPUCanvasConfiguration = {
                    device: this._device,
                    format: this._presentationFormat,
                    // alphaMode: "opaque",
                    alphaMode: "premultiplied",
                };
                this._context.configure(canvasConfig);

                // Compute
                const computeUniformBufferDescriptor: GPUBufferDescriptor = {
                    label: "Compute uniform buffer",
                    size: ComputeUniformBufferData.SIZE * 4,
                    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
                };
                this._computeUniformBuffer = this._device.createBuffer(computeUniformBufferDescriptor);
                this._computeUniformBufferData = new ComputeUniformBufferData();

                // Depth
                const depthMinMaxBufferDescriptor: GPUBufferDescriptor = {
                    label: "Depth min max buffer",
                    size: 2 * 4,
                    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
                };
                this._depthMinMaxBuffer = this._device.createBuffer(depthMinMaxBufferDescriptor);
                const depthMinMaxBufferResultDescriptor: GPUBufferDescriptor = {
                    label: "Depth min max result buffer",
                    size: 2 * 4,
                    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
                };
                this._depthMinMaxResultBuffer = this._device.createBuffer(depthMinMaxBufferResultDescriptor);

                // Quad
                const quadUniformBufferDescriptor: GPUBufferDescriptor = {
                    label: "Full screen quad uniform buffer",
                    size: QuadUniformBufferData.SIZE * 4,
                    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
                };
                this._quadUniformBuffer = this._device.createBuffer(quadUniformBufferDescriptor);
                this._quadUniformBufferData = new QuadUniformBufferData();

                // Sampler
                this._sampler = this._device.createSampler({
                    label: "Sampler",
                    // TODO: Disable mipmapping for sdf fonts?
                    magFilter: "linear",
                    minFilter: "linear",
                });

                // Placeholder texture
                const textureSize: GPUExtent3DStrict = { width: 1, height: 1 }
                const textureDescriptor: GPUTextureDescriptor = {
                    label: "Placeholder texture",
                    size: textureSize,
                    format: this._presentationFormat,
                    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
                };
                this._texture = this._device.createTexture(textureDescriptor);

                // Placeholder light buffer
                const emptyLightBufferDescriptor: GPUBufferDescriptor = {
                    label: "Placeholder light buffer",
                    size: LightBufferData.SIZE * 4, // Single light
                    usage: GPUBufferUsage.STORAGE,
                };
                this._emptyLightBuffer = this._device.createBuffer(emptyLightBufferDescriptor);

                // Compute module
                const computeShaderModuleDescriptor: GPUShaderModuleDescriptor = {
                    code: ComputeShaderWgsl,
                }
                const computeModule = this._device.createShaderModule(computeShaderModuleDescriptor);

                // Compute pipeline
                const computeBindGroup1LayoutDescriptor: GPUBindGroupLayoutDescriptor = {
                    entries: [
                        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } }, // Hittable buffer
                        { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" }, }, // LinearBVHNode buffer
                        { binding: 4, visibility: GPUShaderStage.COMPUTE, sampler: { type: "filtering", } }, // Sampler
                        { binding: 5, visibility: GPUShaderStage.COMPUTE, texture: { multisampled: false, sampleType: "float", viewDimension: "2d", } }, // Atlas texture
                        { binding: 6, visibility: GPUShaderStage.COMPUTE, texture: { multisampled: false, sampleType: "float", viewDimension: "2d", } } // Background texture
                    ]
                };
                const computeBindGroup2LayoutDescriptor: GPUBindGroupLayoutDescriptor = {
                    entries: [
                        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } }, // Output color buffer
                    ]
                };
                const computeBindGroup3LayoutDescriptor: GPUBindGroupLayoutDescriptor = {
                    entries: [
                        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } }, // Uniforms
                        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } }, // Depth min max buffer
                        { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } }, // Light buffer
                    ]
                };
                this._computeBindGroup1Layout = this._device.createBindGroupLayout(computeBindGroup1LayoutDescriptor);
                this._computeBindGroup2Layout = this._device.createBindGroupLayout(computeBindGroup2LayoutDescriptor);
                this._computeBindGroup3Layout = this._device.createBindGroupLayout(computeBindGroup3LayoutDescriptor);
                const computePipelineLayoutDescriptor = {
                    label: "Compute pipeline layout descriptor",
                    bindGroupLayouts: [
                        this._computeBindGroup1Layout, // @group(0)
                        this._computeBindGroup2Layout, // @group(1)
                        this._computeBindGroup3Layout, // @group(2)
                    ]
                };
                this._computePipelineLayout = this._device.createPipelineLayout(computePipelineLayoutDescriptor);
                const compute: GPUProgrammableStage = {
                    module: computeModule,
                    entryPoint: "main",
                }
                const computePipelineDescriptor: GPUComputePipelineDescriptor = {
                    label: "Compute pipeline descriptor",
                    layout: this._computePipelineLayout,
                    compute: compute,
                };
                this._computePipeline = this._device.createComputePipeline(computePipelineDescriptor);

                // Color pipeline
                const computeColor: GPUProgrammableStage = {
                    module: computeModule,
                    entryPoint: "color",
                }
                const computeColorPipelineDescriptor: GPUComputePipelineDescriptor = {
                    label: "Color pipeline descriptor",
                    layout: this._computePipelineLayout,
                    compute: computeColor,
                };
                this._computeColorPipeline = this._device.createComputePipeline(computeColorPipelineDescriptor);

                // Normal, depth pipeline
                const computeNormalDepth: GPUProgrammableStage = {
                    module: computeModule,
                    entryPoint: "normalDepth",
                }
                const computeNormalDepthPipelineDescriptor: GPUComputePipelineDescriptor = {
                    label: "Normal, depth pipeline descriptor",
                    layout: this._computePipelineLayout,
                    compute: computeNormalDepth,
                };
                this._computeNormalDepthPipeline = this._device.createComputePipeline(computeNormalDepthPipelineDescriptor);

                // Segment pipeline
                const computeSegment: GPUProgrammableStage = {
                    module: computeModule,
                    entryPoint: "segment",
                }
                const computeSegmentPipelineDescriptor: GPUComputePipelineDescriptor = {
                    label: "Segment pipeline descriptor",
                    layout: this._computePipelineLayout,
                    compute: computeSegment,
                };
                this._computeSegmentPipeline = this._device.createComputePipeline(computeSegmentPipelineDescriptor);

                // Texture pipeline
                const computeTexture: GPUProgrammableStage = {
                    module: computeModule,
                    entryPoint: "texture",
                }
                const computeTexturePipelineDescriptor: GPUComputePipelineDescriptor = {
                    label: "Texture pipeline descriptor",
                    layout: this._computePipelineLayout,
                    compute: computeTexture,
                };
                this._computeTexturePipeline = this._device.createComputePipeline(computeTexturePipelineDescriptor);

                // Clear pipeline
                const clearPipelineLayoutDescriptor: GPUPipelineLayoutDescriptor = {
                    label: "Clear pipeline layout descriptor",
                    bindGroupLayouts: [
                        null, // @group(0)
                        this._computeBindGroup2Layout, // @group(1)
                        this._computeBindGroup3Layout, // @group(2)
                    ]
                };
                const clearPipelineLayout: GPUPipelineLayout = this._device.createPipelineLayout(clearPipelineLayoutDescriptor);
                const clear: GPUProgrammableStage = {
                    module: computeModule,
                    entryPoint: "clear"
                }
                const clearPipelineDescriptor: GPUComputePipelineDescriptor = {
                    label: "Clear pipeline descriptor",
                    layout: clearPipelineLayout,
                    compute: clear
                };
                this._clearPipeline = this._device.createComputePipeline(clearPipelineDescriptor);

                // Quad pipeline
                const quadShaderDescriptor: GPUShaderModuleDescriptor = {
                    label: "Quad shader descriptor",
                    code: QuadWgsl
                };
                const quadModule = this._device.createShaderModule(quadShaderDescriptor);
                const quadBindGroup1LayoutDescriptor: GPUBindGroupLayoutDescriptor = {
                    label: "Quad bind group 1 layout descriptor",
                    entries: [
                        { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } }  // Color buffer
                    ],
                };
                const quadBindGroup2LayoutDescriptor: GPUBindGroupLayoutDescriptor = {
                    label: "Quad bind group 2 layout descriptor",
                    entries: [
                        { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } } // Uniforms
                    ],
                };
                this._quadBindGroup1Layout = this._device.createBindGroupLayout(quadBindGroup1LayoutDescriptor);
                this._quadBindGroup2Layout = this._device.createBindGroupLayout(quadBindGroup2LayoutDescriptor);
                const quadPipelineLayoutDescriptor: GPUPipelineLayoutDescriptor = {
                    label: "Quad pipeline layout descriptor",
                    bindGroupLayouts: [
                        this._quadBindGroup1Layout, // @group(0)
                        this._quadBindGroup2Layout, // @group(1)
                    ]
                }
                const quadPipelineLayout: GPUPipelineLayout = this._device.createPipelineLayout(quadPipelineLayoutDescriptor);
                const vertex: GPUVertexState = {
                    module: quadModule,
                    entryPoint: "vert_main"
                };
                const primitive: GPUPrimitiveState = {
                    topology: "triangle-list"
                };
                const colorState: GPUColorTargetState = {
                    format: this._presentationFormat
                };
                const fragment: GPUFragmentState = {
                    module: quadModule,
                    entryPoint: "frag_main",
                    targets: [colorState]
                };
                const quadPiplelineDescriptor: GPURenderPipelineDescriptor = {
                    label: "Quad pipeline descriptor",
                    layout: quadPipelineLayout,
                    vertex: vertex,
                    fragment: fragment,
                    primitive: primitive
                };
                this._quadPipeline = this._device.createRenderPipeline(quadPiplelineDescriptor);

                // Quad Normal
                const fragmentNormal: GPUFragmentState = {
                    module: quadModule,
                    entryPoint: "frag_normal",
                    targets: [colorState]
                };
                const quadNormalPipelineDescriptor: GPURenderPipelineDescriptor = {
                    label: "Quad normal pipeline descriptor",
                    layout: quadPipelineLayout,
                    vertex: vertex,
                    fragment: fragmentNormal,
                    primitive: primitive,
                };
                this._quadNormalPipeline = this._device.createRenderPipeline(quadNormalPipelineDescriptor);

                // Quad Depth
                const fragmentDepth: GPUFragmentState = {
                    module: quadModule,
                    entryPoint: "frag_depth",
                    targets: [colorState]
                };
                const quadDepthPipelineDescriptor: GPURenderPipelineDescriptor = {
                    label: "Quad depth pipeline descriptor",
                    layout: quadPipelineLayout,
                    vertex: vertex,
                    fragment: fragmentDepth,
                    primitive: primitive,
                };
                this._quadDepthPipeline = this._device.createRenderPipeline(quadDepthPipelineDescriptor);

                // Quad segment
                const fragmentSegment: GPUFragmentState = {
                    module: quadModule,
                    entryPoint: "frag_segment",
                    targets: [colorState]
                };
                const quadSegmentPipelineDescriptor: GPURenderPipelineDescriptor = {
                    label: "Quad segment pipeline descriptor",
                    layout: quadPipelineLayout,
                    vertex: vertex,
                    fragment: fragmentSegment,
                    primitive: primitive,
                };
                this._quadSegmentPipeline = this._device.createRenderPipeline(quadSegmentPipelineDescriptor);

                // Quad texture
                const fragmentTexture: GPUFragmentState = {
                    module: quadModule,
                    entryPoint: "frag_texture",
                    targets: [colorState]
                };
                const quadTexturePipelineDescriptor: GPURenderPipelineDescriptor = {
                    label: "Quad texture pipeline descriptor",
                    layout: quadPipelineLayout,
                    vertex: vertex,
                    fragment: fragmentTexture,
                    primitive: primitive,
                };
                this._quadTexturePipeline = this._device.createRenderPipeline(quadTexturePipelineDescriptor);

                // Quad edge
                const fragmentEdge: GPUFragmentState = {
                    module: quadModule,
                    entryPoint: "frag_edge",
                    targets: [colorState]
                };
                const quadEdgePipelineDescriptor: GPURenderPipelineDescriptor = {
                    label: "Quad edge pipeline descriptor",
                    layout: quadPipelineLayout,
                    vertex: vertex,
                    fragment: fragmentEdge,
                    primitive: primitive,
                };
                this._quadEdgePipeline = this._device.createRenderPipeline(quadEdgePipelineDescriptor);

                console.log(`WebGPU resources initialized ${Core.Time.formatDuration(performance.now() - start)}`);
                resolve();
            } catch (error) {
                console.log("WebGPU resource initialization failed", error);
                reject(error);
            }
        });
    }

    public createBufferVisual(buffer: Core.IBuffer) {
        const visual = new BufferVisual(buffer);
        visual.hasChangedCallback = () => {
            this._hasWorldChanged = true;
        };
        return visual;
    }
    public createTransitionBufferVisual(transitionBuffer: Core.ITransitionBuffer) {
        const visual = new TransitionBufferVisual(transitionBuffer);
        visual.hasChangedCallback = () => {
            this._hasWorldChanged = true;
        };
        return visual;
    }
    public createImageVisual(image: Core.Image) {
        const visual = new ImageVisual(image);
        visual.hasChangedCallback = () => {
            this._hasWorldChanged = true;
        };
        return visual;
    }
    public createLabelSetVisual(labelSet: Core.LabelSet, glyphRasterizerVisual?: Core.IGlyphRasterizerVisual) {
        const resolved = glyphRasterizerVisual ?? this.glyphRasterizerVisual;
        if (!resolved) { throw new Error("no glyph rasterizer visual available, call initializeAsync() before createLabelSetVisual(), or provide a glyphRasterizerVisual"); }
        const visual = new LabelSetVisual(labelSet, resolved);
        visual.hasChangedCallback = () => {
            this._hasWorldChanged = true;
        };
        return visual;
    }
    public createAtlasVisual(atlas: Core.Atlas) { return new AtlasVisual(atlas); }
    public createGlyphRasterizerVisual(glyphRasterizesr: Core.GlyphRasterizer, atlasVisual: AtlasVisual) { return new GlyphRasterizerVisual(glyphRasterizesr, atlasVisual); }

    public async updateAsync(elapsedTime: number): Promise<void> {
        // Update visuals
        await super.updateAsync(elapsedTime);

        // Resize
        if (this._hasSizeChanged) {
            this._hasSizeChanged = false;
            this._createSizeDependentResources();

            // Reset
            this.frameCount = 0;
        }

        // Create lights
        if (this._haveLightsChanged) {
            this._haveLightsChanged = false;
            await this._createLightsAsync();

            // Reset
            this.frameCount = 0;
        }

        // Create world
        if (this._hasWorldChanged) {
            this._hasWorldChanged = false;
            await this._createWorldAsync();
            this._createSizeIndependentResources();

            // Reset
            this.frameCount = 0;

            // Ready
            this._isInitialized = true;
        }
    }

    public async renderAsync(elapsedTime: number): Promise<void> {
        if (!this._isInitialized) { return; }

        // Compute
        this._computeUniformBufferData.setSeed(this.frameCount);

        // Render mode
        if (this._hasRenderModeChanged) {
            this._hasRenderModeChanged = false;
            this.frameCount = 0; // Reset frame count on render mode change
        }

        // Camera mode
        if (this._hasCameraModeChanged) {
            this._hasCameraModeChanged = false;
            this.frameCount = 0; // Reset frame count on camera mode change
            let cameraType: Core.Cameras.CameraType;
            switch (this._cameraMode) {
                case "perspective":
                default:
                    cameraType = Core.Cameras.CameraType.perspective;
                    break;
                case "cylindrical":
                    cameraType = Core.Cameras.CameraType.cylindrical;
                    break;
            }
            this._computeUniformBufferData.setCameraTypeId(cameraType);
        }

        // Multisample mode
        if (this._hasMultisampleChanged) {
            this._hasMultisampleChanged = false;
            this.frameCount = 0; // Reset frame count on multisample change
        }

        // Camera
        // TODO: Move change events to update
        if (this._hasCameraChanged) {
            this._hasCameraChanged = false;
            this.frameCount = 0; // Reset frame count on camera change
            this._computeUniformBufferData.setPosition(this._cameraPosition);
            this._computeUniformBufferData.setRight(this._cameraRight);
            this._computeUniformBufferData.setUp(this._cameraUp);
            this._computeUniformBufferData.setForward(this._cameraForward);
            this._computeUniformBufferData.setFieldOfView(this._cameraFov);
            this._computeUniformBufferData.setAperture(this._cameraAperture);
            this._computeUniformBufferData.setFocusDistance(this._cameraFocusDistance);
        }

        // Tiles
        if (this._hasTilesChanged) {
            this._hasTilesChanged = false;
            this.frameCount = 0; // Reset frame count on tile change
            this._computeUniformBufferData.setTilesX(this._tilesX);
            this._computeUniformBufferData.setTilesY(this._tilesY);
            this._computeUniformBufferData.setTileOffsetX(this._tileOffsetX);
            this._computeUniformBufferData.setTileOffsetY(this._tileOffsetY);
        }

        // Lighting
        this._computeUniformBufferData.setAmbientColor(this.ambientColor);
        this._computeUniformBufferData.setBackgroundColor(this.backgroundColor);

        // Color render mode
        switch (this._renderMode) {
            case "color":
                this._computeUniformBufferData.setAperture(0); // Disable aperture for color render mode
                this._computeUniformBufferData.setMultisample(this._multisample);
                break;
        }
        this._device.queue.writeBuffer(this._computeUniformBuffer, 0, this._computeUniformBufferData.buffer, this._computeUniformBufferData.byteOffset, this._computeUniformBufferData.byteLength);

        // Quad
        this._quadUniformBufferData.setSamplesPerPixel(this.frameCount + 1); // Rendered frames is frameCount + 1
        switch (this._renderMode) {
            case "hdr":
                this._quadUniformBufferData.setExposure(1);
                break;
            case "edge":
                this._quadUniformBufferData.setEdgeForeground(Config.edgeForeground);
                this._quadUniformBufferData.setEdgeBackground(Config.edgeBackground);
                break;
            case "depth":
                this._quadUniformBufferData.setMinDepth(this._depthMin);
                this._quadUniformBufferData.setMaxDepth(this._depthMax);
                break;
            case "raytrace":
            case "normal":
            case "segment":
                break;
        }
        this._device.queue.writeBuffer(this._quadUniformBuffer, 0, this._quadUniformBufferData.buffer, this._quadUniformBufferData.byteOffset, this._quadUniformBufferData.byteLength);

        // Write and submit commands to queue
        let clear = this.frameCount == 0; // Clear on first frame
        await this._encodeCommandsAsync(clear);

        // Next frame
        this.frameCount++;
    }

    // Compute
    // ----------------------------------------------------------------------------
    // resource            | type               | size-dependent | change frequency
    // ----------------------------------------------------------------------------
    // color               | storage read write | yes            | size, clear
    // normal depth        | storage read write | yes            | size, clear
    // depth min max       | storage read write | no             | clear
    // linear BVH nodes    | storage read       | no             | none
    // ordered hittables   | storage read       | no             | none
    // uniforms            | uniform            | no             | frame, clear
    // lights              | storage read       | no             | lights change
    // sampler             | storage read       | no             | none
    // glyphs              | texture 2d         | no             | none
    // sdfs                | texture 2d         | no             | none
    // sampler             | sampler            | no             | none
    // ----------------------------------------------------------------------------

    // Quad
    // ----------------------------------------------------------------------------
    // resource            | type               | size-dependent | change frequency
    // ----------------------------------------------------------------------------
    // color               | storage read write | yes            | size, clear
    // normal depth        | storage read write | yes            | size, clear
    // uniforms            | uniform            | no             | frame, clear  

    // TODO: Further split atlas and background textures into seperate bind group(s)
    private _createSizeIndependentResources(): void {
        let start = performance.now();

        // Compute bind groups
        const computeBindGroup1Descriptor: GPUBindGroupDescriptor = {
            label: "Compute bind group 1 descriptor",
            layout: this._computeBindGroup1Layout,
            entries: [
                { binding: 2, resource: { buffer: this._hittableBuffer } },
                { binding: 3, resource: { buffer: this._linearBVHNodeBuffer } },
                { binding: 4, resource: this._sampler },
                { binding: 5, resource: (this._atlasTexture || this._texture).createView() },
                { binding: 6, resource: (this._backgroundTexture || this._texture).createView() },
            ]
        };
        const computeBindGroup3Descriptor: GPUBindGroupDescriptor = {
            label: "Compute bind group 3 descriptor",
            layout: this._computeBindGroup3Layout,
            entries: [
                { binding: 1, resource: { buffer: this._computeUniformBuffer } },
                { binding: 2, resource: { buffer: this._depthMinMaxBuffer } },
                // As long as the number of lights doesn't change, I don't need to create this again
                // If the number of lights changes, the world will be recreated, and so will this
                // As light properties change, I simply update the buffer
                { binding: 3, resource: { buffer: this._lightBuffer || this._emptyLightBuffer } },
            ]
        };
        this._computeBindGroup1 = this._device.createBindGroup(computeBindGroup1Descriptor);
        this._computeBindGroup3 = this._device.createBindGroup(computeBindGroup3Descriptor);

        // Quad bind groups
        const quadBindGroup2Descriptor: GPUBindGroupDescriptor = {
            label: "Quad bind group 2 descriptor",
            layout: this._quadBindGroup2Layout,
            entries: [
                { binding: 0, resource: { buffer: this._quadUniformBuffer } }
            ]
        };
        this._quadBindGroup2 = this._device.createBindGroup(quadBindGroup2Descriptor);
        console.log(`create size independent resources ${Core.Time.formatDuration(Math.round(window.performance.now() - start))}`);
    }

    private _createSizeDependentResources(): void {
        let start = performance.now();

        // Output color buffer
        const colorChannels = 4;
        // const outputColorBufferSizeBytes = Uint32Array.BYTES_PER_ELEMENT * this._width * this._height * colorChannels;
        const outputColorBufferSizeBytes = Uint32Array.BYTES_PER_ELEMENT * (this._width + 1) * (this._height + 1) * colorChannels; // Overdispatch by 1 to allow edge detection to work at the edges
        const outputColorBufferDescriptor: GPUBufferDescriptor = {
            label: "Output color buffer",
            size: outputColorBufferSizeBytes,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
        };
        const outputColorBuffer = this._device.createBuffer(outputColorBufferDescriptor);

        // Compute bind groups
        const computeBindGroup2Descriptor: GPUBindGroupDescriptor = {
            label: "Compute bind group 2 descriptor",
            layout: this._computeBindGroup2Layout,
            entries: [
                { binding: 0, resource: { buffer: outputColorBuffer } },
            ]
        };
        this._computeBindGroup2 = this._device.createBindGroup(computeBindGroup2Descriptor);

        // Quad bind groups
        const quadBindGroup1Descriptor: GPUBindGroupDescriptor = {
            label: "Quad bind group 1 descriptor",
            layout: this._quadBindGroup1Layout,
            entries: [
                { binding: 0, resource: { buffer: outputColorBuffer } }
            ]
        };
        this._quadBindGroup1 = this._device.createBindGroup(quadBindGroup1Descriptor);

        // Write values to uniform buffers
        this._computeUniformBufferData.setWidth(this._width);
        this._computeUniformBufferData.setHeight(this._height);
        this._quadUniformBufferData.setWidth(this._width);
        this._quadUniformBufferData.setHeight(this._height);
        console.log(`create size dependent resources ${this._width}x${this._height} ${Core.Time.formatDuration(Math.round(window.performance.now() - start))}`);
    }

    private async _createWorldAsync(): Promise<void> {
        // Concatenate all hittables into a single array
        let start = performance.now();
        const hittables: Core.Hittable[] = [];
        for (let i = 0; i < this.bufferVisuals.length; i++) {
            const bufferVisual = this.bufferVisuals[i];
            if (bufferVisual.isVisible && bufferVisual.hittables) {
                for (let j = 0; j < bufferVisual.hittables.length; j++) { hittables.push(bufferVisual.hittables[j]); }
            }
        }
        for (let i = 0; i < this.labelSetVisuals.length; i++) {
            const labelSetVisual = this.labelSetVisuals[i];
            if (labelSetVisual.isVisible && labelSetVisual.hittables) {
                for (let j = 0; j < labelSetVisual.hittables.length; j++) { hittables.push(labelSetVisual.hittables[j]); }
            }
        }
        if (hittables.length == 0) {
            console.log("No hittables found");
            return;
        }
        console.log(`hittables ${hittables.length} collected ${Core.Time.formatDuration(Math.round(window.performance.now() - start))}`);

        // Atlas
        start = performance.now();
        const imageDataSettings: ImageDataSettings = {};
        for (const atlasVisual of this.atlasVisuals) {
            const imageData = new ImageData(atlasVisual.buffer, atlasVisual.atlas.width, atlasVisual.atlas.height, imageDataSettings);
            const textureSize: GPUExtent3DStrict = { width: imageData.width, height: imageData.height };

            await createImageBitmap(imageData).then((imageBitmap: ImageBitmap) => {
                const textureDescriptor: GPUTextureDescriptor = {
                    label: "Atlas texture",
                    size: textureSize,
                    format: this._presentationFormat,
                    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
                };
                this._atlasTexture = this._device.createTexture(textureDescriptor);
                const copyExternalImageSourceInfo: GPUCopyExternalImageSourceInfo = {
                    source: imageBitmap,
                    // flipY: true
                };
                const copyExternalImageDestInfo: GPUCopyExternalImageDestInfo = { texture: this._atlasTexture };
                const copySize: GPUExtent3DStrict = { width: imageData.width, height: imageData.height };
                this._device.queue.copyExternalImageToTexture(copyExternalImageSourceInfo, copyExternalImageDestInfo, copySize);
            });

            // Support single atlas visual only
            console.log(`atlas texture updated ${Math.round(window.performance.now() - start)}ms`);
            break;
        }

        // Images
        start = performance.now();
        for (const imageVisual of this.imageVisuals) {
            const imageData = new ImageData(imageVisual.buffer as Uint8ClampedArray<ArrayBuffer>, imageVisual.width, imageVisual.height, imageDataSettings);
            const textureSize: GPUExtent3DStrict = { width: imageData.width, height: imageData.height };

            await createImageBitmap(imageData).then((imageBitmap: ImageBitmap) => {
                const textureDescriptor: GPUTextureDescriptor = {
                    label: "Background texture",
                    size: textureSize,
                    format: this._presentationFormat,
                    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
                };
                this._backgroundTexture = this._device.createTexture(textureDescriptor);
                const copyExternalImageSourceInfo: GPUCopyExternalImageSourceInfo = {
                    source: imageBitmap,
                    // flipY: true
                };
                const copyExternalImageDestInfo: GPUCopyExternalImageDestInfo = { texture: this._backgroundTexture };
                const copySize: GPUExtent3DStrict = { width: imageData.width, height: imageData.height };
                this._device.queue.copyExternalImageToTexture(copyExternalImageSourceInfo, copyExternalImageDestInfo, copySize);
            });

            // Support single background image only
            console.log(`background texture updated ${Math.round(window.performance.now() - start)}ms`);
            break;
        }

        // Create acceleration structure
        const bvhAccel = new Core.BVHAccel(hittables, this.maxPrimsInNode, "sah");

        // Ordered primitives buffer
        const orderedPrimitives = bvhAccel.orderedPrimitives;
        const hittableBufferSizeBytes = orderedPrimitives.length * Core.HittableBufferData.SIZE * 4;
        const hittableBufferDescriptor: GPUBufferDescriptor = {
            label: "Hittable buffer",
            size: hittableBufferSizeBytes,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        };
        this._hittableBuffer = this._device.createBuffer(hittableBufferDescriptor);
        this._hittableBufferData = new Core.HittableBufferData(hittables.length * Core.HittableBufferData.SIZE);
        for (let i = 0; i < orderedPrimitives.length; i++) {
            const hittable = orderedPrimitives[i];
            hittable.toBuffer(this._hittableBufferData, i);
        }

        // Linear BVH buffer
        const linearBVHNodes = bvhAccel.nodes;
        const linearBVHNodeBufferSizeBytes = linearBVHNodes.length * Core.LinearBVHNodeBufferData.SIZE * 4;
        const linearBVHNodeBufferDescriptor: GPUBufferDescriptor = {
            label: "Linear BVH node buffer",
            size: linearBVHNodeBufferSizeBytes,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        };
        this._linearBVHNodeBuffer = this._device.createBuffer(linearBVHNodeBufferDescriptor);
        this._linearBVHNodeBufferData = new Core.LinearBVHNodeBufferData(linearBVHNodes.length * Core.LinearBVHNodeBufferData.SIZE);
        for (let i = 0; i < linearBVHNodes.length; i++) {
            linearBVHNodes[i].toBuffer(this._linearBVHNodeBufferData, i);
        }

        // Write buffers
        this._device.queue.writeBuffer(this._hittableBuffer, 0, this._hittableBufferData.buffer, this._hittableBufferData.byteOffset, this._hittableBufferData.byteLength);
        this._device.queue.writeBuffer(this._linearBVHNodeBuffer, 0, this._linearBVHNodeBufferData.buffer, this._linearBVHNodeBufferData.byteOffset, this._linearBVHNodeBufferData.byteLength);
        console.log(`create world ${Core.Time.formatDuration(Math.round(window.performance.now() - start))}`);
    }

    private async _createLightsAsync(): Promise<void> {
        if (!this._lights || this._lights.length == 0) {
            // Clear previous light buffer if it exists
            if (this._lightBuffer) {
                this._lightBuffer = null;
                // Need to recreate size independent resources so the bind group uses the empty light buffer
                this._hasWorldChanged = true;
            }
            console.log("No lights found");
            return;
        }

        // Create buffers
        const lightBufferSizeBytes = this._lights.length * LightBufferData.SIZE * 4;
        const lightBufferDescriptor: GPUBufferDescriptor = {
            label: "Light buffer",
            size: lightBufferSizeBytes,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        };
        if (!this._lightBuffer || this._lightBuffer.size != lightBufferSizeBytes) {
            this._lightBuffer = this._device.createBuffer(lightBufferDescriptor);
            this._lightBufferData = new LightBufferData(this._lights.length);

            // Need to recreate size independent resources as the light buffer is bound there
            // TODO: Optimize by only recreating the compute bind group 3
            this._hasWorldChanged = true;
        }

        // Fill buffer
        for (let i = 0; i < this._lights.length; i++) {
            this._lights[i].toBuffer(this._lightBufferData, i);
        }

        // Write buffers
        this._device.queue.writeBuffer(this._lightBuffer, 0, this._lightBufferData.buffer, this._lightBufferData.byteOffset, this._lightBufferData.byteLength);
        console.log(`lights ${this._lights.length} created`);
    }

    private async _encodeCommandsAsync(clear: boolean) {
        // Commands
        const commandEncoder = this._device.createCommandEncoder();

        // Compute
        const computePassEncoder = commandEncoder.beginComputePass();

        // Pathtrace
        let computeDispatchCount: number;
        switch (this._renderMode) {
            case "segment":
            case "edge":
                // Overdispatch by 1 to allow edge detection to work at the edges
                computeDispatchCount = Math.min(Math.ceil((this._width + 1) * (this._height + 1) / 256), this._maxComputeWorkgroupsPerDimension);
                break;
            default:
                computeDispatchCount = Math.min(Math.ceil(this._width * this._height / 256), this._maxComputeWorkgroupsPerDimension);
        }

        // Set bind groups
        computePassEncoder.setBindGroup(0, this._computeBindGroup1);
        computePassEncoder.setBindGroup(1, this._computeBindGroup2);
        computePassEncoder.setBindGroup(2, this._computeBindGroup3);

        // Clear
        if (clear) {
            computePassEncoder.setPipeline(this._clearPipeline);
            computePassEncoder.dispatchWorkgroups(computeDispatchCount, 1, 1);
        }

        // Render mode
        switch (this._renderMode) {
            case "color":
                computePassEncoder.setPipeline(this._computeColorPipeline);
                computePassEncoder.dispatchWorkgroups(computeDispatchCount, 1, 1);
                computePassEncoder.end();
                break;
            case "normal":
            case "depth":
                computePassEncoder.setPipeline(this._computeNormalDepthPipeline);
                computePassEncoder.dispatchWorkgroups(computeDispatchCount, 1, 1);
                computePassEncoder.end();
                commandEncoder.copyBufferToBuffer(this._depthMinMaxBuffer, 0, this._depthMinMaxResultBuffer, 0, this._depthMinMaxResultBuffer.size);

                // Read depth and set automatically
                if (this._depthAuto) {
                    await this._depthMinMaxResultBuffer.mapAsync(GPUMapMode.READ);
                    const depthMinMax = new Uint32Array(this._depthMinMaxResultBuffer.getMappedRange());
                    const depthMin = depthMinMax[0] / 1000;
                    const depthMax = depthMinMax[1] / 1000;
                    this.depthMin = depthMin;
                    this.depthMax = depthMax;
                    this._depthMinMaxResultBuffer.unmap();
                }
                break;
            case "segment":
            case "edge":
                computePassEncoder.setPipeline(this._computeSegmentPipeline);
                computePassEncoder.dispatchWorkgroups(computeDispatchCount, 1, 1);
                computePassEncoder.end();
                break;
            // TODO: Remove texture render mode and pipeline, and add a textureType="uv" to the color/raytrace pipeline
            case "texture":
                computePassEncoder.setPipeline(this._computeTexturePipeline);
                computePassEncoder.dispatchWorkgroups(computeDispatchCount, 1, 1);
                computePassEncoder.end();
                break;
            default:
                // Raytrace
                computePassEncoder.setPipeline(this._computePipeline);
                computePassEncoder.dispatchWorkgroups(computeDispatchCount, 1, 1);
                computePassEncoder.end();
                break;
        }

        // Render
        const colorAttachment: GPURenderPassColorAttachment = {
            view: this._context.getCurrentTexture().createView(),
            clearValue: { r: 0, g: 0, b: 0, a: 0 },
            loadOp: "clear",
            storeOp: "store",
        };
        const quadRenderPassDescriptor: GPURenderPassDescriptor = {
            colorAttachments: [colorAttachment],
        };
        const renderPassEncoder = commandEncoder.beginRenderPass(quadRenderPassDescriptor);
        switch (this._renderMode) {
            case "raytrace":
            case "color":
            case "hdr":
            default:
                renderPassEncoder.setPipeline(this._quadPipeline);
                break;
            case "normal":
                renderPassEncoder.setPipeline(this._quadNormalPipeline);
                break;
            case "depth":
                renderPassEncoder.setPipeline(this._quadDepthPipeline);
                break;
            case "segment":
                renderPassEncoder.setPipeline(this._quadSegmentPipeline);
                break;
            case "edge":
                renderPassEncoder.setPipeline(this._quadEdgePipeline);
                break;
            case "texture":
                renderPassEncoder.setPipeline(this._quadTexturePipeline);
                break;
        }
        renderPassEncoder.setBindGroup(0, this._quadBindGroup1);
        renderPassEncoder.setBindGroup(1, this._quadBindGroup2);
        renderPassEncoder.draw(6, 1, 0, 0);
        renderPassEncoder.end();

        // Submit
        this._queue.submit([commandEncoder.finish()]);
    }
}