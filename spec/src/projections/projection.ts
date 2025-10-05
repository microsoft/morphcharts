// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import * as Core from "core";
import { Group } from "../marks/group.js";

export interface IMapProjection {
    project(longitude: number, latitude: number): Core.Vector2;
    unproject(x: number, y: number): Core.Vector2;
}

export abstract class Projection implements IMapProjection {
    protected _projectedCenter: Core.Vector2;
    private _name: string;
    public get name(): string {
        return this._name;
    }

    // The projection’s scale factor
    // The default scale is projection-specific
    public scale: number;

    // The translation offset determines the coordinates of the projection’s center
    // The default value is [0, 0]
    public translate: Core.Vector2;

    // The projection’s center, a two-element array of longitude and latitude in degrees
    // The default value is [0, 0]
    public center: Core.Vector2; // [longitude, latitude], degrees

    // For conic projections, the two standard parallels that define the map layout
    // The default depends on the specific conic projection used
    public parallels: Core.Vector2; // [latitude1, latitude2], degrees

    public abstract project(longitude: number, latitude: number): Core.Vector2;
    public abstract unproject(x: number, y: number): Core.Vector2

    public static fromJSON(group: Group, json: any): Projection {
        if (!json.name) {
            throw new Error("projection name is required");
        }
        let projection: Projection;
        switch (json.type) {
            case "albers":
                projection = Albers.fromJSON(group, json);
                break;
            case "cylindricalequalarea":
                projection = CylindricalEqualArea.fromJSON(group, json);
                break;
            case "equirectangular":
                projection = Equirectangular.fromJSON(group, json);
                break;
            case "mercator":
                projection = Mercator.fromJSON(group, json);
                break;
            case "orthographic":
                projection = Orthographic.fromJSON(group, json);
                break;
            default:
                console.log(`unknown projection type ${json.type}`);
                break;
        }
        return projection;
    }

    protected static _fromJSON(projection: Projection, json: any): Projection {
        projection._name = json.name;
        projection.scale = json.scale || 1;
        projection.translate = json.translate || [0, 0];
        projection.center = json.center || [0, 0];
        return projection;
    }
}

export class Equirectangular extends Projection {
    public static fromJSON(group: Group, json: any): Equirectangular {
        const projection = new Equirectangular();
        return Projection._fromJSON(projection, json);
    }

    public project(longitude: number, latitude: number): Core.Vector2 {
        // Subtract center, scale and traslate
        const x = this.translate[0] + this.scale * (longitude - this.center[0]);
        const y = this.translate[1] + this.scale * (latitude - this.center[1]);
        return [x, y];
    }

    public unproject(x: number, y: number): Core.Vector2 {
        const longitude = x / this.scale + this.center[0];
        const latitude = y / this.scale + this.center[1];
        return [longitude, latitude];
    }
}

export class Orthographic extends Projection {
    private _standardLatitude: number;
    private _centralMeridian: number;

    constructor() {
        super();

        // Defaults
        this._centralMeridian = this._centralMeridian || 0;
        this._standardLatitude = this._standardLatitude || 0;
    }

    public static fromJSON(group: Group, json: any): Orthographic {
        const projection = new Orthographic();
        Projection._fromJSON(projection, json);

        // Rotate
        if (json.rotate) {
            // [lambda, phi, gamma]
            if (json.rotate.length == 2) {
                projection._centralMeridian = json.rotate[0];
                projection._standardLatitude = json.rotate[1];
            }
        }
        return projection;
    }

    private _project(longitude: number, latitude: number): Core.Vector2 {
        // lambda (λ) is the longitude
        // lambda0 (λ0) is the central meridian
        // phi (φ) is the latitude
        // phi0 (φ0) is the standard latitude

        // Orthographic projection
        const lambda = Math.PI * longitude / 180;
        const phi = Math.PI * latitude / 180;
        const lambda0 = -Math.PI * this._centralMeridian / 180;
        const phi0 = -Math.PI * this._standardLatitude / 180;
        const x = Math.cos(phi) * Math.sin(lambda - lambda0);
        const y = Math.cos(phi0) * Math.sin(phi) - Math.sin(phi0) * Math.cos(phi) * Math.cos(lambda - lambda0);

        // Calculate angular distance from the center of the projection
        const cosine = Math.sin(phi0) * Math.sin(phi) + Math.cos(phi0) * Math.cos(phi) * Math.cos(lambda - lambda0);
        // If the angular distance is greater than 90 degrees, the point is clipped
        if (cosine < 0) {
            return null;
        }
        else {
            return [x, y];
        }
    }

