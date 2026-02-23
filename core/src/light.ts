// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ColorRGB } from "./color.js";
import { Constants } from "./constants.js";
import { TextureType } from "./hittable.js";
import { Matrix3x3, quaternion, Quaternion, vector3, Vector3, Vector4 } from "./matrix.js";

export const LightType = {
    directional: 0,
    disk: 1,
    hemisphere: 2,
    point: 3,
    projector: 4,
    rect: 5,
    sphere: 6,
    spot: 7,
} as const;
export type LightType = typeof LightType[keyof typeof LightType];

export interface ILightOptions {
    color?: Vector3; // RGB
}

export interface IRectLightOptions extends ILightOptions {
    center?: Vector3;
    size?: number;
    aspectRatio?: number; // Width / height
    direction?: Vector3; // Direction from position to target (normalized)
}

export interface IDiskLightOptions extends ILightOptions {
    center?: Vector3;
    size?: number;
    direction?: Vector3; // Direction from position to target (normalized)
}

export interface IPointLightOptions extends ILightOptions {
    center?: Vector3;
}

export interface ISphereLightOptions extends ILightOptions {
    center?: Vector3;
    size?: number;
}

export interface ISpotLightOptions extends ILightOptions {
    center?: Vector3;
    nearPlane?: number;
    direction?: Vector3; // Direction from position to target (normalized)
    angle?: number; // Cone angle in degrees
    falloff?: number; // Falloff exponent
}

export interface IDirectionalLightOptions extends ILightOptions {
    direction?: Vector3; // Direction from position to target (normalized) 
}

export interface IHemisphereLightOptions extends ILightOptions {
    direction?: Vector3; // Direction to zenith (normalized)
    groundColor?: ColorRGB; // Lerp between light (sky) color and ground color based on direction
}

// A rectangular projector light, emitting a texture
// The actual light is an imaginary point source (for sharp focus) behind the center of the rectangle to make the necessary field of view
// The rectangle of size and aspect ratio serves as hit target and light gathering area for ray tracing
// For a diffuse material, if a traced ray hits the rectangle:
//   1. Calculate the direction from the ray origin to the imaginary point light source
//   2. Ensure the direction is within the field of view. If not, the ray misses the light
//   3. Fire a ray from the ray origin to the imaginary point light source to see if it is shadowed
//   4. If not shadowed, use the intersection point on the rectangle between the ray origin and the imaginary point light source to get the texture coordinates and sample the texture
//   5. For non-diffuse materials, rejection sample based on the fuzz of the material from which the ray originated
//
//          --      . <-- imaginary point light source
// calculate |     / \
// from fov, |    /   \
// size      |   / fov \
//          --  /_______\  <-- rectangular plane, center, size, aspect ratio, direction
//             /  size   \     
//            /           \
//           /             \
//          /_______________\  <-- projected texture
//
export interface IProjectorLightOptions extends ILightOptions {
    center?: Vector3;
    nearPlane?: number; // Near plane distance from imaginary point light source to rectangular plane for intersection tests for uv mapping
    aspectRatio?: number; // Width / height
    direction?: Vector3; // Direction to zenith (normalized)
    textureType?: TextureType;
    texCoords?: Vector4; // x, y, x2, y2
    texScale?: Vector4;
    texOffset?: Vector4;
    angle?: number; // Vertical field of view, degrees
    color2?: ColorRGB; // Checker color2
}

export abstract class Light {
    protected _color: Vector3; // RGB
    public get color(): Vector3 { return this._color; }

    constructor(options: ILightOptions) {
        this._color = options.color || [1, 1, 1]; // Default to white
    }

    protected _directionToRotation(direction: Vector3, rotationQuaternion: Quaternion) {
        const forward = direction;
        const up: Vector3 = [0, 1, 0];
        const right: Vector3 = [0, 0, 0];
        vector3.cross(up, forward, right);
        vector3.normalize(right, right);
        vector3.cross(forward, right, up);
        vector3.normalize(up, up);
        const rotationMatrix3x3: Matrix3x3 = [
            right[0], up[0], forward[0],
            right[1], up[1], forward[1],
            right[2], up[2], forward[2],
        ];
        quaternion.fromMatrix3x3(rotationMatrix3x3, rotationQuaternion);
        quaternion.normalize(rotationQuaternion, rotationQuaternion);
    }

