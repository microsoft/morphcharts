// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import * as Core from "core";
import * as Spec from "spec";
import * as WebGPURenderer from "webgpuraytrace";
import { Common } from "./common.js";
import { MouseWheel } from "./input/mousewheel.js";
import { IManipulationProcessorOptions, ManipulationProcessor } from "./input/manipulationprocessor.js";
import { Pointers } from "./input/pointers.js";
import { Manipulator } from "./input/manipulator.js";
import { Editor } from "./editor.js";
import { Data } from "./data.js";

window.onload = () => { new Main(); };

export class Main {
    private _canvas: HTMLCanvasElement;
    private _isRunning: boolean;
    private _animationFrame: number;
    private _previousTime: DOMHighResTimeStamp;

    // Spec
    private _samplesPopup: HTMLDivElement;
    private _plot: Spec.Plot;
    private _hasSpecChanged: boolean;
    private _isSpecValid: boolean;
    private _scene: Spec.IScene;
    private _editor: Editor;
    private _error: HTMLDivElement;

    // Data
    private _data: Data;

    // Camera
    private _camera: Core.Cameras.AltAzimuthPerspectiveCamera;
    private _fovRange: HTMLInputElement;
    private _fovLabel: HTMLLabelElement;
    private _apertureRange: HTMLInputElement;
    private _apertureLabel: HTMLLabelElement;
    private _focusRange: HTMLInputElement;
    private _focusLabel: HTMLLabelElement;
    private _cameraResetButton: HTMLInputElement;
    private _captureButton: HTMLButtonElement;
    private _includeCameraCheckbox: HTMLInputElement;

    // Renderer
    private _widthText: HTMLInputElement;
    private _heightText: HTMLInputElement;
    private _renderer: WebGPURenderer.Main;
    private _glyphRasterizerVisual: WebGPURenderer.GlyphRasterizerVisual;
    private _startStopButton: HTMLButtonElement;
    private _maxSamplesText: HTMLInputElement;
    private _maxSamplesPerPixel: number;
    private _samplesLabel: HTMLLabelElement;

    // Manipulation
    private _dragToleranceSquared: number;
    private _manipulatorMinRelativeDistanceSquared: number;
    private _multiTouchZoomScale: number;
    private _mouseWheelZoomScale: number;
    private _mouseWheel: MouseWheel;
    private _pointers: Pointers
    private _manipulationProcessor: ManipulationProcessor;
    private _manipulators: { [id: string]: Manipulator; };

    // Tiles
    private _tilesXText: HTMLInputElement;
    private _tilesYText: HTMLInputElement;
    private _tileOffsetXText: HTMLInputElement;
    private _tileOffsetYText: HTMLInputElement;
    private _tilesX: number;
    private _tilesY: number;
    private _tileOffsetX: number;
    private _tileOffsetY: number;

    // Debug
    private _debug: Debug;
    private _debugCheckbox: HTMLInputElement;
    private _isDebugVisible: boolean;