    public project(longitude: number, latitude: number): Core.Vector2 {
        const xy = this._project(longitude, latitude);
        if (xy) {
            // Scale and traslate
            xy[0] = this.translate[0] + this.scale * xy[0];
            xy[1] = this.translate[1] + this.scale * xy[1];
        }
        return xy;
    }

    public unproject(x: number, y: number): Core.Vector2 {
        throw new Error("orthographic projection unproject not implemented");
    }
}

export class Mercator extends Projection {
    private readonly _minLatitude = -85.05112878;
    private readonly _maxLatitude = 85.05112878;
    private readonly _minY = -1;
    private readonly _maxY = 1;

    /**
     * Project from latitude and longitude
     * @param longitude Longitude, degrees [-180,180]
     * @param latitude Latitude, degrees [-90, 90]
     * @param xy Projected x [-1,1] (increasing left to right), projected y [-1,1] (increasing bottom to top)
     */
    private _project(longitude: number, latitude: number): Core.Vector2 {
        // TODO: Deal with crossing international dateline
        const x = longitude / 180;
        latitude = Math.max(Math.min(latitude, this._maxLatitude), this._minLatitude);
        latitude = Math.PI * latitude / 180;
        const sinLatitude = Math.sin(latitude);
        let y = Math.log((1 + sinLatitude) / (1 - sinLatitude)) / 2;
        y = Math.max(Math.min(y / Math.PI, this._maxY), this._minY);
        return [x, y];
    }

    /**
     * Unproject to latitude and longitude
     * @param x Projected x [-1,1] (increasing left to right)
     * @param y Projected y [-1,1] (increasing bottom to top)
     * @param lonLat Longitude, degrees [-180,180], latitude, degrees [-90, 90]
     */
    private _unproject(x: number, y: number): Core.Vector2 {
        const longitude = x * 180;
        y *= Math.PI;
        let latitude = Math.PI / 2 - 2 * Math.atan(Math.exp(-y));
        latitude = Math.PI * latitude / 180;
        return [longitude, latitude];
    }

    public static fromJSON(group: Group, json: any): Mercator {
        const projection = new Mercator();
        Projection._fromJSON(projection, json);

        // Project center
        projection._projectedCenter = projection._project(projection.center[0], projection.center[1]);
        return projection;
    }

    public project(longitude: number, latitude: number): Core.Vector2 {
        const xy = this._project(longitude, latitude);

        // Subtract center
        xy[0] -= this._projectedCenter[0];
        xy[1] -= this._projectedCenter[1];

        // Scale and traslate
        xy[0] = this.translate[0] + this.scale * xy[0];
        xy[1] = this.translate[1] + this.scale * xy[1];
        return xy;
    }

    public unproject(x: number, y: number): Core.Vector2 {
        // TODO: Center, scale, translate
        return this._unproject(x, y);
    }
}

export class CylindricalEqualArea extends Projection {
    private _standardLatitude: number;
    private _centralMeridian: number;
    private _stretchFactor: number;

    private _project(longitude: number, latitude: number): Core.Vector2 {
        // lambda (λ) is the longitude
        // lambda0 (λ0) is the central meridian
        // phi (φ) is the latitude
        // phi0 (φ0) is the standard latitude
        // S is the stretch factor
        // x is the horizontal coordinate of the projected location on the map
        // y is the vertical coordinate of the projected location on the map

        const lambda = Math.PI * longitude / 180;
        const phi = Math.PI * latitude / 180;
        const lambda0 = Math.PI * this._centralMeridian / 180;
        const phi0 = Math.PI * this._standardLatitude / 180;
        const x = (lambda - lambda0) * Math.cos(phi0);
        const y = Math.sin(phi) / Math.cos(phi0);
        return [x, y];
    }

    constructor() {
        super();

        // Defaults
        this._centralMeridian = this._centralMeridian || 0;
        this._standardLatitude = this._standardLatitude || 0;
        this._stretchFactor = this._stretchFactor || 1;
    }

    public static fromJSON(group: Group, json: any): CylindricalEqualArea {
        const projection = new CylindricalEqualArea();
        Projection._fromJSON(projection, json);

        if (json.rotate) {
            // [lambda, phi, gamma]
            if (json.rotate.length == 1) {
                projection._centralMeridian = json.rotate[0];
                if (json.parallels.length > 1) {
                    projection._standardLatitude = json.rotate[1];
                }
            }
        }

        // Project center
        projection._projectedCenter = projection._project(projection.center[0], projection.center[1]);
        return projection;
    }