    public toBuffer(buffer: LightBufferData, index: number) {
        buffer.setColor(index, this._color);
    }
}

export class RectLight extends Light {
    protected _rotation: Quaternion; // Rotation
    public get rotation(): Quaternion { return this._rotation; }
    protected _center: Vector3; // Center position
    public get center(): Vector3 { return this._center; }
    protected _direction: Vector3; // Direction from position to target (normalized)
    public get direction(): Vector3 { return this._direction; }
    protected _width: number;
    public get width(): number { return this._width; }
    protected _height: number;
    public get height(): number { return this._height; }

    constructor(options: IRectLightOptions) {
        super(options);
        this._center = options.center || [0, 0, 0];
        this._direction = options.direction || [0, 0, -1];
        this._width = options.size || 1;
        this._height = this.width / (options.aspectRatio || 1);

        // Rect light is in the xy plane, with width along x and height along y
        this._rotation = [0, 0, 0, 0];
        this._directionToRotation(this._direction, this._rotation);
    }

    public override toBuffer(buffer: LightBufferData, index: number) {
        super.toBuffer(buffer, index);
        buffer.setType(index, LightType.rect);
        buffer.setCenter(index, this._center);
        buffer.setRotation(index, this._rotation);
        buffer.setDirection(index, this._direction);
        buffer.setSize(index, [this._width, this._height, 0]);
    }
}

export class DiskLight extends Light {
    protected _rotation: Quaternion; // Rotation
    public get rotation(): Quaternion { return this._rotation; }
    protected _center: Vector3; // Center position
    public get center(): Vector3 { return this._center; }
    protected _direction: Vector3; // Direction from position to target (normalized)
    public get direction(): Vector3 { return this._direction; }
    protected _radius: number;
    public get radius(): number { return this._radius; }

    constructor(options: IDiskLightOptions) {
        super(options);
        this._center = options.center || [0, 0, 0];
        this._direction = options.direction || [0, 0, -1];
        this._radius = options.size || 1;

        // Disk light is in the xy plane
        this._rotation = [0, 0, 0, 0];
        this._directionToRotation(this._direction, this._rotation);
    }

    public override toBuffer(buffer: LightBufferData, index: number) {
        super.toBuffer(buffer, index);
        buffer.setType(index, LightType.disk);
        buffer.setCenter(index, this._center);
        buffer.setDirection(index, this._direction);
        buffer.setRotation(index, this._rotation);
        buffer.setSize(index, [this._radius, this._radius, 0]);
    }
}

export class PointLight extends Light {
    protected _center: Vector3; // Center position
    public get center(): Vector3 { return this._center; }

    constructor(options: IPointLightOptions) {
        super(options);
        this._center = options.center || [0, 0, 0];
    }

    public override toBuffer(buffer: LightBufferData, index: number) {
        super.toBuffer(buffer, index);
        buffer.setType(index, LightType.point);
        buffer.setCenter(index, this._center);
    }
}

export class SphereLight extends Light {
    protected _center: Vector3; // Center position
    public get center(): Vector3 { return this._center; }
    protected _radius: number;
    public get radius(): number { return this._radius; }

    constructor(options: ISphereLightOptions) {
        super(options);
        this._center = options.center || [0, 0, 0];
        this._radius = options.size || 1;
    }

    public override toBuffer(buffer: LightBufferData, index: number) {
        super.toBuffer(buffer, index);
        buffer.setType(index, LightType.sphere);
        buffer.setCenter(index, this._center);
        buffer.setSize(index, [this._radius, this._radius, this._radius]);
    }
}

// A point light with a a direction, cone angle, and falloff
// The falloff increases with angle from the center direction, reaching zero at the cone angle
// The circular size servers as a hit target and light gathering area for ray tracing (similar to the projection light)
export class SpotLight extends Light {
    protected _rotation: Quaternion; // Rotation
    public get rotation(): Quaternion { return this._rotation; }
    protected _center: Vector3; // Center position
    public get center(): Vector3 { return this._center; }
    protected _direction: Vector3; // Direction from position to target (normalized)
    public get direction(): Vector3 { return this._direction; }
    protected _angle: number; // Cone angle in degrees
    public get angle(): number { return this._angle; }
    protected _falloff: number; // Falloff exponent
    public get falloff(): number { return this._falloff; }
    protected _nearPlane: number; // Near plane distance
    public get nearPlane(): number { return this._nearPlane; }

