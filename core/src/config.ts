import { ColorRGB, ColorRGBA } from "./color.js";
import { Constants } from "./constants.js";
import { Vector3 } from "./matrix.js";

export class Config {
    // Model
    public static readonly modelDistance: number = 1.0; // m
    public static readonly modelSize: number = 1.0; // m

    // Renderer
    public static readonly width: number = 1280; // px
    public static readonly height: number = 720; // px

    // Camera
    public static readonly cameraFov: number = 30 * Constants.RADIANS_PER_DEGREE; // Field of view, radians
    public static readonly cameraNearPlane: number = 0.01;
    public static readonly cameraFarPlane: number = 100;
    public static readonly cameraPosition: Vector3 = [0, 0, 0.5 / Math.tan(this.cameraFov / 2)]; // 0.5/tan(fov/2), 1.866 for fov=30deg
    public static readonly cameraTarget: Vector3 = [0, 0, 0];
    public static readonly cameraUp: Vector3 = [0, 1, 0];
    public static readonly cameraAperture: number = 0;
    public static readonly cameraFocusDistance: number = 0;

    // Lighting
    public static readonly backgroundColor: ColorRGBA = [0, 0, 0, 1];
    public static readonly ambientColor: ColorRGB = [1, 1, 1];
    public static readonly directionToLight: Vector3 = [-0.4083, -0.4083, 0.8165]; // Normalized
    public static readonly diffuseColor: ColorRGB = [1, 1, 1];
    public static readonly specularIntensity: number = 0.1;

    // Render mode
    public static readonly renderMode: string = "color";

    // Edge
    public static readonly edgeForeground: ColorRGBA = [0, 0, 0, 1];
    public static readonly edgeBackground: ColorRGBA = [1, 1, 1, 1];

    // Antialiasing
    public static readonly multisample: number = 1; // Multisampling level

    // Stereo mode
    public static readonly stereoMode: string = "stereo";

    // SDF
    public static readonly sdfBuffer: number = 0xc0;
    public static readonly sdfHalo: number = 0x0;

    // Font atlas
    public static readonly fontAtlasWidth: number = 1024; // Font atlas width, px
    public static readonly fontAtlasHeight: number = 1024; // Font atlas height, px

    // Glyph rasterizer
    public static readonly glyphRasterizerSize: number = 96; // Font size, px
    public static readonly glyphRasterizerBorder: number = 12; // Border size, px
    public static readonly glyphRasterizerMaxDistance: number = 12; // Maximum distance, [0,255]

    // Font
    public static readonly font: string = "Segoe UI"; // Font family
    public static readonly fontStyle: string = "normal"; // Font style, "normal", "italic", "oblique"
    public static readonly fontWeight: number = 600; // Font weight, 100-900
}