// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import * as Core from "core";
import { Light } from "./light.js";
import { Group } from "./marks/group.js";
import { Camera } from "./camera.js";
import { Color } from "./color.js";
import { Identifier } from "./transforms/identifier.js";

export interface IScene {
    camera: Core.Cameras.PerspectiveCamera,
    ambient?: Core.ColorRGB, // Should this just be a light, e.g. so it could be directional
    background?: Core.ColorRGBA,
    lights?: Core.Light[],
    buffers?: Core.IBuffer[],
    fonts?: Core.IFontOptions[],
    labels?: Core.LabelSet[],
    images?: Core.Image[],
}

// An object representing a plot specification
export class Plot {
    public width: number;
    public height: number;
    public depth: number;
    public size: number; // Model size
    public camera: Camera;
    public ambient: Core.ColorRGB;
    public background: Core.ColorRGBA;
    public lights: Light[];
    public root: Group;

    constructor() {
        // Reset identifier
        Identifier.reset();
    }

    // Conversion functions between camera space and world space
    // Camera space is a unit cube centered at the origin, with dimensions scaled by 1/max(width,height,depth)
    // World space is the plot coordinate system, with the origin at the lower-left-back corner of the plot bounding box
    public cameraToWorldPosition(positionCameraSpace: Core.Vector3, positionWorldSpace: Core.Vector3): void {
        const scaling = Math.max(this.width, this.height, this.depth) / this.size;
        positionWorldSpace[0] = scaling * positionCameraSpace[0] + this.width / 2;
        positionWorldSpace[1] = scaling * positionCameraSpace[1] + this.height / 2;
        positionWorldSpace[2] = scaling * positionCameraSpace[2] + this.depth / 2;
    }
    public worldToCameraPosition(positionWorldSpace: Core.Vector3, positionCameraSpace: Core.Vector3): void {
        const scaling = this.size / Math.max(this.width, this.height, this.depth);
        positionCameraSpace[0] = scaling * (positionWorldSpace[0] - this.width / 2);
        positionCameraSpace[1] = scaling * (positionWorldSpace[1] - this.height / 2);
        positionCameraSpace[2] = scaling * (positionWorldSpace[2] - this.depth / 2);
    }

    public cameraToWorldSize(sizeCameraSpace: number, sizeWorldSpace: number): number {
        const scaling = Math.max(this.width, this.height, this.depth) / this.size;
        return scaling * sizeCameraSpace;
    }

    public worldToCameraSize(sizeWorldSpace: number): number {
        const scaling = this.size / Math.max(this.width, this.height, this.depth);
        return scaling * sizeWorldSpace;
    }

    // Create a specification from a JSON string
    public static async fromJSONAsync(plotJSON: any, datasets: { [key: string]: string }, images: { [key: string]: string }): Promise<Plot> {
        return new Promise<Plot>(async (resolve, reject) => {
            const start = performance.now();
            try {
                const plot = new Plot();

                // Create a top-level group mark
                plot.root = await Group.fromJSONAsync(plot, null, datasets, images, plotJSON);

                // Dimensions,
                plot.size = plotJSON.size || 1;

                // Camera
                if (plotJSON.camera) { plot.camera = Camera.fromJSON(plot, plotJSON.camera); }

                // Ambient
                if (plotJSON.ambient) { plot.ambient = Color.parse(plotJSON.ambient); }
                else { plot.ambient = Core.Colors.white; }

                // Background
                let background: Core.ColorRGB;
                let backgroundOpacity: number;
                if (plotJSON.background) { background = Color.parse(plotJSON.background); }
                else { background = Core.Colors.white; }
                if (backgroundOpacity != undefined) { backgroundOpacity = plotJSON.backgroundOpacity; }
                else { backgroundOpacity = 1; }
                plot.background = [background[0], background[1], background[2], backgroundOpacity];

                // Lighting
                if (plotJSON.lights) {
                    plot.lights = [];
                    for (let i = 0; i < plotJSON.lights.length; i++) {
                        const lightJSON = plotJSON.lights[i];
                        let light = Light.fromJSON(plot, lightJSON);
                        plot.lights.push(light);
                    }
                }
                
                console.log(`plot parsed ${Core.Time.formatDuration((performance.now() - start))}`);
                resolve(plot);
            }
            catch (error) {
                console.log("error parsing plot JSON", error);
                reject(error);
            }
        });
    }

    // Defaults
    // Fonts
    public static readonly FONT = "Segoe UI";
    public static readonly FONT_WEIGHT = 600;
    public static readonly FONT_STYLE = "normal";
    public static readonly FONT_SIZE = 12;