    constructor(options: ISpotLightOptions) {
        super(options);
        this._center = options.center || [0, 0, 0];
        this._direction = options.direction || [0, 0, -1];
        this._nearPlane = options.nearPlane || 0.1;
        this._angle = (options.angle || 30) * Constants.RADIANS_PER_DEGREE; // Convert to radians
        this._falloff = options.falloff == undefined ? 1 : options.falloff;

        // Disk light is in the xy plane
        this._rotation = [0, 0, 0, 0];
        this._directionToRotation(this._direction, this._rotation);
    }
    public override toBuffer(buffer: LightBufferData, index: number) {
        super.toBuffer(buffer, index);
        buffer.setType(index, LightType.spot);
        buffer.setCenter(index, this._center);
        buffer.setDirection(index, this._direction);
        buffer.setRotation(index, this._rotation);
        buffer.setNearPlane(index, this._nearPlane);
        buffer.setAngle(index, this._angle);
        buffer.setFalloff(index, this._falloff);
    }
}

export class DirectionalLight extends Light {
    protected _direction: Vector3; // Direction from position to target (normalized)
    public get direction(): Vector3 { return this._direction; }

    constructor(options: IDirectionalLightOptions) {
        super(options);
        this._direction = options.direction || [0, 0, -1];
    }

    public override toBuffer(buffer: LightBufferData, index: number) {
        super.toBuffer(buffer, index);
        buffer.setType(index, LightType.directional);
        buffer.setDirection(index, this._direction);
    }
}

export class HemisphereLight extends Light {
    protected _direction: Vector3; // Direction to zenith (normalized)
    public get direction(): Vector3 { return this._direction; }
    protected _groundColor: Vector3; // RGB
    public get groundColor(): Vector3 { return this._groundColor; }

    constructor(options: IHemisphereLightOptions) {
        super(options);
        this._direction = options.direction || [0, 1, 0];
        this._groundColor = options.groundColor || [0, 0, 0]; // Default to black
    }

    public override toBuffer(buffer: LightBufferData, index: number) {
        super.toBuffer(buffer, index);
        buffer.setType(index, LightType.hemisphere);
        buffer.setDirection(index, this._direction);
        buffer.setColor2(index, this._groundColor);
    }
}

export class ProjectorLight extends Light {
    protected _color2: Vector3; // RGB
    public get color2(): Vector3 { return this._color2; }
    protected _rotation: Quaternion; // Rotation
    public get rotation(): Quaternion { return this._rotation; }
    protected _center: Vector3; // Center position
    public get center(): Vector3 { return this._center; }
    protected _direction: Vector3; // Direction from position to target (normalized)
    public get direction(): Vector3 { return this._direction; }
    protected _fov: number; // Vertical field of view, radians
    public get fov(): number { return this._fov; }
    protected _nearPlane: number; // Near plane distance from imaginary point light source to rectangular plane for intersection tests for uv mapping
    public get nearPlane(): number { return this._nearPlane; }
    protected _textureType: TextureType;
    public get textureType(): TextureType { return this._textureType; }
    protected _texCoords: Vector4; // x, y, x2, y2
    public get texCoords(): Vector4 { return this._texCoords; }
    protected _texScale: Vector4;
    public get texScale(): Vector4 { return this._texScale; }
    protected _texOffset: Vector4;
    public get texOffset(): Vector4 { return this._texOffset; }
    protected _aspectRatio: number;
    public get aspectRatio(): number { return this._aspectRatio; }

