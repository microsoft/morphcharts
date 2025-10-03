// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import * as Core from "core";

export class Camera {
    /**
     * Camera position and target are defined in a coordinate system of a unit cube, centered at the origin and, scaled by 1/max(plot.width,plot.height,plot.depth).
     * For example, a plot of size (w=300,h=1,d=1) has a scaling of s=(1/max(w,h,d))=(1/max(300,1,1)=1/300.
     * To set the target to the center of a sphere of radius 25 centered at (x=150,y=25,z=0), use target (s*(x-w/2),s*(y-h/2),s*(z-d/2))=(0,24.5/300,0)=(0,0.0817,0).
     * World position and target are defined in the plot coordinate system, with the origin at the lower-left-front corner of the plot bounding box.
     * For example, to set the target to the center of a sphere of radius 25 centered at (x=150,y=25,z=0), use worldTarget (150,25,0).
     * For a camera target of [0,0,0], the worldTarget is [width/2,height/2,depth/2].
    **/
    public position: Core.Vector3;
    public target: Core.Vector3;
    public fov: number; // Field of view, radians
    public aperture: number; // Aperture for depth of field, m
    public focusDistance: number;
    public worldPosition: Core.Vector3; // Optional world position
    public worldTarget: Core.Vector3; // Optional world target
    public sphericalPosition: Core.Vector3; // Optional spherical position (r,theta,phi), degrees
    public sphericalTarget: Core.Vector3; // Optional spherical target (r,theta,phi), degrees

    public static fromJSON(json: any): Camera {
        const camera = new Camera();
        camera.position = json?.position;
        camera.target = json?.target;
        camera.fov = json?.fov * Core.Constants.RADIANS_PER_DEGREE;
        camera.aperture = json?.aperture * 0.001; // Convert mm to m
        camera.focusDistance = json?.focusDistance;
        camera.worldPosition = json?.worldPosition;
        camera.worldTarget = json?.worldTarget;
        camera.sphericalPosition = json?.sphericalPosition;
        camera.sphericalTarget = json?.sphericalTarget;
        return camera;
    }

    public static cameraToWorldSpace(position: Core.Vector3, width: number, height: number, depth: number): Core.Vector3 {
        const scaling = Math.max(width, height, depth);
        return [scaling * position[0] + width / 2, scaling * position[1] + height / 2, scaling * position[2] + depth / 2];
    }

    public static worldToCameraSpace(position: Core.Vector3, width: number, height: number, depth: number): Core.Vector3 {
        const scaling = 1 / Math.max(width, height, depth);
        return [scaling * (position[0] - width / 2), scaling * (position[1] - height / 2), scaling * (position[2] - depth / 2)];
    }

    public static sphericalToCartesian(spherical: Core.Vector3): Core.Vector3 {
        const r = spherical[0];
        const theta = spherical[1];
        const phi = spherical[2];
        const cartesian: Core.Vector3 = [0, 0, 0];
        Core.Angles.sphericalToCartesian(r, theta, phi, cartesian);
        return cartesian;
    }
}