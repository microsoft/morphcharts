// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import * as Core from "core";
import { Plot } from "./plot.js";

export class Camera {
    /**
     * Camera position and target are defined in a coordinate system of a unit cube, centered at the origin and, scaled by 1/max(plot.width,plot.height,plot.depth)
     * For example, a plot of size (w=300,h=1,d=1) has a scaling of s=(1/max(w,h,d))=(1/max(300,1,1)=1/300
     * To set the target to the center of a sphere of radius 25 centered at (x=150,y=25,z=0), use target (s*(x-w/2),s*(y-h/2),s*(z-d/2))=(0,24.5/300,0)=(0,0.0817,0)
     * World position and target are defined in the plot coordinate system, with the origin at the lower-left-front corner of the plot bounding box
     * For example, to set the target to the center of a sphere of radius 25 centered at (x=150,y=25,z=0), use worldTarget (150,25,0)
     * For a camera target of [0,0,0], the worldTarget is [width/2,height/2,depth/2].
    **/
    public position: Core.Vector3;
    public fov: number; // Field of view, radians
    public aperture: number; // Aperture for depth of field, m
    public focusDistance: number;
    public target: Core.Vector3;

    private _right: Core.Vector3;
    public get right(): Core.Vector3 {
        return this._right;
    }
    private _up: Core.Vector3;
    public get up(): Core.Vector3 {
        return this._up;
    }
    // Unit vector pointing the opposite direction to the view direction (right-hand coordinates)
    private _forward: Core.Vector3;
    public get forward(): Core.Vector3 {
        return this._forward;
    }

    // TODO: Default position, target, fov, aperture, focusDistance
    constructor() { }

    public static fromJSON(plot: Plot, json: any): Camera {
        // TODO: Parse signals with plot.root.parseSignalValue(json)

        const camera = new Camera();
        camera.position = json?.position || Core.vector3.clone(Core.Config.cameraPosition);
        camera.fov = json?.fov * Core.Constants.RADIANS_PER_DEGREE || Core.Config.cameraFov;
        camera.aperture = json?.aperture * 0.001 || Core.Config.cameraAperture; // Convert mm to m
        camera.focusDistance = json?.focusDistance || Core.Config.cameraFocusDistance;

        // Position in world coordinates
        if (json.worldPosition) {
            const worldPosition = json.worldPosition;

            // Convert to camera coordinates
            plot.worldToCameraPosition(worldPosition, camera.position);
        }

        // Spherical offset
        if (json.distance && (json.altitude || json.azimuth)) {
            const distance = json.distance;
            const altitude = json.altitude ? json.altitude * Core.Constants.RADIANS_PER_DEGREE : 0;
            const azimuth = json.azimuth ? json.azimuth * Core.Constants.RADIANS_PER_DEGREE : 0;
            const offset: Core.Vector3 = [
                distance * Math.cos(altitude) * Math.sin(azimuth),
                distance * Math.sin(altitude),
                distance * Math.cos(altitude) * Math.cos(azimuth)
            ];
            camera.position[0] += offset[0];
            camera.position[1] += offset[1];
            camera.position[2] += offset[2];
        }

        // Target in world coordinates
        let target = json?.target || Core.vector3.clone(Core.Config.cameraManipulationOrigin);
        if (json.worldTarget) {
            const worldTarget = json.worldTarget;

            // Convert to camera coordinates
            plot.worldToCameraPosition(worldTarget, target);
        }

        // Direction
        if (json.direction) {
            const direction = json.direction;
            target[0] = camera.position[0] + direction[0];
            target[1] = camera.position[1] + direction[1];
            target[2] = camera.position[2] + direction[2];
        }

        // Basis vectors
        // Forward (unit vector pointing the opposite direction to the view direction, right-hand coordinates)
        camera._forward = [
            camera.position[0] - target[0],
            camera.position[1] - target[1],
            camera.position[2] - target[2]
        ];
        Core.vector3.normalize(camera._forward, camera._forward);
        camera._right = [0, 0, 0];
        Core.vector3.cross(Core.Constants.VECTOR3_UNITY, camera._forward, camera._right);
        Core.vector3.normalize(camera._right, camera._right);
        camera._up = [0, 0, 0];
        Core.vector3.cross(camera._forward, camera._right, camera._up);
        Core.vector3.normalize(camera._up, camera._up);
        return camera;
    }
}