    constructor(options: IProjectorLightOptions) {
        super(options);
        this._center = options.center || [0, 0, 0];
        this._direction = options.direction || [0, 0, -1];
        this._nearPlane = options.nearPlane || 0.1;
        this._fov = (options.angle || 30) * Constants.RADIANS_PER_DEGREE; // Convert to radians
        this._textureType = options.textureType || TextureType.solidColor;
        this._texCoords = options.texCoords || [0, 0, 1, 1];
        this._texScale = options.texScale || [1, 1, 1, 1];
        this._texOffset = options.texOffset || [0, 0, 0, 0];
        this._color2 = options.color2 || [0, 0, 0]; // Default to black

        // Store the aspect ratio in size.x
        this._aspectRatio = options.aspectRatio || 1;

        // Rect light is in the xy plane, with width along x and height along y
        this._rotation = [0, 0, 0, 0];
        this._directionToRotation(this._direction, this._rotation);
    }

    public override toBuffer(buffer: LightBufferData, index: number) {
        super.toBuffer(buffer, index);
        buffer.setType(index, LightType.projector);
        buffer.setCenter(index, this._center);
        buffer.setRotation(index, this._rotation);
        buffer.setDirection(index, this._direction);
        buffer.setNearPlane(index, this._nearPlane);
        buffer.setAngle(index, this._fov);
        buffer.setColor2(index, this._color2);
        buffer.setTextureType(index, this._textureType);
        buffer.setTexCoords(index, this._texCoords);
        buffer.setTexScale(index, this._texScale);
        buffer.setTexOffset(index, this._texOffset);

        // Store aspect ratio in size.x
        buffer.setSize(index, [this._aspectRatio, 0, 0]);
    }
}


// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// |    0     |    1     |    2     |    3     |    4     |    5     |    6     |    7     |    8     |    9     |   10     |   11     |   12     |   13     |   14     |   15     |
// |                  rotation                 |                  rotation                 |                  rotation                 |                  rotation                 |
// |                     x                     |                     y                     |                     z                     |                     w                     |
// |                    F32                    |                    F32                    |                    F32                    |                    F32                    |
// | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 |
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
//
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// |   16     |   17     |   18     |   19     |   20     |   21     |   22     |   23     |   24     |   25     |   26     |   27     |   28     |   29     |   30     |   31     |
// |                   center                  |                   center                  |                   center                  |                   type                    |
// |                     x                     |                     y                     |                     z                     |                                           |
// |                    F32                    |                    F32                    |                    F32                    |                    F32                    |
// | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 |
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
//
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// |   32     |   33     |   34     |   35     |   36     |   37     |    38    |    39    |   40     |   41     |   42     |   43     |   44     |   45     |   46     |   47     |
// |                    size                   |                    size                   |                    size                   |                   angle                   |
// |                     x                     |                     y                     |                     z                     |                                           |
// |                    F32                    |                    F32                    |                    F32                    |                    F32                    |
// | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 |
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
//
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// |   48     |   49     |   50     |   51     |   52     |   53     |   54     |   55     |   56     |   57     |   58     |   59     |   60     |   61     |   62     |   63     |
// |                   color                   |                   color                   |                   color                   |                  falloff                  |
// |                     r                     |                     g                     |                     b                     |                                           |
// |                    F32                    |                    F32                    |                    F32                    |                    F32                    |
// | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 |
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
//
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// |   64     |   65     |   66     |   67     |   68     |   69     |   70     |   71     |   72     |   73     |   74     |   75     |   76     |   77     |   78     |   79     |
// |                 direction                 |                 direction                 |                 direction                 |               texture type                |
// |                     x                     |                     y                     |                     z                     |                                           |
// |                    F32                    |                    F32                    |                    F32                    |                    F32                    |
// | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 |
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
//
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// |   80     |   81     |   82     |   83     |   84     |   85     |   86     |   87     |   88     |   89     |   90     |   91     |   92     |   93     |   94     |   95     |
// |                   color2                  |                   color2                  |                   color1                  |                 near plane                |
// |                     r                     |                     g                     |                     b                     |                                           |
// |                    F32                    |                    F32                    |                    F32                    |                    F32                    |
// | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 |
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
//
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// |   96     |   97     |   98     |   99     |   100    |   101    |   102    |   103    |   104    |   105    |   106    |   107    |   108    |   109    |   110    |   111    |
// |                 texCoords                 |                 texCoords                 |                 texCoords                 |                 texCoords                 |
// |                     x                     |                     y                     |                     z                     |                     w                     |
// |                    F32                    |                    F32                    |                    F32                    |                    F32                    |
// | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 |
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
//
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// |   112    |   113    |   114    |   115    |   116    |   117    |   118    |   119    |   120    |   121    |   122    |   123    |   124    |   125    |   126    |   127    |
// |                 texOffset                 |                 texOffset                 |                 texOffset                 |                 texOffset                 |
// |                     x                     |                     y                     |                     z                     |                     w                     |
// |                    F32                    |                    F32                    |                    F32                    |                    F32                    |
// | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 |
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
//
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// |   128    |   129    |   130    |   131    |   132    |   133    |   134    |   135    |   136    |   137    |   138    |   139    |   140    |   141    |   142    |   143    |
// |                 texScale                  |                 texScale                  |                 texScale                  |                 texScale                  |
// |                     x                     |                     y                     |                     z                     |                     w                     |
// |                    F32                    |                    F32                    |                    F32                    |                    F32                    |
// | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 |
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