    // Default material
    public static readonly FILL_COLOR: Core.ColorRGB = Core.Colors.steelblue;
    public static readonly STROKE_COLOR: Core.ColorRGB = Core.Colors.black;
    public static readonly TEXT_COLOR: Core.ColorRGB = Core.Colors.black;
    public static readonly TEXT_STROKE_COLOR: Core.ColorRGB = Core.Colors.white;
    public static readonly MATERIAL_TYPE = "diffuse";
    public static readonly MATERIAL_FUZZ = 0;
    public static readonly MATERIAL_GLOSS = 1;
    public static readonly MATERIAL_REFRACTIVE_INDEX = 1.5;
    public static readonly MATERIAL_DENSITY = 0;

    public parse(): Promise<IScene> {
        return new Promise<IScene>(async (resolve, reject) => {
            try {
                // Convert to core camera
                const cameraOptions: Core.Cameras.IPerspectiveCameraOptions = {
                    position: this.camera?.position,
                    right: this.camera?.right,
                    up: this.camera?.up,
                    forward: this.camera?.forward,
                    fov: this.camera?.fov,
                    aperture: this.camera?.aperture,
                    focusDistance: this.camera?.focusDistance,
                    width: this.width,
                    height: this.height,
                };
                const camera = new Core.Cameras.PerspectiveCamera(cameraOptions);

                // Convert to core lights
                // TODO: Allow all light types to be defined as marks, so I can use them in indoor (fully enclosed) raytraced scenes (currently light are only hit if no scene hits)
                // TODO: Define a seperate light mark with a type property? Currently marks can only be area lights (of arbitrary geometry).
                let lights: Core.Light[];
                if (this.lights) {
                    lights = [];
                    for (let i = 0; i < this.lights.length; i++) {
                        // Ignore lights with zero intensity
                        if (this.lights[i].color[0] === 0 && this.lights[i].color[1] === 0 && this.lights[i].color[2] === 0) {
                            continue;
                        }

                        // Color
                        switch (this.lights[i].type) {
                            case "rect":
                                lights.push(new Core.RectLight({
                                    center: this.lights[i].position,
                                    color: this.lights[i].color,
                                    size: this.lights[i].size,
                                    aspectRatio: this.lights[i].aspectRatio,
                                    direction: this.lights[i].direction,
                                }));
                                break;
                            case "disk":
                                lights.push(new Core.DiskLight({
                                    center: this.lights[i].position,
                                    color: this.lights[i].color,
                                    size: this.lights[i].size,
                                    direction: this.lights[i].direction,
                                }));
                                break;
                            case "sphere":
                                lights.push(new Core.SphereLight({
                                    center: this.lights[i].position,
                                    color: this.lights[i].color,
                                    size: this.lights[i].size,
                                }));
                                break;
                            case "point":
                                lights.push(new Core.PointLight({
                                    center: this.lights[i].position,
                                    color: this.lights[i].color,
                                }));
                                break;
                            case "directional":
                                lights.push(new Core.DirectionalLight({
                                    color: this.lights[i].color,
                                    direction: this.lights[i].direction,
                                }));
                                break;
                            case "hemisphere":
                                lights.push(new Core.HemisphereLight({
                                    color: this.lights[i].color,
                                    direction: this.lights[i].direction,
                                    groundColor: this.lights[i].color2,
                                }));
                                break;
                            case "spot":
                                lights.push(new Core.SpotLight({
                                    center: this.lights[i].position,
                                    color: this.lights[i].color,
                                    nearPlane: this.lights[i].nearPlane,
                                    direction: this.lights[i].direction,
                                    angle: this.lights[i].angle,
                                    falloff: this.lights[i].falloff,
                                }));
                                break;
                            case "projector":
                                lights.push(new Core.ProjectorLight({
                                    center: this.lights[i].position,
                                    color: this.lights[i].color,
                                    color2: this.lights[i].color2,
                                    nearPlane: this.lights[i].nearPlane,
                                    aspectRatio: this.lights[i].aspectRatio,
                                    direction: this.lights[i].direction,
                                    angle: this.lights[i].angle,
                                    textureType: this.lights[i].textureType,
                                    texCoords: this.lights[i].texCoords,
                                    texScale: this.lights[i].texScale,
                                    texOffset: this.lights[i].texOffset,
                                }));
                                break;
                        }
                    }
                }

                // Scene
                const scene: IScene = {
                    camera: camera,
                    ambient: this.ambient,
                    background: this.background,
                    lights: lights,
                    buffers: [],
                    fonts: [],
                    labels: [],
                    images: [],
                };

                // Top-level (group) mark
                this.root.process(this, scene);
                resolve(scene);
            }
            catch (error) {
                console.log("error creating scene", error);
                reject(error);
            }
        });
    }
}