    constructor() {
        // Canvas
        this._canvas = document.getElementById("canvas") as HTMLCanvasElement;
        this._canvas.addEventListener("contextmenu", e => e.preventDefault());

        // Debug
        this._debug = new Debug();
        this._debugCheckbox = document.getElementById("debugCheckbox") as HTMLInputElement;
        const debugContainer = document.getElementById("debugContainer") as HTMLDivElement;
        const urlParams = new URLSearchParams(window.location.search);
        const debug = urlParams.get("debug");
        if (debug && (debug.toLowerCase() == "true")) { this._debugCheckbox.checked = true; }
        const setDebugVisibility = () => {
            this._isDebugVisible = this._debugCheckbox.checked;
            debugContainer.style.display = this._isDebugVisible ? "block" : "none";
        }
        this._debugCheckbox.addEventListener("change", setDebugVisibility);
        setDebugVisibility();

        // Manipulation
        this._dragToleranceSquared = 100; // 10px
        this._manipulatorMinRelativeDistanceSquared = 100; // 10px
        this._mouseWheelZoomScale = 0.001;
        this._multiTouchZoomScale = 1;
        this._mouseWheel = new MouseWheel();
        this._mouseWheel.initialize(this._canvas);
        const manipulationProcessorOptions: IManipulationProcessorOptions = {
            dragToleranceSquared: this._dragToleranceSquared,
            manipulatorMinRelativeDistanceSquared: this._manipulatorMinRelativeDistanceSquared,
        };
        this._manipulationProcessor = new ManipulationProcessor(manipulationProcessorOptions);
        this._manipulators = {};
        this._pointers = new Pointers(this._manipulators);
        this._pointers.initialize(this._canvas);

        // Divider
        const rightContainer = document.getElementById("rightContainer") as HTMLDivElement;
        const style = getComputedStyle(rightContainer);
        const minWidth = parseInt(style.minWidth);
        const divider = document.getElementById("divider") as HTMLDivElement;
        let startX: number;
        let startWidth: number;
        let isDragging = false;
        divider.addEventListener("mousedown", (e) => {
            startX = e.clientX;
            startWidth = rightContainer.clientWidth;
            isDragging = true;
        });
        document.addEventListener("mouseup", () => {
            if (isDragging) { console.log(`resized to ${rightContainer.clientWidth}px`); }
            isDragging = false;
        });
        document.addEventListener("mouseleave", () => {
            if (isDragging) { console.log(`resized to ${rightContainer.clientWidth}px`); }
            isDragging = false;
        });
        document.addEventListener("mousemove", (e) => {
            if (isDragging) {
                const deltaX = e.clientX - startX;
                const width = Math.max(startWidth - deltaX, minWidth);
                rightContainer.style.width = `${width}px`;
            }
        });

        // Tabs
        const openTab = (tabButton: HTMLElement, tab: HTMLElement): void => {
            const tabs = document.getElementsByClassName("tab");
            const tabButtons = document.getElementsByClassName("tabButton");
            // Reset active tab
            for (let i = 0; i < tabs.length; i++) {
                const element = tabs[i] as HTMLElement;
                element.className = element.className.replace(" active", "");
            }
            // Reset active tab buttons
            for (let i = 0; i < tabButtons.length; i++) {
                const element = tabButtons[i] as HTMLInputElement;
                element.className = element.className.replace(" active", "");
            }
            // Add "active" class to tab and tab button
            tab.className += " active";
            tabButton.className += " active";
        }
        const tabCount = document.getElementsByClassName("tabButton").length;
        for (let i = 0; i < tabCount; i++) {
            const tabButton = document.getElementById(`tabButton${i + 1}`);
            const tab = document.getElementById(`tab${i + 1}`);
            if (tabButton && tab) {
                // Open tab on click
                tabButton.addEventListener("click", () => openTab(tabButton, tab));

                // Open tab on enter or space
                tabButton.addEventListener("keydown", (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openTab(tabButton, tab);
                    }
                });

                // Open first tab
                if (i == 0) { openTab(tabButton, tab); }
            }
        }