export class LightBufferData extends Float32Array {
    public static readonly SIZE = 144 / 4;

    public readonly ROTATION_OFFSET = 0 / 4;
    public readonly CENTER_OFFSET = 16 / 4;
    public readonly TYPE_OFFSET = 28 / 4;
    public readonly SIZE_OFFSET = 32 / 4;
    public readonly ANGLE_OFFSET = 44 / 4;
    public readonly COLOR_OFFSET = 48 / 4;
    public readonly FALLOFF_OFFSET = 60 / 4;
    public readonly DIRECTION_OFFSET = 64 / 4;
    public readonly TEXTURE_TYPE_OFFSET = 76 / 4;
    public readonly COLOR2_OFFSET = 80 / 4;
    public readonly NEAR_PLANE_OFFSET = 92 / 4;
    public readonly TEXTURE_COORDS_OFFSET = 96 / 4;
    public readonly TEXTURE_OFFSET_OFFSET = 112 / 4;
    public readonly TEXTURE_SCALE_OFFSET = 128 / 4;

    constructor(count: number) {
        super(count * LightBufferData.SIZE);
    }

    public getType(index: number) {
        return this[LightBufferData.SIZE * index + this.TYPE_OFFSET];
    }
    public setType(index: number, value: LightType) {
        this[LightBufferData.SIZE * index + this.TYPE_OFFSET] = value;
    }

    public getAngle(index: number) {
        return this[LightBufferData.SIZE * index + this.ANGLE_OFFSET];
    }
    public setAngle(index: number, value: number) {
        this[LightBufferData.SIZE * index + this.ANGLE_OFFSET] = value;
    }

    public getFalloff(index: number) {
        return this[LightBufferData.SIZE * index + this.FALLOFF_OFFSET];
    }
    public setFalloff(index: number, value: number) {
        this[LightBufferData.SIZE * index + this.FALLOFF_OFFSET] = value;
    }

    public getCenter(index: number, value: Vector3) {
        const offset = LightBufferData.SIZE * index + this.CENTER_OFFSET;
        value[0] = this[offset];
        value[1] = this[offset + 1];
        value[2] = this[offset + 2];
    }
    public setCenter(index: number, value: Vector3) {
        const offset = LightBufferData.SIZE * index + this.CENTER_OFFSET;
        this[offset] = value[0];
        this[offset + 1] = value[1];
        this[offset + 2] = value[2];
    }

    public getDirection(index: number, value: Vector3) {
        const offset = LightBufferData.SIZE * index + this.DIRECTION_OFFSET;
        value[0] = this[offset];
        value[1] = this[offset + 1];
        value[2] = this[offset + 2];
    }
    public setDirection(index: number, value: Vector3) {
        const offset = LightBufferData.SIZE * index + this.DIRECTION_OFFSET;
        this[offset] = value[0];
        this[offset + 1] = value[1];
        this[offset + 2] = value[2];
    }

    public getSize(index: number, value: Vector3) {
        const offset = LightBufferData.SIZE * index + this.SIZE_OFFSET;
        value[0] = this[offset];
        value[1] = this[offset + 1];
        value[2] = this[offset + 2];
    }
    public setSize(index: number, value: Vector3) {
        const offset = LightBufferData.SIZE * index + this.SIZE_OFFSET;
        this[offset] = value[0];
        this[offset + 1] = value[1];
        this[offset + 2] = value[2];
    }

