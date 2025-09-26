import * as Core from "core";

export class Light {
    public position: Core.Vector3;
    public color: Core.ColorRGB;
    public brightness: number;
    public type: string;
    public distance: number;
    public altitude: number;
    public azimuth: number;

    // Rectangular light
    public width: number;
    public height: number;

    // Sphere light
    public radius: number;

    public static fromJSON(json: any): Light {
        const light = new Light();
        light.type = json.type;
        light.color = json.color || [1, 1, 1];
        light.brightness = json.brightness || 1;
        switch (json.type) {
            case "rect":
                light.width = json.width || 1;
                light.height = json.height || 1;
                light.distance = json.distance || 1;
                light.azimuth = json.azimuth * Math.PI / 180 || 0;
                light.altitude = json.altitude * Math.PI / 180 || 0;
                break;
            case "sphere":
                light.position = [json.position[0], json.position[1], json.position[2]];
                light.radius = json.radius || 1;
                break;
        }
        return light;
    }
}