import * as Core from "core";
import { Light } from "./light.js";
import { Group } from "./marks/group.js";
import { Camera } from "./camera.js";
import { Color } from "./color.js";
import { Identifier } from "./transforms/identifier.js";

export interface IScene {
    camera: Core.Cameras.PerspectiveCamera,
    ambient?: Core.ColorRGB,
    background?: Core.ColorRGBA,
    directionToLight?: Core.Vector3, // Direction to light source (for shading)
    diffuse?: Core.ColorRGB, // Diffuse color for shading
    specular?: number, // Specular intensity for shading
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
    public directionToLight: Core.Vector3;
    public diffuse: Core.ColorRGB;
    public specular: number; // Specular intensity for shading
    public lights: Light[];
    public root: Group;

    constructor() {
        // Reset identifier
        Identifier.reset();
    }

    // Create a specification from a JSON string
    public static async fromJSONAsync(plotJSON: any, datasets?: { [key: string]: string }): Promise<Plot> {
        return new Promise<Plot>(async (resolve, reject) => {
            const start = performance.now();
            try {
                const plot = new Plot();

                // Camera
                if (plotJSON.camera) { plot.camera = Camera.fromJSON(plotJSON.camera); }

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
                // Global illumination
                if (plotJSON.lights) {
                    plot.lights = [];
                    for (let i = 0; i < plotJSON.lights.length; i++) {
                        const lightJSON = plotJSON.lights[i];
                        let light = Light.fromJSON(lightJSON);
                        plot.lights.push(light);
                    }
                }
                // Shading
                if (plotJSON.directionToLight) { plot.directionToLight = plotJSON.directionToLight; }
                else { plot.directionToLight = Core.vector3.clone(Core.Config.directionToLight); }
                if (plotJSON.diffuse) { plot.diffuse = Color.parse(plotJSON.diffuse); }
                else { plot.diffuse = Core.Colors.white; }
                if (plotJSON.specular != undefined) { plot.specular = plotJSON.specular; }
                else { plot.specular = 0.1; }

                // Create a top-level group mark
                plot.root = await Group.fromJSONAsync(plot, null, datasets, plotJSON);

                // Dimensions
                plot.size = plotJSON.size || 1;

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
                    target: this.camera?.target,
                    fov: this.camera?.fov,
                    aperture: this.camera?.aperture,
                    width: this.width,
                    height: this.height,
                };
                const camera = new Core.Cameras.PerspectiveCamera(cameraOptions);

                // Scene
                const scene: IScene = {
                    camera: camera,
                    ambient: this.ambient,
                    background: this.background,
                    directionToLight: this.directionToLight,
                    diffuse: this.diffuse,
                    specular: this.specular,
                    buffers: [],
                    fonts: [],
                    labels: [],
                    images: [],
                };

                // Top-level (group) mark
                this.root.process(this, scene);

                // Override camera position, target if world coordinates are specified
                if (this.camera?.worldPosition) { scene.camera.position = Camera.worldToCameraSpace(this.camera.worldPosition, this.width, this.height, this.depth); }
                if (this.camera?.worldTarget) { scene.camera.target = Camera.worldToCameraSpace(this.camera.worldTarget, this.width, this.height, this.depth); }

                // Override camera position, target, if sphereical coordinates are specified
                if (this.camera?.sphericalPosition) { scene.camera.position = Camera.sphericalToCartesian(this.camera.sphericalPosition); }
                if (this.camera?.sphericalTarget) { scene.camera.target = Camera.sphericalToCartesian(this.camera.sphericalTarget); }

                resolve(scene);
            }
            catch (error) {
                console.log("error creating scene", error);
                reject(error);
            }
        });
    }
}