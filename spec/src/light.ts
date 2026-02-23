// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import * as Core from "core";
import { Color } from "./color.js";
import { Plot } from "./plot.js";

export class Light {
    public name: string;

    public type: string;
    public position: Core.Vector3;

    // Colors
    public color: Core.ColorRGB;
    public color2: Core.ColorRGB;

    // Specify either target or direction
    public direction: Core.Vector3; // Direction from position to target (normalized)

    // Size
    public size: number;
    public aspectRatio: number;

    // Spot light
    public angle: number;
    public falloff: number;

    // Projector light
    public nearPlane: number; // Near plane distance from position along direction
    public textureType: Core.TextureType;
    public texCoords: Core.Vector4; // [x (left), y (bottom), x2 (right), y2 (top)]
    public texOffset: Core.Vector4;
    public texScale: Core.Vector4;

    public static fromJSON(plot: Plot, json: any): Light {
        const light = new Light();
        light.type = json.type;
        light.name = json.name;

        // Group for signal parsing
        const group = plot.root;

        // Color
        light.color = json.color ? Color.parse(json.color) : [1, 1, 1];
        if (json.brightness != undefined) {
            light.color[0] *= json.brightness;
            light.color[1] *= json.brightness;
            light.color[2] *= json.brightness;
        }

        // Position
        light.position = [0, 0, 0];
        if (json.position) {
            if (Array.isArray(json.position) && json.position.length == 3) {
                // x
                if (typeof json.position[0] == "number") { light.position[0] = json.position[0]; }
                else if (typeof json.position[0] == "object" && json.position[0].signal) { light.position[0] = group.parseSignalValue(json.position[0].signal); }
                else { throw new Error(`invalid light position ${json.position[0]}`); }
                // y
                if (typeof json.position[1] == "number") { light.position[1] = json.position[1]; }
                else if (typeof json.position[1] == "object" && json.position[1].signal) { light.position[1] = group.parseSignalValue(json.position[1].signal); }
                else { throw new Error(`invalid light position ${json.position[1]}`); }
                // z
                if (typeof json.position[2] == "number") { light.position[2] = json.position[2]; }
                else if (typeof json.position[2] == "object" && json.position[2].signal) { light.position[2] = group.parseSignalValue(json.position[2].signal); }
                else { throw new Error(`invalid light position ${json.position[2]}`); }
            }
            else if (typeof json.position == "object" && json.position.signal) {
                light.position = group.parseSignalValue(json.position.signal);
                if (!Array.isArray(light.position) || light.position.length != 3) { throw new Error(`invalid light position ${json.position}`); }
            }
            else { throw new Error(`invalid light position ${json.position}`); }
        }

        if (json.worldPosition) {
            if (Array.isArray(json.worldPosition) && json.worldPosition.length == 3) {
                // x
                if (typeof json.worldPosition[0] == "number") { light.position[0] = json.worldPosition[0]; }
                else if (typeof json.worldPosition[0] == "object" && json.worldPosition[0].signal) { light.position[0] = group.parseSignalValue(json.worldPosition[0].signal); }
                else { throw new Error(`invalid light position ${json.worldPosition[0]}`); }
                // y
                if (typeof json.worldPosition[1] == "number") { light.position[1] = json.worldPosition[1]; }
                else if (typeof json.worldPosition[1] == "object" && json.worldPosition[1].signal) { light.position[1] = group.parseSignalValue(json.worldPosition[1].signal); }
                else { throw new Error(`invalid light position ${json.worldPosition[1]}`); }
                // z
                if (typeof json.worldPosition[2] == "number") { light.position[2] = json.worldPosition[2]; }
                else if (typeof json.worldPosition[2] == "object" && json.worldPosition[2].signal) { light.position[2] = group.parseSignalValue(json.worldPosition[2].signal); }
                else { throw new Error(`invalid light position ${json.worldPosition[2]}`); }
            }
            else if (typeof json.worldPosition == "object" && json.worldPosition.signal) {
                light.position = group.parseSignalValue(json.worldPosition.signal);
                if (!Array.isArray(light.position) || light.position.length != 3) { throw new Error(`invalid light position ${json.worldPosition}`); }
            }
            else { throw new Error(`invalid light world position ${json.worldPosition}`); }

            // Convert to camera coordinates
            plot.worldToCameraPosition(light.position, light.position);
        }

        // If distance, altitude, azimuth specified, compute position
        if (json.distance && (json.altitude || json.azimuth)) {
            // Distance
            let distance: number;
            if (typeof json.distance == "number") { distance = json.distance; }
            else if (typeof json.distance == "object" && json.distance.signal) { distance = group.parseSignalValue(json.distance.signal); }
            else { throw new Error(`invalid light distance ${json.distance}`); }

            // Altitude
            let altitude: number;
            if (json.altitude) {
                if (typeof json.altitude == "number") { altitude = json.altitude * Core.Constants.RADIANS_PER_DEGREE; }
                else if (typeof json.altitude == "object" && json.altitude.signal) { altitude = group.parseSignalValue(json.altitude.signal) * Core.Constants.RADIANS_PER_DEGREE; }
                else { throw new Error(`invalid light altitude ${json.altitude}`); }
            }
            else { altitude = 0; }

            // Azimuth
            let azimuth: number;
            if (json.azimuth) {
                if (typeof json.azimuth == "number") { azimuth = json.azimuth * Core.Constants.RADIANS_PER_DEGREE; }
                else if (typeof json.azimuth == "object" && json.azimuth.signal) { azimuth = group.parseSignalValue(json.azimuth.signal) * Core.Constants.RADIANS_PER_DEGREE; }
                else { throw new Error(`invalid light azimuth ${json.azimuth}`); }
            }
            else { azimuth = 0; }

            const offset: Core.Vector3 = [
                distance * Math.cos(altitude) * Math.sin(azimuth),
                distance * Math.sin(altitude),
                distance * Math.cos(altitude) * Math.cos(azimuth)
            ];
            light.position[0] += offset[0];
            light.position[1] += offset[1];
            light.position[2] += offset[2];
        }

        // Size, aspect
        if (json.size != undefined) {
            if (typeof json.size == "number") { light.size = json.size; }
            else if (typeof json.size == "object" && json.size.signal) { light.size = group.parseSignalValue(json.size.signal); }
            else { throw new Error(`invalid light size ${json.size}`); }
        }
        else if (json.worldSize != undefined) {
            if (typeof json.worldSize == "number") { light.size = json.worldSize; }
            else if (typeof json.worldSize == "object" && json.worldSize.signal) { light.size = group.parseSignalValue(json.worldSize.signal); }
            else { throw new Error(`invalid light world size ${json.worldSize}`); }
            // Scale to camera coordinates
            light.size = plot.worldToCameraSize(light.size);
        }
        else { light.size = 1; }
        if (json.aspect != undefined) {
            if (typeof json.aspect == "number") { light.aspectRatio = json.aspect; }
            else if (typeof json.aspect == "object" && json.aspect.signal) { light.aspectRatio = group.parseSignalValue(json.aspect.signal); }
            else { throw new Error(`invalid light aspect ${json.aspect}`); }
        }
        else { light.aspectRatio = 1; }

        // Direction
        light.direction = [0, 0, 0];
        if (json.target) {
            let target: Core.Vector3 = [0, 0, 0];
            if (Array.isArray(json.target) && json.target.length == 3) {
                // x
                if (typeof json.target[0] == "number") { target[0] = json.target[0]; }
                else if (typeof json.target[0] == "object" && json.target[0].signal) { target[0] = group.parseSignalValue(json.target[0].signal); }
                else { throw new Error(`invalid light target ${json.target[0]}`); }
                // y
                if (typeof json.target[1] == "number") { target[1] = json.target[1]; }
                else if (typeof json.target[1] == "object" && json.target[1].signal) { target[1] = group.parseSignalValue(json.target[1].signal); }
                else { throw new Error(`invalid light target ${json.target[1]}`); }
                // z
                if (typeof json.target[2] == "number") { target[2] = json.target[2]; }
                else if (typeof json.target[2] == "object" && json.target[2].signal) { target[2] = group.parseSignalValue(json.target[2].signal); }
                else { throw new Error(`invalid light target ${json.target[2]}`); }
            }
            else if (typeof json.target == "object" && json.target.signal) {
                target = group.parseSignalValue(json.target.signal);
                if (!Array.isArray(target) || target.length != 3) { throw new Error(`invalid light target ${json.target}`); }
            }
            else { throw new Error(`invalid light target ${json.target}`); }
            light.direction = [
                target[0] - light.position[0],
                target[1] - light.position[1],
                target[2] - light.position[2],
            ];

            // Normalize
            Core.vector3.normalize(light.direction, light.direction);
        }
        else if (json.worldTarget) {
            let worldTarget: Core.Vector3 = [0, 0, 0];
            if (Array.isArray(json.worldTarget) && json.worldTarget.length == 3) {
                // x
                if (typeof json.worldTarget[0] == "number") { worldTarget[0] = json.worldTarget[0]; }
                else if (typeof json.worldTarget[0] == "object" && json.worldTarget[0].signal) { worldTarget[0] = group.parseSignalValue(json.worldTarget[0].signal); }
                else { throw new Error(`invalid light world target ${json.worldTarget[0]}`); }
                // y
                if (typeof json.worldTarget[1] == "number") { worldTarget[1] = json.worldTarget[1]; }
                else if (typeof json.worldTarget[1] == "object" && json.worldTarget[1].signal) { worldTarget[1] = group.parseSignalValue(json.worldTarget[1].signal); }
                else { throw new Error(`invalid light world target ${json.worldTarget[1]}`); }
                // z
                if (typeof json.worldTarget[2] == "number") { worldTarget[2] = json.worldTarget[2]; }
                else if (typeof json.worldTarget[2] == "object" && json.worldTarget[2].signal) { worldTarget[2] = group.parseSignalValue(json.worldTarget[2].signal); }
                else { throw new Error(`invalid light world target ${json.worldTarget[2]}`); }
            }
            else if (typeof json.target == "object" && json.worldTarget.signal) {
                worldTarget = group.parseSignalValue(json.worldTarget.signal);
                if (!Array.isArray(worldTarget) || worldTarget.length != 3) { throw new Error(`invalid light world target ${json.target}`); }
            }
            else { throw new Error(`invalid light target ${json.target}`); }

            // Convert to camera coordinates
            plot.worldToCameraPosition(worldTarget, worldTarget);
            light.direction = [
                worldTarget[0] - light.position[0],
                worldTarget[1] - light.position[1],
                worldTarget[2] - light.position[2],
            ];

            // Normalize
            Core.vector3.normalize(light.direction, light.direction);
        }
        else if (json.direction) {
            if (Array.isArray(json.direction) && json.direction.length == 3) {
                // x
                if (typeof json.direction[0] == "number") { light.direction[0] = json.direction[0]; }
                else if (typeof json.direction[0] == "object" && json.direction[0].signal) { light.direction[0] = group.parseSignalValue(json.direction[0].signal); }
                else { throw new Error(`invalid light direction ${json.direction[0]}`); }
                // y
                if (typeof json.direction[1] == "number") { light.direction[1] = json.direction[1]; }
                else if (typeof json.direction[1] == "object" && json.direction[1].signal) { light.direction[1] = group.parseSignalValue(json.direction[1].signal); }
                else { throw new Error(`invalid light direction ${json.direction[1]}`); }
                // z
                if (typeof json.direction[2] == "number") { light.direction[2] = json.direction[2]; }
                else if (typeof json.direction[2] == "object" && json.direction[2].signal) { light.direction[2] = group.parseSignalValue(json.direction[2].signal); }
                else { throw new Error(`invalid light direction ${json.direction[2]}`); }
            }
            else if (typeof json.direction == "object" && json.direction.signal) {
                light.direction = group.parseSignalValue(json.direction.signal);
                if (!Array.isArray(light.direction) || light.direction.length != 3) { throw new Error(`invalid light direction ${json.direction}`); }
            }
            else { throw new Error(`invalid light direction ${json.direction}`); }

            // Normalize
            Core.vector3.normalize(light.direction, light.direction);
        }
        else {
            // Point at origin
            if (light.position[0] == 0 && light.position[1] == 0 && light.position[2] == 0) {
                light.direction = [0, 0, -1];
            }
            else {
                light.direction[0] = -light.position[0];
                light.direction[1] = -light.position[1];
                light.direction[2] = -light.position[2];
                Core.vector3.normalize(light.direction, light.direction);
            }
        }

        // Hemisphere light
        if (json.groundColor) { light.color2 = Color.parse(json.groundColor); }

        // Spot light
        if (json.type === "spot") {
            if (json.falloff != undefined) { light.falloff = json.falloff; }
            if (json.angle != undefined) { light.angle = json.angle; }
        }

        // Projector light
        if (json.type === "projector") {
            if (json.angle != undefined) { light.angle = json.angle; }
            else { light.angle = 30; }
            if (json.nearPlane != undefined) { light.nearPlane = json.nearPlane; }
            else { light.nearPlane = 0.1; }

            // Texture
            if (json.texture) {
                const texture = json.texture;

                // Image
                if (texture.image) {
                    // For now, only support a single image texture, so ignore per-light specification
                    light.textureType = Core.TextureType.image;
                }

                // Checker
                if (texture.checker) {
                    light.textureType = Core.TextureType.checkerboard;
                    if (texture.checker.color1) { light.color = Color.parse(texture.checker.color1); }
                    else { light.color = [Core.Colors.black[0], Core.Colors.black[1], Core.Colors.black[2]]; }
                    if (texture.checker.color2) { light.color2 = Color.parse(texture.checker.color2); }
                    else { light.color2 = [Core.Colors.white[0], Core.Colors.white[1], Core.Colors.white[2]]; }
                    if (json.brightness != undefined) {
                        light.color[0] *= json.brightness;
                        light.color[1] *= json.brightness;
                        light.color[2] *= json.brightness;
                        light.color2[0] *= json.brightness;
                        light.color2[1] *= json.brightness;
                        light.color2[2] *= json.brightness;
                    }
                }

                // Tex Coords, scale, offset
                if (texture.texCoords) {
                    light.texCoords = [0, 0, 1, 1];
                    if (texture.texCoords.x) {
                        if (typeof texture.texCoords.x === "number") {
                            light.texCoords[0] = texture.texCoords.x;
                        }
                        else if (typeof texture.texCoords.x === "object" && texture.texCoords.x.signal) {
                            light.texCoords[0] = group.parseSignalValue(texture.texCoords.x.signal);
                        }
                        else { throw new Error(`invalid light texture texCoords.x ${texture.texCoords.x}`); }
                    }
                    if (texture.texCoords.y) {
                        if (typeof texture.texCoords.y === "number") {
                            light.texCoords[1] = texture.texCoords.y;
                        }
                        else if (typeof texture.texCoords.y === "object" && texture.texCoords.y.signal) {
                            light.texCoords[1] = group.parseSignalValue(texture.texCoords.y.signal);
                        }
                        else { throw new Error(`invalid light texture texCoords.y ${texture.texCoords.y}`); }
                    }
                    if (texture.texCoords.x2) {
                        if (typeof texture.texCoords.x2 === "number") {
                            light.texCoords[2] = texture.texCoords.x2;
                        }
                        else if (typeof texture.texCoords.x2 === "object" && texture.texCoords.x2.signal) {
                            light.texCoords[2] = group.parseSignalValue(texture.texCoords.x2.signal);
                        }
                        else { throw new Error(`invalid light texture texCoords.x2 ${texture.texCoords.x2}`); }
                    }
                    if (texture.texCoords.y2) {
                        if (typeof texture.texCoords.y2 === "number") {
                            light.texCoords[3] = texture.texCoords.y2;
                        }
                        else if (typeof texture.texCoords.y2 === "object" && texture.texCoords.y2.signal) {
                            light.texCoords[3] = group.parseSignalValue(texture.texCoords.y2.signal);
                        }
                        else { throw new Error(`invalid light texture texCoords.y2 ${texture.texCoords.y2}`); }
                    }
                }
                if (texture.texScale) {
                    light.texScale = [1, 1, 1, 1];
                    if (texture.texScale.x) {
                        if (typeof texture.texScale.x === "number") {
                            light.texScale[0] = texture.texScale.x;
                        }
                        else if (typeof texture.texScale.x === "object" && texture.texScale.x.signal) {
                            light.texScale[0] = group.parseSignalValue(texture.texScale.x.signal);
                        }
                        else { throw new Error(`invalid light texture texScale.x ${texture.texScale.x}`); }
                    }
                    if (texture.texScale.y) {
                        if (typeof texture.texScale.y === "number") {
                            light.texScale[1] = texture.texScale.y;
                        }
                        else if (typeof texture.texScale.y === "object" && texture.texScale.y.signal) {
                            light.texScale[1] = group.parseSignalValue(texture.texScale.y.signal);
                        }
                        else { throw new Error(`invalid light texture texScale.y ${texture.texScale.y}`); }
                    }
                    if (texture.texScale.z) {
                        if (typeof texture.texScale.z === "number") {
                            light.texScale[2] = texture.texScale.z;
                        }
                        else if (typeof texture.texScale.z === "object" && texture.texScale.z.signal) {
                            light.texScale[2] = group.parseSignalValue(texture.texScale.z.signal);
                        }
                        else { throw new Error(`invalid light texture texScale.z ${texture.texScale.z}`); }
                    }
                    if (texture.texScale.w) {
                        if (typeof texture.texScale.w === "number") {
                            light.texScale[3] = texture.texScale.w;
                        }
                        else if (typeof texture.texScale.w === "object" && texture.texScale.w.signal) {
                            light.texScale[3] = group.parseSignalValue(texture.texScale.w.signal);
                        }
                        else { throw new Error(`invalid light texture texScale.w ${texture.texScale.w}`); }
                    }
                }
                if (texture.texOffset) {
                    light.texOffset = [0, 0, 0, 0];
                    if (texture.texOffset.x) {
                        if (typeof texture.texOffset.x === "number") {
                            light.texOffset[0] = texture.texOffset.x;
                        }
                        else if (typeof texture.texOffset.x === "object" && texture.texOffset.x.signal) {
                            light.texOffset[0] = group.parseSignalValue(texture.texOffset.x.signal);
                        }
                        else { throw new Error(`invalid light texture texOffset.x ${texture.texOffset.x}`); }
                    }
                    if (texture.texOffset.y) {
                        if (typeof texture.texOffset.y === "number") {
                            light.texOffset[1] = texture.texOffset.y;
                        }
                        else if (typeof texture.texOffset.y === "object" && texture.texOffset.y.signal) {
                            light.texOffset[1] = group.parseSignalValue(texture.texOffset.y.signal);
                        }
                        else { throw new Error(`invalid light texture texOffset.y ${texture.texOffset.y}`); }
                    }
                    if (texture.texOffset.z) {
                        if (typeof texture.texOffset.z === "number") {
                            light.texOffset[2] = texture.texOffset.z;
                        }
                        else if (typeof texture.texOffset.z === "object" && texture.texOffset.z.signal) {
                            light.texOffset[2] = group.parseSignalValue(texture.texOffset.z.signal);
                        }
                        else { throw new Error(`invalid light texture texOffset.z ${texture.texOffset.z}`); }
                    }
                    if (texture.texOffset.w) {
                        if (typeof texture.texOffset.w === "number") {
                            light.texOffset[3] = texture.texOffset.w;
                        }
                        else if (typeof texture.texOffset.w === "object" && texture.texOffset.w.signal) {
                            light.texOffset[3] = group.parseSignalValue(texture.texOffset.w.signal);
                        }
                        else { throw new Error(`invalid light texture texOffset.w ${texture.texOffset.w}`); }
                    }
                }
            }
            else { light.textureType = Core.TextureType.solidColor; }
        }
        return light;
    }
}