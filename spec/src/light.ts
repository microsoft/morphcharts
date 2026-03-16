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

        light.position = [0, 0, 0];
        // Position in camera/world coordinates
        const positionJSON = json.position ? json.position : json.worldPosition;
        if (positionJSON) {
            if (Array.isArray(positionJSON) && positionJSON.length == 3) {
                // x
                if (typeof positionJSON[0] == "number") { light.position[0] = positionJSON[0]; }
                else if (typeof positionJSON[0] == "object" && positionJSON[0].signal) { light.position[0] = group.parseSignalValue(positionJSON[0].signal); }
                else { throw new Error(`invalid light position ${positionJSON[0]}`); }
                // y
                if (typeof positionJSON[1] == "number") { light.position[1] = positionJSON[1]; }
                else if (typeof positionJSON[1] == "object" && positionJSON[1].signal) { light.position[1] = group.parseSignalValue(positionJSON[1].signal); }
                else { throw new Error(`invalid light position ${positionJSON[1]}`); }
                // z
                if (typeof positionJSON[2] == "number") { light.position[2] = positionJSON[2]; }
                else if (typeof positionJSON[2] == "object" && positionJSON[2].signal) { light.position[2] = group.parseSignalValue(positionJSON[2].signal); }
                else { throw new Error(`invalid light position ${positionJSON[2]}`); }
            }
            else if (typeof positionJSON == "object" && positionJSON.signal) {
                light.position = group.parseSignalValue(positionJSON.signal);
                if (!Array.isArray(light.position) || light.position.length != 3) { throw new Error(`invalid light position ${positionJSON}`); }
            }
            else { throw new Error(`invalid light position ${positionJSON}`); }

            // If position is specified in world coordinates, convert to camera coordinates
            if (json.worldPosition) {
                plot.worldToCameraPosition(light.position, light.position);
            }
        }

        // Spherical offset
        if ((json.distance || json.worldDistance) && (json.altitude != undefined || json.azimuth != undefined)) {
            // Distance in camera/world coordinates
            let distance: number;
            const distanceJSON = json.distance ? json.distance : json.worldDistance;
            if (typeof distanceJSON == "number") { distance = distanceJSON; }
            else if (typeof distanceJSON == "object" && distanceJSON.signal) { distance = group.parseSignalValue(distanceJSON.signal); }
            else { throw new Error(`invalid light distance ${distanceJSON}`); }

            // If distance is specified in world coordinates, convert to camera coordinates
            if (json.worldDistance) {
                distance = plot.worldToCameraSize(distance);
            }

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

            // Offset in camera coordinates
            const offset: Core.Vector3 = [
                distance * Math.cos(altitude) * Math.sin(azimuth),
                distance * Math.sin(altitude),
                distance * Math.cos(altitude) * Math.cos(azimuth)
            ];
            light.position[0] += offset[0];
            light.position[1] += offset[1];
            light.position[2] += offset[2];
        }

        // Size in camera/world coordinates
        const sizeJSON = json.size ? json.size : json.worldSize;
        if (sizeJSON != undefined) {
            if (typeof sizeJSON == "number") { light.size = sizeJSON; }
            else if (typeof sizeJSON == "object" && sizeJSON.signal) { light.size = group.parseSignalValue(sizeJSON.signal); }
            else { throw new Error(`invalid light size ${sizeJSON}`); }

            // If size is specified in world coordinates, convert to camera coordinates
            if (json.worldSize) {
                light.size = plot.worldToCameraSize(light.size);
            }
        }
        else { light.size = 1; }

        // Aspect ratio
        if (json.aspect) {
            if (typeof json.aspect == "number") { light.aspectRatio = json.aspect; }
            else if (typeof json.aspect == "object" && json.aspect.signal) { light.aspectRatio = group.parseSignalValue(json.aspect.signal); }
            else { throw new Error(`invalid light aspect ${json.aspect}`); }
        }
        else { light.aspectRatio = 1; }

        // Direction
        light.direction = [0, 0, 0];
        // Target in camera/world coordinates
        const targetJSON = json.target ? json.target : json.worldTarget;
        if (targetJSON) {
            let target: Core.Vector3 = [0, 0, 0];
            if (Array.isArray(targetJSON) && targetJSON.length == 3) {
                // x
                if (typeof targetJSON[0] == "number") { target[0] = targetJSON[0]; }
                else if (typeof targetJSON[0] == "object" && targetJSON[0].signal) { target[0] = group.parseSignalValue(targetJSON[0].signal); }
                else { throw new Error(`invalid light target ${targetJSON[0]}`); }
                // y
                if (typeof targetJSON[1] == "number") { target[1] = targetJSON[1]; }
                else if (typeof targetJSON[1] == "object" && targetJSON[1].signal) { target[1] = group.parseSignalValue(targetJSON[1].signal); }
                else { throw new Error(`invalid light target ${targetJSON[1]}`); }
                // z
                if (typeof targetJSON[2] == "number") { target[2] = targetJSON[2]; }
                else if (typeof targetJSON[2] == "object" && targetJSON[2].signal) { target[2] = group.parseSignalValue(targetJSON[2].signal); }
                else { throw new Error(`invalid light target ${targetJSON[2]}`); }
            }
            else if (typeof targetJSON == "object" && targetJSON.signal) {
                target = group.parseSignalValue(targetJSON.signal);
                if (!Array.isArray(target) || target.length != 3) { throw new Error(`invalid light target ${targetJSON}`); }
            }
            else { throw new Error(`invalid light target ${targetJSON}`); }

            // If target is specified in world coordinates, convert to camera coordinates
            if (json.worldTarget) {
                plot.worldToCameraPosition(target, target);
            }

            // Direction from position to target
            light.direction = [
                target[0] - light.position[0],
                target[1] - light.position[1],
                target[2] - light.position[2],
            ];

            // Normalize
            Core.vector3.normalize(light.direction, light.direction);
        }

        // Direction in camera/world coordinates
        const directionJSON = json.direction ? json.direction : json.worldDirection;
        if (directionJSON) {
            if (Array.isArray(directionJSON) && directionJSON.length == 3) {
                // x
                if (typeof directionJSON[0] == "number") { light.direction[0] = directionJSON[0]; }
                else if (typeof directionJSON[0] == "object" && directionJSON[0].signal) { light.direction[0] = group.parseSignalValue(directionJSON[0].signal); }
                else { throw new Error(`invalid light direction ${directionJSON[0]}`); }
                // y
                if (typeof directionJSON[1] == "number") { light.direction[1] = directionJSON[1]; }
                else if (typeof directionJSON[1] == "object" && directionJSON[1].signal) { light.direction[1] = group.parseSignalValue(directionJSON[1].signal); }
                else { throw new Error(`invalid light direction ${directionJSON[1]}`); }
                // z
                if (typeof directionJSON[2] == "number") { light.direction[2] = directionJSON[2]; }
                else if (typeof directionJSON[2] == "object" && directionJSON[2].signal) { light.direction[2] = group.parseSignalValue(directionJSON[2].signal); }
                else { throw new Error(`invalid light direction ${directionJSON[2]}`); }
            }
            else if (typeof directionJSON == "object" && directionJSON.signal) {
                light.direction = group.parseSignalValue(directionJSON.signal);
                if (!Array.isArray(light.direction) || light.direction.length != 3) { throw new Error(`invalid light direction ${directionJSON}`); }
            }
            else { throw new Error(`invalid light direction ${directionJSON}`); }

            // Normalize
            Core.vector3.normalize(light.direction, light.direction);
        }

        // Default to point at origin if position is specified but no direction/target
        if (light.direction[0] == 0 && light.direction[1] == 0 && light.direction[2] == 0) {
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