        // Initialize
        this._initialize();
    }

    private _resize(width: number, height: number): void {
        console.log(`resize ${width}x${height}`);
        this._renderer.width = width;
        this._renderer.height = height;
        this._canvas.width = width;
        this._canvas.height = height;
        this._camera.width = width;
        this._camera.height = height;
    }

    private async _initialize(): Promise<void> {
        const start = performance.now();

        // Renderer
        await this._initializeRendererAsync();

        // Create a default camera
        const cameraOptions: Core.Cameras.IAltAzimuthPerspectiveCameraOptions = {
            position: Core.vector3.clone(Core.Config.cameraPosition),
            target: Core.vector3.clone(Core.Config.cameraTarget),
            fov: Core.Config.cameraFov,
            aperture: Core.Config.cameraAperture,
            focusDistance: Core.Config.cameraFocusDistance,
            nearPlane: Core.Config.cameraNearPlane,
            farPlane: Core.Config.cameraFarPlane,
            width: this._renderer.width,
            height: this._renderer.height,
        };
        this._camera = new Core.Cameras.AltAzimuthPerspectiveCamera(cameraOptions);
        this._cameraResetButton = document.getElementById("cameraResetButton") as HTMLInputElement;

        // Resize
        const sizeRadioGroup = document.getElementsByName("sizeRadioGroup") as NodeListOf<HTMLInputElement>;
        this._widthText = document.getElementById("widthText") as HTMLInputElement;
        this._heightText = document.getElementById("heightText") as HTMLInputElement;
        const resizeButton = document.getElementById("resizeButton") as HTMLButtonElement;
        let sizeType: string;
        for (let i = 0; i < sizeRadioGroup.length; i++) {
            const sizeRadio = sizeRadioGroup[i] as HTMLInputElement;
            if (sizeRadio.checked) { sizeType = sizeRadio.value; }
            sizeRadio.addEventListener("change", () => {
                sizeType = sizeRadio.value;
                if (sizeType == "custom") {
                    this._widthText.disabled = false;
                    this._heightText.disabled = false;
                }
                else {
                    this._widthText.disabled = true;
                    this._heightText.disabled = true;
                }
            });
        }
        const sizeChanged = () => {
            let width: number;
            let height: number;
            switch (sizeType) {
                case "fit":
                    const leftContainer = document.getElementById("leftContainer") as HTMLDivElement;
                    width = leftContainer.clientWidth - 1; // -1 to avoid scrollbar
                    height = leftContainer.clientHeight - 1; // -1 to avoid scrollbar
                    break;
                case "hd":
                    width = 1280; height = 720;
                    break;
                case "fhd":
                    width = 1920; height = 1080;
                    break;
                case "4k":
                    width = 3840; height = 2160;
                    break;
                case "custom":
                    width = parseInt(this._widthText.value);
                    height = parseInt(this._heightText.value);
                    if (isNaN(width) || isNaN(height)) {
                        console.log("invalid size");
                        return;
                    }
                    const maxBufferSize = Math.pow(2, 20) * 128 / 12;
                    if (width * height > maxBufferSize) {
                        console.log(`max buffer size is ${maxBufferSize}`);
                        return;
                    }
            }
            this._resize(width, height);
        };
        resizeButton.onclick = () => sizeChanged();
        sizeChanged();
        this._canvas.style.display = "block"; // Show canvas

        // Initialize UI
        await this._initializePlotsAsync();
        this._intializeRenderOptions();
        this._initializeData();
        this._initializeTiles();

        // Capture
        this._captureButton = document.getElementById("captureButton") as HTMLButtonElement;
        this._captureButton.addEventListener("click", async () => {
            if (this._renderer) {
                await this._renderer.renderAsync(0);
                const timestamp = Core.Time.formatDate(new Date());
                const filename = `${timestamp}_${this._renderer.frameCount}spp`;
                this._canvas.toBlob((blob: Blob) => { this._capture(blob, filename); }, "image/png");
            }
        });

        // Update UI with default settings
        this._updateUI();

        console.log(`client initialized ${Core.Time.formatDuration((performance.now() - start))}`);
    }

    private _initializeData(): void {
        const dataTab = document.getElementById("tab3") as HTMLDivElement;
        this._data = new Data(dataTab);
    }

    private _intializeRenderOptions(): void {
        // Max frames
        this._samplesLabel = document.getElementById("samplesLabel") as HTMLLabelElement;
        this._maxSamplesText = document.getElementById("maxSamplesText") as HTMLInputElement;
        this._maxSamplesText.onchange = () => { this._maxSamplesPerPixel = parseInt(this._maxSamplesText.value); };
        this._maxSamplesPerPixel = WebGPURenderer.Config.maxSamplesPerPixel;
        this._maxSamplesText.value = this._maxSamplesPerPixel.toString();

        // Field of view
        this._fovRange = document.getElementById("fovRange") as HTMLInputElement;
        this._fovLabel = document.getElementById("fovLabel") as HTMLLabelElement;
        this._fovRange.oninput = () => {
            const fov = parseFloat(this._fovRange.value);
            this._fovLabel.innerText = fov.toFixed(1);
            this._camera.fov = fov * Core.Constants.RADIANS_PER_DEGREE;
        }

        // Aperture
        this._apertureRange = document.getElementById("apertureRange") as HTMLInputElement;
        this._apertureLabel = document.getElementById("apertureLabel") as HTMLLabelElement;
        this._apertureRange.oninput = () => {
            const aperture = parseFloat(this._apertureRange.value);
            this._apertureLabel.innerText = aperture.toFixed(1);
            this._camera.aperture = aperture / 1000;
        }

        // Focus distance
        this._focusRange = document.getElementById("focusRange") as HTMLInputElement;
        this._focusLabel = document.getElementById("focusLabel") as HTMLLabelElement;
        this._focusRange.oninput = () => {
            const focusDistance = parseFloat(this._focusRange.value);
            this._focusLabel.innerText = focusDistance.toFixed(3);
            this._camera.focusDistance = focusDistance;
        }

        // Multisample
        const antialiasSelect = document.getElementById("antialiasSelect") as HTMLInputElement;
        antialiasSelect.value = Core.Config.multisample.toString();
        antialiasSelect.oninput = () => {
            this._renderer.multisample = parseInt(antialiasSelect.value);
        }

        // Render mode options
        const raytraceOptions = document.getElementById("raytraceOptions") as HTMLDivElement;
        const colorOptions = document.getElementById("colorOptions") as HTMLDivElement;
        const edgeOptions = document.getElementById("edgeOptions") as HTMLDivElement;
        const renderModeChanged = () => {
            // Hide all options
            raytraceOptions.style.display = "none";
            colorOptions.style.display = "none";
            edgeOptions.style.display = "none";
            // Show options for selected render mode
            switch (this._renderer.renderMode) {
                case "raytrace":
                    raytraceOptions.style.display = "flex";
                    break;
                case "color":
                    colorOptions.style.display = "flex";
                    break;
                case "edge":
                    edgeOptions.style.display = "flex";
                    break;
            }
        };

        // Render mode
        const renderModeRadioGroup = document.getElementsByName("renderMode") as NodeListOf<HTMLInputElement>;
        for (let i = 0; i < renderModeRadioGroup.length; i++) {
            const radio = renderModeRadioGroup[i] as HTMLInputElement;
            radio.addEventListener("change", () => {
                this._renderer.renderMode = radio.value;
                renderModeChanged();
            });

            // Default
            if (radio.checked) { this._renderer.renderMode = radio.value; }
        }
        renderModeChanged();
    }

    private _initializeTiles(): void {
        this._tilesXText = document.getElementById("tilesXText") as HTMLInputElement;
        this._tilesYText = document.getElementById("tilesYText") as HTMLInputElement;
        this._tileOffsetXText = document.getElementById("tileOffsetXText") as HTMLInputElement;
        this._tileOffsetYText = document.getElementById("tileOffsetYText") as HTMLInputElement;
        const tileResetButton = document.getElementById("tileResetButton") as HTMLButtonElement;
        tileResetButton.onclick = () => {
            this._tilesX = 1;
            this._tilesY = 1;
            this._tileOffsetX = 0;
            this._tileOffsetY = 0;
            this._updateTiles();
        };
        const tileUpdateButton = document.getElementById("tileUpdateButton") as HTMLButtonElement;
        tileUpdateButton.onclick = () => {
            this._tilesX = parseInt(this._tilesXText.value);
            this._tilesY = parseInt(this._tilesYText.value);
            this._tileOffsetX = parseInt(this._tileOffsetXText.value);
            this._tileOffsetY = parseInt(this._tileOffsetYText.value);
            this._updateTiles();
        };
    }

    private _updateTiles(): void {
        this._tilesXText.value = this._tilesX.toString();
        this._tilesYText.value = this._tilesY.toString();
        this._tileOffsetXText.value = this._tileOffsetX.toString();
        this._tileOffsetYText.value = this._tileOffsetY.toString();
        this._renderer.tilesX = this._tilesX;
        this._renderer.tilesY = this._tilesY;
        this._renderer.tileOffsetX = this._tileOffsetX;
        this._renderer.tileOffsetY = this._tileOffsetY;
    }


    private async _initializePlotsAsync(): Promise<void> {
        const start = performance.now();

        // UI
        this._startStopButton = document.getElementById("startStopButton") as HTMLButtonElement;
        this._includeCameraCheckbox = document.getElementById("cameraIncludeCheckbox") as HTMLInputElement;

        // Editor
        this._editor = new Editor();
        this._editor.changedCallback = () => {
            console.log("spec changed");
            this._hasSpecChanged = true;
            this._updateDebug(0);

            // Disable start button if no spec
            if (!this._isRunning) {
                this._startStopButton.disabled = this._editor.content.trim().length == 0;
            }
        };
        this._error = document.getElementById("error") as HTMLDivElement;

        // Load initial sample from querystring
        const urlParams = new URLSearchParams(window.location.search);
        const sample = urlParams.get("plot");
        if (sample) {
            const value = sample.toLowerCase().endsWith(".json") ? sample : `${sample}.json`;
            // Try to fetch sample and add to editor
            try {
                const text = await fetch(value).then(response => response.text());
                this._sampleLoaded(text);
            }
            catch (error) {
                console.log("error loading sample from querystring", error);
                this._sampleLoaded("{}");
            }
        }
        else { this._sampleLoaded("{}"); }

        // Add samples to popup
        this._samplesPopup = document.getElementById("samplesPopup") as HTMLDivElement;
        const samplesCloseButton = document.getElementById("samplesCloseButton") as HTMLButtonElement;
        samplesCloseButton.onclick = () => { this._samplesPopup.style.display = "none"; };
        const samplesContainer = document.getElementById("samples") as HTMLDivElement;

        // Load index
        const specFolder = "samples";
        const imageFolder = "gallery";
        const samples = await Common.loadSampleIndex(`${specFolder}/index.json`);
        const samplesButton = document.getElementById("samplesButton") as HTMLAnchorElement;
        samplesButton.onclick = () => { this._samplesPopup.style.display = "flex"; };
        const loadSample = async (path: string): Promise<void> => {
            this._samplesPopup.style.display = "none";
            await this._loadSampleAsync(path);
        };
        for (let i = 0; i < samples.length; i++) {
            // Build sample element
            const sample = samples[i];
            const sampleContainer = document.createElement("div");
            sampleContainer.className = "sampleContainer";
            sampleContainer.tabIndex = 0; // Make focusable
            const div = document.createElement("div");
            div.className = "sampleTitle";
            div.innerText = sample.title;
            sampleContainer.appendChild(div);
            const img = document.createElement("img");
            img.className = "sampleImage";
            img.src = `${imageFolder}/${sample.image}`;
            img.alt = sample.title;
            img.title = sample.description;
            sampleContainer.appendChild(img);
            samplesContainer.appendChild(sampleContainer);

            // Load sample on click
            sampleContainer.onclick = async () => {
                await loadSample(`${specFolder}/${sample.plot}`);
            };

            // Load sample on enter or space
            sampleContainer.onkeydown = async (e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    await loadSample(`${specFolder}/${sample.plot}`);
                }
            };
        }

        // Start, stop
        this._startStopButton.onclick = async () => {
            if (this._startStopButton.value == "Start") {
                this._startStopButton.disabled = true;

                // Allow button to update to disabled
                setTimeout(async () => {
                    await this._startAsync();
                });
            }
            else {
                this._stop();
            }
        }
        console.log(`plots initialized ${Core.Time.formatDuration((performance.now() - start))}`);
    }

    private _sampleLoaded(spec: string): void {
        this._editor.content = spec;
        this._hasSpecChanged = true;
    }

    private async _loadSampleAsync(path: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            try {
                fetch(path)
                    .then(response => response.text())
                    .then(async sample => {
                        this._sampleLoaded(sample);
                        resolve();
                    });
            }
            catch (error) {
                console.log("error loading sample", error);
                reject(error);
            }

            // Close samples popup
            this._samplesPopup.style.display = "none";
        });
    }

    private _updateUI(): void {
        // Field of view
        const fovDegrees = this._camera.fov * Core.Constants.DEGREES_PER_RADIAN;
        this._fovRange.value = fovDegrees.toString();
        this._fovLabel.innerText = fovDegrees.toFixed(1);

        // Aperture
        const aperture = this._camera.aperture * 1000;
        this._apertureRange.value = aperture.toString();
        this._apertureLabel.innerText = aperture.toFixed(1);

        // Focus distance
        const focusDistance = this._camera.focusDistance;
        this._focusRange.value = focusDistance.toString();
        this._focusLabel.innerText = focusDistance.toFixed(3);

        // Debug
        this._updateDebug(0);
    }

    private _updateDebug(elapsedTime: number): void {
        if (this._isDebugVisible) {
            // Render
            this._debug.renderFrameCount = this._renderer.frameCount;

            // Camera
            this._debug.cameraPosition = this._camera.position;
            this._debug.cameraTarget = this._camera.target;
            this._debug.cameraFov = this._camera.fov;
            this._debug.cameraAperture = this._camera.aperture;
            this._debug.cameraFocusDistance = this._camera.focusDistance;

            // Editor
            this._debug.editorLineCount = this._editor.currentLines;
            this._debug.editorLineNumber = this._editor.currentLine;

            // Update
            this._debug.update();
        }
    }

    private async _updateAsync(elapsedTime: number): Promise<void> {
        // Manipulation
        this._processManipulation(elapsedTime);

        // Camera
        this._camera.update(elapsedTime);
        this._renderer.cameraPosition = this._camera.position;
        this._renderer.cameraTarget = this._camera.target;
        this._renderer.cameraFov = this._camera.fov;
        this._renderer.cameraAperture = this._camera.aperture;
        this._renderer.cameraFocusDistance = this._camera.focusDistance;

        // Renderer
        await this._renderer.updateAsync(elapsedTime);
    }

    // Update signals in UI
    private _updateSignals(plot: Spec.Plot): void {
        const names: string[] = [];
        const values: any[] = [];
        this._getSignals(this._plot.root, names, values);
        const signalsContainer = document.getElementById("signalsContainer") as HTMLDivElement;
        signalsContainer.innerHTML = "";
        const table = document.createElement("table");
        let tr = document.createElement("tr");
        let th = document.createElement("th");
        th.innerText = "Signal";
        tr.appendChild(th);
        th = document.createElement("th");
        th.innerText = "Value";
        tr.appendChild(th);
        table.appendChild(tr);
        for (let i = 0; i < names.length; i++) {
            const name = names[i];
            const value = values[i];
            tr = document.createElement("tr");
            let td = document.createElement("td");
            td.innerText = name;
            tr.appendChild(td);
            td = document.createElement("td");
            td.innerText = value;
            tr.appendChild(td);
            table.appendChild(tr);
        }
        signalsContainer.appendChild(table);
    }

    private _getSignals(group: Spec.Marks.Group, names: string[], values: any[]): void {
        for (let key in group.signals) {
            names.push(key);
            values.push(group.signals[key].value);
        }
        if (group.marks) {
            for (let i = 0; i < group.marks.length; i++) {
                const child = group.marks[i];
                if (child instanceof Spec.Marks.Group) {
                    this._getSignals(child, names, values);
                }
            }
        }
    }

    private async _startAsync(): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            try {
                // Plot specification
                if (this._hasSpecChanged) {
                    this._hasSpecChanged = false;
                    this._isSpecValid = false;

                    // Clear
                    this._error.innerText = "";
                    this._data.clear();

                    // Check for valid JSON
                    const plotJSON = this._editor.parseJSON();

                    // Parse plot specification
                    this._plot = await Spec.Plot.fromJSONAsync(plotJSON, this._data.datasets);

                    // Parse scene
                    this._scene = await this._plot.parse();

                    // Update data
                    this._data.update(this._plot);

                    // Update signals
                    this._updateSignals(this._plot);

                    // Initialize scene
                    this._initializeScene(this._scene, this._includeCameraCheckbox.checked);
                    this._isSpecValid = true;

                    // Update UI with scene settings
                    this._updateUI();
                }

                if (!this._isSpecValid) { throw new Error("invalid spec"); }

                // Ensure valid spec, and marks exist
                if (this._renderer.bufferVisuals.length > 0 ||
                    this._renderer.labelSetVisuals.length > 0 ||
                    this._renderer.imageVisuals.length > 0) {

                    // Tiles
                    this._tilesX = parseInt(this._tilesXText.value);
                    this._tilesY = parseInt(this._tilesYText.value);
                    this._tileOffsetX = parseInt(this._tileOffsetXText.value);
                    this._tileOffsetY = parseInt(this._tileOffsetYText.value);
                    if (isNaN(this._tilesX) || isNaN(this._tilesY) || isNaN(this._tileOffsetX) || isNaN(this._tileOffsetY)) { throw new Error("invalid tile settings"); }
                    this._renderer.tilesX = this._tilesX;
                    this._renderer.tilesY = this._tilesY;
                    this._renderer.tileOffsetX = this._tileOffsetX;
                    this._renderer.tileOffsetY = this._tileOffsetY;
                    const totalTiles = this._tilesX * this._tilesY;
                    const tileIndex = this._tileOffsetY * this._tilesX + this._tileOffsetX + 1;

                    // UI
                    this._startStopButton.value = "Stop";
                    this._startStopButton.disabled = false;
                    this._cameraResetButton.disabled = false;

                    // Reset manipulation
                    this._mouseWheel.reset();

                    // Allow re-run if maximum framecount has been reached
                    if (this._renderer.frameCount >= this._maxSamplesPerPixel) {
                        this._renderer.frameCount = 0;
                    }

                    // Start render loop
                    this._isRunning = true;
                    this._previousTime = performance.now();
                    this._animationFrame = requestAnimationFrame(async (currentTime: DOMHighResTimeStamp) => await this._tickAsync(currentTime));
                    this._captureButton.disabled = false
                    console.log("render start");
                    if (totalTiles > 1) { console.log(`tile [${this._tileOffsetX},${this._tileOffsetY}] (${tileIndex} of ${totalTiles})`); }
                }
                else {
                    console.log("no marks to render");
                    this._stop();
                }
                resolve();
            }
            catch (error) {
                // Show error
                this._error.innerText = error;
                console.log("error parsing plot specification");
                this._stop();
                reject(error);
            }
        });
    }

    private _stop(): void {
        this._isRunning = false;
        if (this._animationFrame) { cancelAnimationFrame(this._animationFrame); }

        // UI
        this._samplesLabel.innerText = this._renderer.frameCount.toString();
        this._startStopButton.value = "Start";
        this._startStopButton.disabled = this._editor.content.trim().length == 0;
        this._cameraResetButton.disabled = true;
        console.log("render stop");
    }

    private async _tickAsync(currentTime: DOMHighResTimeStamp): Promise<void> {
        const elapsedTime = currentTime - this._previousTime;
        this._previousTime = currentTime;
        await this._updateAsync(elapsedTime);
        await this._renderer.renderAsync(elapsedTime);

        // UI
        this._samplesLabel.innerText = this._renderer.frameCount.toString();
        this._updateDebug(elapsedTime);

        // Next frame
        if (this._isRunning) {
            if (this._renderer.frameCount >= this._maxSamplesPerPixel) {
                const timestamp = Core.Time.formatDate(new Date());
                let filename = `${timestamp}_${this._renderer.frameCount}spp`;

                // Tiling?
                const totalTiles = this._tilesX * this._tilesY;
                if (totalTiles > 1) {
                    // Capture current tile
                    filename = `${filename}_tile[${this._tileOffsetX},${this._tileOffsetY}]`;
                    this._canvas.toBlob((blob: Blob) => { this._capture(blob, filename); }, "image/png");

                    // Auto tile?
                    const autoTile = document.getElementById("tileAutoCheckbox") as HTMLInputElement;
                    if (!autoTile.checked) {
                        // Stop
                        this._stop();
                        return;
                    }

                    // Next tile
                    let tileIndex = this._tileOffsetY * this._tilesX + this._tileOffsetX + 1;
                    if (tileIndex < totalTiles) {
                        tileIndex++;
                        this._tileOffsetX++;
                        if (this._tileOffsetX >= this._tilesX) {
                            this._tileOffsetX = 0;
                            this._tileOffsetY++;
                        }
                        this._updateTiles();
                        console.log(`tile [${this._tileOffsetX},${this._tileOffsetY}] (${tileIndex} of ${totalTiles})`);

                        // Reset for next tile
                        this._renderer.frameCount = 0;
                    }
                    else {
                        // All tiles done
                        this._stop();
                        return;
                    }
                }
                else {
                    // Auto-capture
                    this._canvas.toBlob((blob: Blob) => { this._capture(blob, filename); }, "image/png");

                    // Stop
                    this._stop();
                    return;
                }
            }

            // Next frame
            this._animationFrame = requestAnimationFrame(async (currentTime: DOMHighResTimeStamp) => await this._tickAsync(currentTime));
        }
    }

    private _processManipulation(elapsedTime: number): void {
        this._mouseWheel.update(elapsedTime);
        if (this._mouseWheel.delta != 0) {
            const scale = this._mouseWheelZoomScale; // Scale zoom delta
            this._camera.zoom(this._mouseWheel.delta * scale, this._pointers.hoverX, this._pointers.hoverY);
        }

        // Pointers
        this._manipulationProcessor.update(elapsedTime, this._manipulators);
        const translationDelta = this._manipulationProcessor.translationDelta;
        // If single touch, check for right-mouse or Ctrl/Shift keys to translate
        if (this._manipulationProcessor.count == 1) {
            if (translationDelta[0] != 0 || translationDelta[1] != 0) {
                for (const key in this._manipulators) {
                    const manipulator = this._manipulators[key];
                    const rightButton = 2;
                    if ((manipulator.type == "mouse" && manipulator.button == rightButton) || manipulator.shiftKey || manipulator.ctrlKey) {
                        // Translate
                        this._camera.translate(translationDelta[0], translationDelta[1]);
                    }
                    else {
                        // Rotate
                        this._camera.rotate(translationDelta[0], translationDelta[1]);
                    }
                    break; // Single touch, so break
                }
            }
        }
        else {
            // Zoom
            if (this._manipulationProcessor.scaleDelta != 0) {
                const scale = -this._manipulationProcessor.scaleDelta * this._multiTouchZoomScale;
                this._camera.zoom(scale, this._manipulationProcessor.centroid[0], this._manipulationProcessor.centroid[1]);
            }
        }
    }

    private async _initializeRendererAsync(): Promise<void> {
        const start = performance.now();

        // Initialize the renderer
        this._renderer = new WebGPURenderer.Main(this._canvas);
        await this._renderer.initializeAsync();

        // High-quality font
        const fontAtlasWidth = 4096;
        const fontAtlasHeight = 4096;
        const glyphRasterizerSize = 192;
        const glyphRasterizerBorder = 0x18; // 24px
        const glyphRasterizerMaxDistance = 0x40; // 64px
        const glyphRasterizerEdgeValue = Core.Config.sdfBuffer;

        // Atlas
        const atlasOptions: Core.IAtlasOptions = {
            width: fontAtlasWidth,
            height: fontAtlasHeight,
            type: "font"
        };
        const atlas = new Core.Atlas(atlasOptions);
        const atlasVisual = this._renderer.createAtlasVisual(atlas);
        this._renderer.atlasVisuals.push(atlasVisual);

        // Glyph rasterizer
        const glyphRasterizerOptions: Core.IGlyphRasterizerOptions = {
            size: glyphRasterizerSize,
            border: glyphRasterizerBorder,
            edgeValue: glyphRasterizerEdgeValue,
            maxDistance: glyphRasterizerMaxDistance,
        };
        const glyphRasterizer = new Core.GlyphRasterizer(glyphRasterizerOptions);
        this._glyphRasterizerVisual = this._renderer.createGlyphRasterizerVisual(glyphRasterizer, atlasVisual);
        console.log(`renderer initialized ${Core.Time.formatDuration((performance.now() - start))}`);
    }

    private _capture(blob: Blob, filename: string): void {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${filename}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
    }

    private _initializeScene(scene: Spec.IScene, includeCamera: boolean): void {
        const start = performance.now();

        // Reset scene
        this._renderer.bufferVisuals = [];
        this._renderer.labelSetVisuals = [];
        this._renderer.imageVisuals = [];

        // Scene visuals
        for (let i = 0; i < scene.buffers.length; i++) {
            const buffer = scene.buffers[i];
            const bufferVisual = this._renderer.createBufferVisual(buffer);
            this._renderer.bufferVisuals.push(bufferVisual);
        }
        for (let i = 0; i < scene.labels.length; i++) {
            const labels = scene.labels[i];
            const labelSetVisual = this._renderer.createLabelSetVisual(labels, this._glyphRasterizerVisual);
            this._renderer.labelSetVisuals.push(labelSetVisual);
        }
        for (let i = 0; i < scene.images.length; i++) {
            const image = scene.images[i];
            const imageVisual = this._renderer.createImageVisual(image);
            this._renderer.imageVisuals.push(imageVisual);
        }

        // Camera
        const cameraPosition = scene.camera.position || Core.Config.cameraPosition;
        const cameraTarget = scene.camera.target || Core.Config.cameraTarget;
        const cameraFov = scene.camera.fov || Core.Config.cameraFov;
        const cameraAperture = scene.camera.aperture || Core.Config.cameraAperture;
        const cameraFocusDistance = scene.camera.focusDistance || Core.Config.cameraFocusDistance;
        const _resetCamera = () => {
            this._camera.position = Core.vector3.clone(cameraPosition);
            this._camera.target = Core.vector3.clone(cameraTarget);
            this._camera.fov = cameraFov;
            this._camera.aperture = cameraAperture;
            this._camera.focusDistance = cameraFocusDistance;
        };
        if (includeCamera) { _resetCamera(); }
        this._cameraResetButton.onclick = () => {
            _resetCamera();
            this._updateUI();
        };

        // Lighting
        this._renderer.ambientColor = scene.ambient || Core.vector3.clone(Core.Config.ambientColor);
        this._renderer.backgroundColor = scene.background || Core.vector4.clone(Core.Config.backgroundColor);
        this._renderer.directionToLight = scene.directionToLight || Core.vector3.clone(Core.Config.directionToLight);
        this._renderer.diffuseColor = scene.diffuse || Core.vector3.clone(Core.Config.diffuseColor);
        this._renderer.specularIntensity = (scene.specular != undefined) ? scene.specular : Core.Config.specularIntensity;

        console.log(`scene initialized ${Core.Time.formatDuration((performance.now() - start))}`);
    }
}