    public project(longitude: number, latitude: number): Core.Vector2 {
        const xy = this._project(longitude, latitude);
        if (xy) {
            // Subtract center
            xy[0] -= this._projectedCenter[0];
            xy[1] -= this._projectedCenter[1];

            // Scale and traslate
            xy[0] = this.translate[0] + this.scale * xy[0];
            xy[1] = this.translate[1] + this.scale * xy[1];
        }
        return xy;
    }

    public unproject(x: number, y: number): Core.Vector2 {
        throw new Error("cylindrical equal area projection unproject not implemented");
    }
}

export class Albers extends Projection {
    private _standardParallel1: number;
    private _standardParallel2: number;
    private _latitudeOfOrigin: number;
    private _centralMeridian: number;

    /**
     * Project from latitude and longitude
     * @param longitude Longitude, degrees [-180,180]
     * @param latitude Latitude, degrees [-90, 90]
     * @param xy Projected x [-1,1] (increasing left to right), projected y [-1,1] (increasing bottom to top)
     */
    private _project(longitude: number, latitude: number): Core.Vector2 {
        const phi1 = Math.PI * this._standardParallel1 / 180;
        const phi2 = Math.PI * this._standardParallel2 / 180;
        const lat0 = Math.PI * this._latitudeOfOrigin / 180;
        const lon0 = Math.PI * this._centralMeridian / 180;
        latitude = Math.PI * latitude / 180;
        longitude = Math.PI * longitude / 180;
        const n = 0.5 * (Math.sin(phi1) + Math.sin(phi2));
        const c = Math.cos(phi1);
        const C = c * c + 2 * n * Math.sin(phi1);
        const p0 = Math.sqrt(C - 2 * n * Math.sin(lat0)) / n;
        const theta = n * (longitude - lon0);
        const p = Math.sqrt(C - 2 * n * Math.sin(latitude)) / n;
        const x = p * Math.sin(theta);
        const y = p0 - p * Math.cos(theta);
        return [x, y];
    }

    /**
     * Unproject to latitude and longitude
     * @param x Projected x [-1,1] (increasing left to right)
     * @param y Projected y [-1,1] (increasing bottom to top)
     * @param lonLat Longitude, degrees [-180,180], latitude, degrees [-90, 90]
     */
    private _unproject(x: number, y: number): Core.Vector2 {
        const phi1 = Math.PI * this._standardParallel1 / 180;
        const phi2 = Math.PI * this._standardParallel2 / 180;
        const lat0 = Math.PI * this._latitudeOfOrigin / 180;
        const lon0 = Math.PI * this._centralMeridian / 180;
        const n = 0.5 * (Math.sin(phi1) + Math.sin(phi2));
        const c = Math.cos(phi1);
        const C = c * c + 2 * n * Math.sin(phi1);
        const p0 = Math.sqrt(C - 2 * n * Math.sin(lat0)) / n;
        let theta = Math.atan(x / Math.abs((p0 - y)) * Math.sign(p0 - y));
        if ((p0 - y) * n < 0) { theta -= Math.PI * Math.sign(x) * Math.sign(p0 - y); }
        const p = Math.sqrt(x * x + Math.pow(p0 - y, 2));
        let longitude = lon0 + theta / n;
        let latitude = Math.asin((C - p * p * n * n) / (2 * n));
        longitude = 180 * longitude / Math.PI;
        latitude = 180 * latitude / Math.PI;
        return [longitude, latitude];
    }

    constructor() {
        super();

        // Defaults
        this._standardParallel1 = 29.5;
        this._standardParallel2 = 45.5;
        this._centralMeridian = -96;
        this._latitudeOfOrigin = 37.5;
    }

    public static fromJSON(group: Group, json: any): Albers {
        const projection = new Albers();
        Projection._fromJSON(projection, json);
        if (json.parallels) {
            if (json.parallels.length > 0) {
                projection._standardParallel1 = json.parallels[0];
                if (json.parallels.length > 1) {
                    projection._standardParallel2 = json.parallels[1];
                }
            }
        }
        return projection;
    }


    public project(longitude: number, latitude: number): Core.Vector2 {
        const xy = this._project(longitude, latitude);
        if (xy) {
            // Scale
            xy[0] *= this.scale;
            xy[1] *= this.scale;
        }
        return xy;
    }

    public unproject(x: number, y: number): Core.Vector2 {
        // TODO: Scale
        return this._unproject(x, y);
    }
}