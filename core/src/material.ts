import { ColorRGB } from "./color.js";

export const MaterialType = {
    diffuse: 0,
    metal: 1,
    glass: 2,
    glossy: 3,
    light: 4,
    isotropic: 5,
} as const;
export type MaterialType = (typeof MaterialType)[keyof typeof MaterialType];

export interface IMaterialOptions {
    type?: MaterialType;
    fill?: ColorRGB;
    stroke?: ColorRGB;
    fuzz?: number;
    refractiveIndex?: number;
    gloss?: number;
    density?: number;
}

export class Material {
    public type: number;
    public fill: ColorRGB;
    public stroke: ColorRGB;
    public fuzz: number;
    /**
     * Refractive index of the material.
     * vacuum=1.0, ice=1.31, water=1.333, fused quartz=1.46, glass=1.5-1.6, sapphire=1.77, diamond=2.42
     */
    public refractiveIndex: number;
    public gloss: number;
    public density: number;
    
    constructor(options?: IMaterialOptions) {
        this.type = options?.type || MaterialType.diffuse;
        this.fill = options?.fill || [1, 1, 1];
        this.stroke = options?.stroke || [0, 0, 0];
        this.fuzz = options?.fuzz || 0;
        this.refractiveIndex = options?.refractiveIndex || 1.5;
        this.gloss = options?.gloss || 1;
        this.density = options?.density || 1;
    }
}