class Debug {
    // Renderer
    private _renderFrameCount: HTMLSpanElement;
    public renderFrameCount: number;

    // Editor
    private _editorLineCount: HTMLSpanElement;
    public editorLineCount: number;
    private _editorLineNumber: HTMLSpanElement;
    public editorLineNumber: number;

    // Camera
    private _cameraPosition: HTMLSpanElement;
    public cameraPosition: Core.Vector3;
    private _cameraTarget: HTMLSpanElement;
    public cameraTarget: Core.Vector3;
    private _cameraDistance: HTMLSpanElement;
    private _cameraFov: HTMLSpanElement;
    public cameraFov: number;
    private _cameraAperture: HTMLSpanElement;
    public cameraAperture: number;
    private _cameraFocus: HTMLSpanElement;
    public cameraFocusDistance: number;

    constructor() {
        // Renderer
        this._renderFrameCount = document.getElementById("debugRenderFrameCount") as HTMLSpanElement;

        // Camera
        this._cameraPosition = document.getElementById("debugCameraPosition") as HTMLSpanElement;
        this._cameraTarget = document.getElementById("debugCameraTarget") as HTMLSpanElement;
        this._cameraDistance = document.getElementById("debugCameraDistance") as HTMLSpanElement;
        this._cameraFov = document.getElementById("debugCameraFov") as HTMLSpanElement;
        this._cameraAperture = document.getElementById("debugCameraAperture") as HTMLSpanElement;
        this._cameraFocus = document.getElementById("debugCameraFocus") as HTMLSpanElement;

        // Editor
        this._editorLineCount = document.getElementById("debugEditorLineCount") as HTMLSpanElement;
        this._editorLineNumber = document.getElementById("debugEditorLineNumber") as HTMLSpanElement;
    }