    public getRotation(index: number, value: Quaternion) {
        const offset = LightBufferData.SIZE * index + this.ROTATION_OFFSET;
        value[0] = this[offset];
        value[1] = this[offset + 1];
        value[2] = this[offset + 2];
        value[3] = this[offset + 3];
    }
    public setRotation(index: number, value: Quaternion) {
        const offset = LightBufferData.SIZE * index + this.ROTATION_OFFSET;
        this[offset] = value[0];
        this[offset + 1] = value[1];
        this[offset + 2] = value[2];
        this[offset + 3] = value[3];
    }

    public getColor(index: number, value: ColorRGB) {
        const offset = LightBufferData.SIZE * index + this.COLOR_OFFSET;
        value[0] = this[offset];
        value[1] = this[offset + 1];
        value[2] = this[offset + 2];
    }
    public setColor(index: number, value: ColorRGB) {
        const offset = LightBufferData.SIZE * index + this.COLOR_OFFSET;
        this[offset] = value[0];
        this[offset + 1] = value[1];
        this[offset + 2] = value[2];
    }

    public getColor2(index: number, value: ColorRGB) {
        const offset = LightBufferData.SIZE * index + this.COLOR2_OFFSET;
        value[0] = this[offset];
        value[1] = this[offset + 1];
        value[2] = this[offset + 2];
    }
    public setColor2(index: number, value: ColorRGB) {
        const offset = LightBufferData.SIZE * index + this.COLOR2_OFFSET;
        this[offset] = value[0];
        this[offset + 1] = value[1];
        this[offset + 2] = value[2];
    }

    public getNearPlane(index: number) {
        return this[LightBufferData.SIZE * index + this.NEAR_PLANE_OFFSET];
    }
    public setNearPlane(index: number, value: number) {
        this[LightBufferData.SIZE * index + this.NEAR_PLANE_OFFSET] = value;
    }

    public getTextureType(index: number) {
        return this[LightBufferData.SIZE * index + this.TEXTURE_TYPE_OFFSET];
    }
    public setTextureType(index: number, value: number) {
        this[LightBufferData.SIZE * index + this.TEXTURE_TYPE_OFFSET] = value;
    }

    public getTexCoords(index: number, value: Vector4) {
        const offset = LightBufferData.SIZE * index + this.TEXTURE_COORDS_OFFSET;
        value[0] = this[offset];
        value[1] = this[offset + 1];
        value[2] = this[offset + 2];
        value[3] = this[offset + 3];
    }
    public setTexCoords(index: number, value: Vector4) {
        const offset = LightBufferData.SIZE * index + this.TEXTURE_COORDS_OFFSET;
        this[offset] = value[0];
        this[offset + 1] = value[1];
        this[offset + 2] = value[2];
        this[offset + 3] = value[3];
    }
    public getTexOffset(index: number, value: Vector4) {
        const offset = LightBufferData.SIZE * index + this.TEXTURE_OFFSET_OFFSET;
        value[0] = this[offset];
        value[1] = this[offset + 1];
        value[2] = this[offset + 2];
        value[3] = this[offset + 3];
    }
    public setTexOffset(index: number, value: Vector4) {
        const offset = LightBufferData.SIZE * index + this.TEXTURE_OFFSET_OFFSET;
        this[offset] = value[0];
        this[offset + 1] = value[1];
        this[offset + 2] = value[2];
        this[offset + 3] = value[3];
    }
    public getTexScale(index: number, value: Vector4) {
        const offset = LightBufferData.SIZE * index + this.TEXTURE_SCALE_OFFSET;
        value[0] = this[offset];
        value[1] = this[offset + 1];
        value[2] = this[offset + 2];
        value[3] = this[offset + 3];
    }
    public setTexScale(index: number, value: Vector4) {
        const offset = LightBufferData.SIZE * index + this.TEXTURE_SCALE_OFFSET;
        this[offset] = value[0];
        this[offset + 1] = value[1];
        this[offset + 2] = value[2];
        this[offset + 3] = value[3];
    }

}