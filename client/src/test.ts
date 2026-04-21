// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import * as Core from 'core';
import * as Spec from 'spec';
import * as WebGPURenderer from 'webgpuraytrace';

interface TestResult {
    name: string;
    status: 'pass' | 'fail';
    frames?: number;
    setupMs?: number;
    time?: number;
    fps?: number;
    avgFrameMs?: number;
    error?: string;
}

class TestRunner {
    private _canvas: HTMLCanvasElement;
    private _renderer: WebGPURenderer.Main;
    private _camera: Core.Cameras.AltAzimuthPerspectiveCamera;
    private _isRunning: boolean = false;
    private _results: TestResult[] = [];

    // UI
    private _specList: HTMLTextAreaElement;
    private _logTextarea: HTMLTextAreaElement;
    private _outputContainer: HTMLDivElement;
    private _startStopButton: HTMLInputElement;
    private _copyButton: HTMLInputElement;
    private _batchCheckbox: HTMLInputElement;
    private _saveCheckbox: HTMLInputElement;
    private _framesText: HTMLInputElement;
    private _warmupText: HTMLInputElement;
    private _widthText: HTMLInputElement;
    private _heightText: HTMLInputElement;

    constructor() {
        this._canvas = document.getElementById('canvas') as HTMLCanvasElement;
        this._specList = document.getElementById('specList') as HTMLTextAreaElement;
        this._logTextarea = document.getElementById('logTextarea') as HTMLTextAreaElement;
        this._outputContainer = document.getElementById('outputContainer') as HTMLDivElement;
        this._startStopButton = document.getElementById('startStopButton') as HTMLInputElement;
        this._copyButton = document.getElementById('copyButton') as HTMLInputElement;
        this._batchCheckbox = document.getElementById('batchCheckbox') as HTMLInputElement;
        this._saveCheckbox = document.getElementById('saveCheckbox') as HTMLInputElement;
        this._framesText = document.getElementById('framesText') as HTMLInputElement;
        this._warmupText = document.getElementById('warmupText') as HTMLInputElement;
        this._widthText = document.getElementById('widthText') as HTMLInputElement;
        this._heightText = document.getElementById('heightText') as HTMLInputElement;

        // Renderer
        this._renderer = new WebGPURenderer.Main(this._canvas);
        window.addEventListener('beforeunload', () => this._renderer.dispose());

        // Camera
        this._camera = new Core.Cameras.AltAzimuthPerspectiveCamera({
            width: this._canvas.width,
            height: this._canvas.height,
        });

        // Test mode toggles warmup/save
        const testModeRadios = document.getElementsByName('testMode') as NodeListOf<HTMLInputElement>;
        for (let i = 0; i < testModeRadios.length; i++) {
            const radio = testModeRadios[i];
            radio.addEventListener('change', () => this._updateTestMode());
        }

        // Render mode
        const renderModeRadios = document.getElementsByName('renderMode') as NodeListOf<HTMLInputElement>;
        for (let i = 0; i < renderModeRadios.length; i++) {
            const radio = renderModeRadios[i];
            radio.addEventListener('change', () => { this._renderer.renderMode = radio.value; });
            if (radio.checked) { this._renderer.renderMode = radio.value; }
        }

        // Start/Stop
        this._startStopButton.onclick = () => {
            if (this._isRunning) { this._isRunning = false; }
            else { this._run(); }
        };
        this._copyButton.onclick = () => this._copyResults();

        // Initialize
        this._log('Initializing GPU...');
        this._initializeAsync();
    }

    private async _initializeAsync(): Promise<void> {
        try {
            await this._renderer.initializeAsync({
                atlasOptions: { width: 4096, height: 4096, type: 'font' },
                glyphRasterizerOptions: {
                    size: 192,
                    border: 0x18,
                    edgeValue: Core.Config.sdfBuffer,
                    maxDistance: 0x40,
                },
            });
            this._log('Ready\n');
            this._startStopButton.disabled = false;
        }
        catch (error) {
            this._log(`Error: ${error}\n`);
        }
    }

    private _isBenchmark(): boolean {
        return (document.querySelector('input[name="testMode"]:checked') as HTMLInputElement)?.value === 'benchmark';
    }

    private _updateTestMode(): void {
        const bench = this._isBenchmark();
        document.getElementById('warmupRow').style.display = bench ? 'flex' : 'none';
        document.getElementById('saveSpan').style.display = bench ? 'none' : '';
        document.getElementById('copySpan').style.display = bench ? '' : 'none';
        if (bench) { this._saveCheckbox.checked = false; }
    }