    public update(): void {
        // Renderer
        this._renderFrameCount.innerText = this.renderFrameCount.toString();

        // Camera
        this._cameraPosition.innerText = `[${this.cameraPosition[0].toFixed(3).padStart(6, " ")},${this.cameraPosition[1].toFixed(3).padStart(6, " ")},${this.cameraPosition[2].toFixed(3).padStart(6, " ")}]`;
        this._cameraTarget.innerText = `[${this.cameraTarget[0].toFixed(3).padStart(6, " ")},${this.cameraTarget[1].toFixed(3).padStart(6, " ")},${this.cameraTarget[2].toFixed(3).padStart(6, " ")}]`;
        this._cameraDistance.innerText = (Core.vector3.distance(this.cameraPosition, this.cameraTarget)).toFixed(3);
        this._cameraFov.innerText = `${Math.round(this.cameraFov * Core.Constants.DEGREES_PER_RADIAN)}°`;
        this._cameraAperture.innerText = `${(this.cameraAperture * 1000).toFixed(1)}mm`;
        this._cameraFocus.innerText = `${(this.cameraFocusDistance).toFixed(3)}`;

        // Editor
        this._editorLineCount.innerText = this.editorLineCount.toString();
        this._editorLineNumber.innerText = this.editorLineNumber.toString();
    }
}