    private _getSpecs(): string[] {
        return this._specList.value
            .split('\n')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('#'))
            .map(s => s.endsWith('.json') ? s : `${s}.json`);
    }

    private _log(text: string): void {
        this._logTextarea.value += text;
        this._logTextarea.scrollTop = this._logTextarea.scrollHeight;
    }

    private _resize(width: number, height: number): void {
        this._renderer.width = width;
        this._renderer.height = height;
        this._canvas.width = width;
        this._canvas.height = height;
        this._camera.width = width;
        this._camera.height = height;
    }

    private async _run(): Promise<void> {
        const specs = this._getSpecs();
        if (specs.length === 0) { this._log('No specs\n'); return; }

        const width = parseInt(this._widthText.value) || 640;
        const height = parseInt(this._heightText.value) || 360;
        const frames = parseInt(this._framesText.value) || 100;
        const batch = this._batchCheckbox.checked;
        const saveImage = this._saveCheckbox.checked;
        const isBenchmark = this._isBenchmark();
        const warmupFrames = isBenchmark ? (parseInt(this._warmupText.value) || 0) : 0;

        this._isRunning = true;
        this._startStopButton.value = 'Stop';
        this._copyButton.disabled = true;
        this._results = [];
        this._logTextarea.value = '';
        this._outputContainer.innerHTML = '';
        this._resize(width, height);

        const totalStart = performance.now();
        let failedCount = 0;

        for (let i = 0; i < specs.length; i++) {
            if (!this._isRunning) break;

            const spec = specs[i];
            const name = spec.replace('.json', '');
            this._log(`${name}...`);

            try {
                const specText = await fetch(`samples/${spec}`).then(r => r.text());
                const plotJSON = JSON.parse(specText);

                // Setup
                const setupStart = performance.now();
                const plot = await Spec.Plot.fromJSONAsync(plotJSON, {});
                const scene = await plot.createSceneAsync();
                this._renderer.loadScene(scene);
                this._camera.copyFrom(scene.camera);
                this._renderer.copyCamera(this._camera);
                await this._renderer.updateAsync(0);
                const setupMs = performance.now() - setupStart;

                // Warmup
                if (warmupFrames > 0) {
                    await this._renderFramesBatch(warmupFrames);
                }

                // Render
                const elapsed = batch
                    ? await this._renderFramesBatch(frames)
                    : await this._renderFrames(frames);
                const fps = frames / (elapsed / 1000);
                const avgFrameMs = elapsed / frames;

                // Save image
                if (saveImage) {
                    await new Promise<void>(resolve => {
                        this._canvas.toBlob(blob => {
                            if (blob) {
                                const a = document.createElement('a');
                                a.href = URL.createObjectURL(blob);
                                a.download = `${name}_${this._renderer.renderMode}_${width}x${height}.png`;
                                a.click();
                                URL.revokeObjectURL(a.href);
                            }
                            resolve();
                        }, 'image/png');
                    });
                }

                // Output
                if (isBenchmark) {
                    this._log(`setup ${(setupMs / 1000).toFixed(1)}s, render ${(elapsed / 1000).toFixed(1)}s, ${fps.toFixed(1)} fps, ${avgFrameMs.toFixed(1)} ms/frame\n`);
                } else {
                    this._log(`${(elapsed / 1000).toFixed(1)}s\n`);
                    // Thumbnail linked to editor
                    const img = document.createElement('img');
                    img.style.width = '320px';
                    img.src = this._canvas.toDataURL("image/png");
                    img.title = name;
                    const a = document.createElement('a');
                    a.href = `client.html?plot=${encodeURIComponent(name)}`;
                    a.target = '_blank';
                    a.appendChild(img);
                    this._outputContainer.appendChild(a);
                }

                this._results.push({ name, status: 'pass', frames, setupMs, time: elapsed, fps, avgFrameMs });
            }
            catch (error) {
                this._log(`FAILED: ${error}\n`);
                failedCount++;
                this._results.push({ name, status: 'fail', error: String(error) });
            }
        }

        const totalElapsed = ((performance.now() - totalStart) / 1000).toFixed(1);
        const passed = this._results.filter(r => r.status === 'pass').length;
        this._log(`${passed}/${specs.length} passed, ${failedCount} failed, ${totalElapsed}s total\n`);

        this._isRunning = false;
        this._startStopButton.value = 'Start';
        this._copyButton.disabled = this._results.length === 0;
    }

    private _renderFrames(count: number): Promise<number> {
        return new Promise<number>(resolve => {
            let frame = 0;
            const startTime = performance.now();
            const tick = async () => {
                if (frame >= count || !this._isRunning) {
                    resolve(performance.now() - startTime);
                    return;
                }
                await this._renderer.renderAsync(0);
                frame++;
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        });
    }

    private async _renderFramesBatch(count: number): Promise<number> {
        const startTime = performance.now();
        for (let f = 0; f < count; f++) {
            if (!this._isRunning) break;
            await this._renderer.renderAsync(0);
            if (f % 10 === 0) await new Promise(r => setTimeout(r, 0));
        }
        return performance.now() - startTime;
    }

    private _copyResults(): void {
        const isBenchmark = this._isBenchmark();
        const lines: string[] = [];
        lines.push(`# Test Results — ${new Date().toISOString()}`);
        lines.push(`# ${this._renderer.renderMode} ${this._widthText.value}x${this._heightText.value}`);
        lines.push('');

        if (isBenchmark) {
            lines.push('Spec\tStatus\tSetup(s)\tFrames\tRender(s)\tFPS\tAvg(ms)');
            for (const r of this._results) {
                if (r.status === 'pass') {
                    lines.push(`${r.name}\t${r.status}\t${(r.setupMs / 1000).toFixed(1)}\t${r.frames}\t${(r.time / 1000).toFixed(1)}\t${r.fps.toFixed(1)}\t${r.avgFrameMs.toFixed(1)}`);
                } else {
                    lines.push(`${r.name}\t${r.status}\t\t\t\t\t${r.error || ''}`);
                }
            }
        } else {
            lines.push('Spec\tStatus\tSetup(s)\tFrames\tRender(s)\tFPS');
            for (const r of this._results) {
                if (r.status === 'pass') {
                    lines.push(`${r.name}\t${r.status}\t${(r.setupMs / 1000).toFixed(1)}\t${r.frames}\t${(r.time / 1000).toFixed(1)}\t${r.fps.toFixed(1)}`);
                } else {
                    lines.push(`${r.name}\t${r.status}\t\t\t\t${r.error || ''}`);
                }
            }
        }

        navigator.clipboard.writeText(lines.join('\n'))
            .then(() => { this._copyButton.value = 'Copied'; setTimeout(() => { this._copyButton.value = 'Copy'; }, 2000); })
            .catch(() => { this._copyButton.value = 'Failed'; setTimeout(() => { this._copyButton.value = 'Copy'; }, 2000); });
    }
}

new TestRunner();
