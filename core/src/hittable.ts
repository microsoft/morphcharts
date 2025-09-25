import { Quaternion, Vector2, vector3, Vector3, Vector4 } from "./matrix.js";
import { ColorRGB, ColorRGBA } from "./color.js";
import { Material } from "./material.js";
import { AABB } from "./aabb.js";
import { Bounds } from "./bounds.js";
import { Constants } from "./constants.js";
import { Config } from "./config.js";

export const HittableType = {
    sphere: 0, // Default
    box: 1,
    boxRotated: 2,
    boxFrameSdf: 3,
    boxSdf: 4,
    boxRotatedSdf: 5,
    cappedTorusSdf: 6,
    cappedTorusRotatedSdf: 7,
    cylinder: 8,
    cylinderSdf: 9,
    cylinderRotatedSdf: 10,
    hexPrism: 11,
    hexPrismSdf: 12,
    quadSdf: 13,
    ringSdf: 14,
    ringRotatedSdf: 15,
    tubeSdf: 16,
    tubeRotatedSdf: 17,
    xyRect: 18,
    xzRect: 19,
    yzRect: 20,
    xyGlyph: 21,
    xyRotatedGlyph: 22,
} as const;
export type HittableType = (typeof HittableType)[keyof typeof HittableType];

export const TextureType = {
    solidColor: 0, // Default
    checkerboard: 1, // 3D checkerboard
    image: 2,
    sdf: 3,
    uv: 4, // 2D texture coordinate
    uvw: 5, // 3D texture coordinate
} as const;
export type TextureType = (typeof TextureType)[keyof typeof TextureType];

export interface IHittableOptions {
    center: Vector3;
    segmentColor?: ColorRGBA;
    material?: Material;
    textureType?: TextureType;
    texCoords?: Vector4; // x, y, x2, y2
    texScale?: Vector4;
    texOffset?: Vector4;
}

export abstract class Hittable {
    protected _center: Vector3;
    public get center() { return this._center; }
    protected _bounds: AABB;
    public get bounds() { return this._bounds; }

    public segmentColor: ColorRGBA;
    public material: Material;
    public textureType: number;
    public texCoords: Vector4;
    public texScale: Vector4;
    public texOffset: Vector4;

    constructor(options: IHittableOptions) {
        this._center = options.center;
        this._bounds = new AABB();

        // Optional properties
        this.segmentColor = options.segmentColor || [Config.backgroundColor[0], Config.backgroundColor[1], Config.backgroundColor[2], Config.backgroundColor[3]]; // Copy
        this.material = options.material || new Material();
        this.texCoords = options.texCoords || [0, 0, 1, 1];
        this.texScale = options.texScale || [1, 1, 1, 1];
        this.texOffset = options.texOffset || [0, 0, 0, 0];
        this.textureType = options.textureType || TextureType.solidColor;
    }

    public toBuffer(buffer: HittableBufferData, index: number) {
        buffer.setCenter(index, this._center);
        buffer.setMaterial(index, this.material);
        buffer.setSegmentColor(index, this.segmentColor);
        buffer.setTextureType(index, this.textureType);
        buffer.setTexCoords(index, this.texCoords);
        buffer.setTexScale(index, this.texScale);
        buffer.setTexOffset(index, this.texOffset);
    }
}

export interface IHittableSphereOptions extends IHittableOptions {
    radius: number;
}

export class HittableSphere extends Hittable {
    protected _radius: number;
    public get radius() { return this._radius; }

    constructor(options: IHittableSphereOptions) {
        super(options);
        this._radius = options.radius;

        // Bounds
        const radius = this._radius;
        this._bounds.min[0] = this._center[0] - radius;
        this._bounds.min[1] = this._center[1] - radius;
        this._bounds.min[2] = this._center[2] - radius;
        this._bounds.max[0] = this._center[0] + radius;
        this._bounds.max[1] = this._center[1] + radius;
        this._bounds.max[2] = this._center[2] + radius;
    }

    public toBuffer(buffer: HittableBufferData, index: number) {
        super.toBuffer(buffer, index);
        buffer.setUnitType(index, HittableType.sphere);
        buffer.setSize(index, [this._radius * 2, this._radius * 2, this._radius * 2]);
    }
}

export interface IHittableBoxOptions extends IHittableOptions {
    size: Vector3;
    rotation?: Quaternion;
}

export class HittableBox extends Hittable {
    protected _size: Vector3;
    protected _rotation: Quaternion;

    constructor(options: IHittableBoxOptions) {
        super(options);
        this._size = options.size;
        this._rotation = options.rotation || Constants.QUATERNION_IDENTITY;

        // Bounds
        this._bounds.min[0] = this._center[0] - this._size[0] * 0.5;
        this._bounds.min[1] = this._center[1] - this._size[1] * 0.5;
        this._bounds.min[2] = this._center[2] - this._size[2] * 0.5;
        this._bounds.max[0] = this._center[0] + this._size[0] * 0.5;
        this._bounds.max[1] = this._center[1] + this._size[1] * 0.5;
        this._bounds.max[2] = this._center[2] + this._size[2] * 0.5;
        if (this._rotation[3] != 1) {
            // Rotated bounds
            const rotatedBounds = new AABB();
            Bounds.rotate(this._bounds.min, this._bounds.max, this._rotation, rotatedBounds.min, rotatedBounds.max, [0, 0, 0]);
            this._bounds = rotatedBounds;
        }
    }

    public toBuffer(buffer: HittableBufferData, index: number) {
        super.toBuffer(buffer, index);
        buffer.setSize(index, this._size);
        buffer.setRotation(index, this._rotation);
        buffer.setUnitType(index, this._rotation[3] != 1 ? HittableType.boxRotated : HittableType.box);
    }
}

export interface IHittableCylinderOptions extends IHittableOptions {
    radius: number;
    height: number;
    rotation?: Quaternion; // Optional rotation, defaults to no rotation
}

export class HittableCylinder extends Hittable {
    protected _radius: number;
    protected _height: number;
    protected _rotation: Quaternion;

    constructor(options: IHittableCylinderOptions) {
        super(options);
        this._radius = options.radius;
        this._height = options.height;

        // Optional properties
        this._rotation = options.rotation || Constants.QUATERNION_IDENTITY;

        // Bounds
        if (this._rotation[3] == 1) {
            this._bounds.min[0] = this._center[0] - this._radius;
            this._bounds.min[1] = this._center[1] - this._height * 0.5;
            this._bounds.min[2] = this._center[2] - this._radius;
            this._bounds.max[0] = this._center[0] + this._radius;
            this._bounds.max[1] = this._center[1] + this._height * 0.5;
            this._bounds.max[2] = this._center[2] + this._radius;
        }
        else {
            // Tight bounds
            const ca: Vector3 = [0, 1, 0];
            if (options.rotation[3] != 1) { vector3.transformQuaternion(ca, options.rotation, ca); }
            const pa: Vector3 = [
                options.center[0] - ca[0] * this._height * 0.5,
                options.center[1] - ca[1] * this._height * 0.5,
                options.center[2] - ca[2] * this._height * 0.5
            ];
            const pb: Vector3 = [
                options.center[0] + ca[0] * this._height * 0.5,
                options.center[1] + ca[1] * this._height * 0.5,
                options.center[2] + ca[2] * this._height * 0.5
            ];
            this._bounds = new AABB();
            this._bounds.fromCylinder(pa, pb, this._radius);
        }
    }

    public toBuffer(buffer: HittableBufferData, index: number) {
        super.toBuffer(buffer, index);
        buffer.setUnitType(index, HittableType.cylinder);
        buffer.setSize(index, [this._radius * 2, this._height, this._radius * 2]);
        buffer.setRotation(index, this._rotation);
    }
}

export interface IHittableHexPrismOptions extends IHittableOptions {
    radius: number;
    height: number;
}

// Pointy-top on z, height on y
export class HittableHexPrism extends Hittable {
    protected _radius: number; // Distance from center to corner
    public get radius() { return this._radius; }
    protected _height: number; // Distance from center to top/bottom
    public get height() { return this._height; }

    constructor(options: IHittableHexPrismOptions) {
        super(options);
        this._radius = options.radius;
        this._height = options.height;

        // Bounds
        const min = this._bounds.min;
        const max = this._bounds.max;
        min[0] = this._center[0] - this._radius * Constants.ROOT_THREE_OVER_TWO;
        max[0] = this._center[0] + this._radius * Constants.ROOT_THREE_OVER_TWO;
        min[1] = this._center[1] - this._height * 0.5;
        max[1] = this._center[1] + this._height * 0.5;
        min[2] = this._center[2] - this._radius;
        max[2] = this._center[2] + this._radius;
    }

    public toBuffer(buffer: HittableBufferData, index: number) {
        super.toBuffer(buffer, index);
        buffer.setUnitType(index, HittableType.hexPrism);
        buffer.setSize(index, [this._radius * Constants.ROOT_THREE_OVER_TWO * 2, this._height, this._radius * 2]);
    }
}

export interface IHittableRectOptions extends IHittableOptions {
    size: Vector2;
}

export class HittableXyRect extends Hittable {
    protected _size: Vector2;

    constructor(options: IHittableRectOptions) {
        super(options);
        this._size = options.size;

        // Bounds
        const min = this._bounds.min;
        const max = this._bounds.max;
        min[0] = this._center[0] - this._size[0] * 0.5;
        max[0] = this._center[0] + this._size[0] * 0.5;
        min[1] = this._center[1] - this._size[1] * 0.5;
        max[1] = this._center[1] + this._size[1] * 0.5;
        min[2] = this._center[2] - Constants.EPSILON;
        max[2] = this._center[2] + Constants.EPSILON;
    }

    public toBuffer(buffer: HittableBufferData, index: number) {
        super.toBuffer(buffer, index);
        buffer.setUnitType(index, HittableType.xyRect);
        buffer.setSize(index, [this._size[0], this._size[1], Constants.EPSILON]);
    }
}

export class HittableXzRect extends Hittable {
    protected _size: Vector2;

    constructor(options: IHittableRectOptions) {
        super(options);
        this._size = options.size;

        // Bounds
        const min = this._bounds.min;
        const max = this._bounds.max;
        min[0] = this._center[0] - this._size[0] * 0.5;
        max[0] = this._center[0] + this._size[0] * 0.5;
        min[1] = this._center[1] - Constants.EPSILON;
        max[1] = this._center[1] + Constants.EPSILON;
        min[2] = this._center[2] - this._size[1] * 0.5;
        max[2] = this._center[2] + this._size[1] * 0.5;
    }

    public toBuffer(buffer: HittableBufferData, index: number) {
        super.toBuffer(buffer, index);
        buffer.setUnitType(index, HittableType.xzRect);
        buffer.setSize(index, [this._size[0], Constants.EPSILON, this._size[1]]);
    }
}

export class HittableYzRect extends Hittable {
    protected _size: Vector2;

    constructor(options: IHittableRectOptions) {
        super(options);
        this._size = options.size;

        // Bounds
        const min = this._bounds.min;
        const max = this._bounds.max;
        min[0] = this._center[0] - Constants.EPSILON;
        max[0] = this._center[0] + Constants.EPSILON;
        min[1] = this._center[1] - this._size[0] * 0.5;
        max[1] = this._center[1] + this._size[0] * 0.5;
        min[2] = this._center[2] - this._size[1] * 0.5;
        max[2] = this._center[2] + this._size[1] * 0.5;
    }

    public toBuffer(buffer: HittableBufferData, index: number) {
        super.toBuffer(buffer, index);
        buffer.setUnitType(index, HittableType.yzRect);
        buffer.setSize(index, [Constants.EPSILON, this._size[0], this._size[1]]);
    }
}

export interface IHittableGlyphOptions extends IHittableRectOptions {
    sdfBuffer: number;
    sdfHalo: number;
    texCoords: Vector4; // u0, v0, u1, v1
    rotation?: Quaternion;
}

export class HittableXyGlyph extends Hittable {
    protected _size: Vector2;
    protected _sdfBuffer: number;
    protected _sdfHalo: number;
    protected _rotation: Quaternion;

    constructor(options: IHittableGlyphOptions) {
        super(options);
        this._sdfBuffer = options.sdfBuffer;
        this._sdfHalo = options.sdfHalo;
        this._size = options.size;
        this._rotation = options.rotation || Constants.QUATERNION_IDENTITY;

        // Bounds
        const min = this._bounds.min;
        const max = this._bounds.max;
        min[0] = this._center[0] - this._size[0] * 0.5;
        max[0] = this._center[0] + this._size[0] * 0.5;
        min[1] = this._center[1] - this._size[1] * 0.5;
        max[1] = this._center[1] + this._size[1] * 0.5;
        min[2] = this._center[2] - Constants.EPSILON;
        max[2] = this._center[2] + Constants.EPSILON;
        if (this._rotation[3] != 1) {
            // Rotated bounds
            const rotatedBounds = new AABB();
            Bounds.rotate(min, max, this._rotation, rotatedBounds.min, rotatedBounds.max, [0, 0, 0]);
            this._bounds = rotatedBounds;
        }
    }

    public toBuffer(buffer: HittableBufferData, index: number) {
        super.toBuffer(buffer, index);
        buffer.setSdfBuffer(index, this._sdfBuffer);
        buffer.setSdfHalo(index, this._sdfHalo);
        buffer.setSize(index, [this._size[0], this._size[1], Constants.EPSILON]);
        buffer.setRotation(index, this._rotation);
        buffer.setUnitType(index, this._rotation[3] == 1 ? HittableType.xyGlyph : HittableType.xyRotatedGlyph);
    }
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// |    0     |    1     |    2     |    3     |    4     |    5     |    6     |    7     |    8     |    9     |   10     |   11     |   12     |   13     |   14     |   15     |
// |                   center                  |                   center                  |                   center                  |                 unit type                 |
// |                     x                     |                     y                     |                     z                     |                                           |
// |                    F32                    |                    F32                    |                    F32                    |                    F32                    |
// | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 |
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
//
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// |   16     |   17     |   18     |   19     |   20     |   21     |   22     |   23     |   24     |   25     |   26     |   27     |   28     |   29     |   30     |   31     |
// |                    size                   |                    size                   |                    size                   |                 rounding                  |
// |                     x                     |                     y                     |                     z                     |                                           |
// |                    F32                    |                    F32                    |                    F32                    |                    F32                    |
// | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 |
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
//
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// |   32     |   33     |   34     |   35     |   36     |   37     |    38    |    39    |   40     |   41     |   42     |   43     |   44     |   45     |   46     |   47     |
// |                  rotation                 |                  rotation                 |                  rotation                 |                  rotation                 |
// |                     x                     |                     y                     |                     z                     |                     w                     |
// |                    F32                    |                    F32                    |                    F32                    |                    F32                    |
// | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 |
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
//
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// |   48     |   49     |   50     |   51     |   52     |   53     |   54     |   55     |   56     |   57     |   58     |   59     |   60     |   61     |   62     |   63     |
// |               material type               |               material fuzz               |              material gloss               |             material density              |
// |                                           |                                           |                                           |                                           |
// |                    F32                    |                    F32                    |                    F32                    |                    F32                    |
// | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 |
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
//
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// |   64     |   65     |   66     |   67     |   68     |   69     |   70     |   71     |   72     |   73     |   74     |   75     |   76     |   77     |   78     |   79     |
// |              material color1              |              material color1              |              material color1              |         material refractive index         |
// |                     r                     |                     g                     |                     b                     |                     w                     |
// |                    F32                    |                    F32                    |                    F32                    |                    F32                    |
// | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 |
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
//
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// |   80     |   81     |   82     |   83     |   84     |   85     |   86     |   87     |   88     |   89     |   90     |   91     |   92     |   93     |   94     |   95     |
// |               segment color               |               segment color               |               segment color               |               segment color               |
// |                     r                     |                     g                     |                     b                     |                     a                     |
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
//
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// |   144    |   145    |   146    |   147    |   148    |   149    |   150    |   151    |   152    |   153    |   154    |   155    |   156    |   157    |   158    |   159    |
// |                sdf buffer                 |                 sdf halo                  |               texture type                |          |          |          |          |
// |                                           |                                           |                                           |          |          |          |          |
// |                    F32                    |                    F32                    |                    F32                    |          |          |          |          |
// | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 |
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
//
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// |   160    |   161    |   162    |   163    |   164    |   165    |   166    |   167    |   168    |   169    |   170    |   171    |   172    |   173    |   174    |   175    |
// |                 parameter 1               |                 parameter 2               |                 parameter 3               |                 parameter 4               |
// |                                           |                                           |                                           |                                           |
// |                    F32                    |                    F32                    |                    F32                    |                    F32                    |
// | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 |
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
//
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// |   176    |   177    |   178    |   179    |   180    |   181    |   182    |   183    |   184    |   185    |   186    |   187    |   188    |   189    |   190    |   191    |
// |              material color2              |              material color2              |              material color2              |          |          |          |          |
// |                     r                     |                     g                     |                     b                     |          |          |          |          |
// |                    F32                    |                    F32                    |                    F32                    |          |          |          |          |
// | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 |
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
//


export class HittableBufferData extends Float32Array {
    public static readonly SIZE = 192 / 4;
    public static readonly PARAM_COUNT = 4;

    public readonly CENTER_OFFSET = 0 / 4;
    public readonly UNIT_TYPE_OFFSET = 12 / 4;
    public readonly SIZE_OFFSET = 16 / 4;
    public readonly ROUNDING_OFFSET = 28 / 4;
    public readonly ROTATION_OFFSET = 32 / 4;
    public readonly MATERIAL_TYPE_OFFSET = 48 / 4;
    public readonly MATERIAL_FUZZ_OFFSET = 52 / 4;
    public readonly MATERIAL_GLOSS_OFFSET = 56 / 4;
    public readonly MATERIAL_DENSITY_OFFSET = 60 / 4;
    public readonly MATERIAL_FILL_OFFSET = 64 / 4;
    public readonly MATERIAL_REFRACTIVE_INDEX_OFFSET = 76 / 4;
    public readonly SEGMENT_COLOR1_OFFSET = 80 / 4;
    public readonly TEXTURE_COORDS_OFFSET = 96 / 4;
    public readonly TEXTURE_OFFSET_OFFSET = 112 / 4;
    public readonly TEXTURE_SCALE_OFFSET = 128 / 4;
    public readonly SDF_BUFFER_OFFSET = 144 / 4;
    public readonly SDF_HALO_OFFSET = 148 / 4;
    public readonly TEXTURE_TYPE_OFFSET = 152 / 4;
    public readonly PARAM_OFFSET = 160 / 4;
    public readonly MATERIAL_COLOR2_OFFSET = 176 / 4;

    public getUnitType(index: number) {
        return this[HittableBufferData.SIZE * index + this.UNIT_TYPE_OFFSET];
    }
    public setUnitType(index: number, value: number) {
        this[HittableBufferData.SIZE * index + this.UNIT_TYPE_OFFSET] = value;
    }

    public getCenter(index: number, value: Vector3) {
        const offset = HittableBufferData.SIZE * index + this.CENTER_OFFSET;
        value[0] = this[offset];
        value[1] = this[offset + 1];
        value[2] = this[offset + 2];
    }
    public setCenter(index: number, value: Vector3) {
        const offset = HittableBufferData.SIZE * index + this.CENTER_OFFSET;
        this[offset] = value[0];
        this[offset + 1] = value[1];
        this[offset + 2] = value[2];
    }

    public getSize(index: number, value: Vector3) {
        const offset = HittableBufferData.SIZE * index + this.SIZE_OFFSET;
        value[0] = this[offset];
        value[1] = this[offset + 1];
        value[2] = this[offset + 2];
    }
    public setSize(index: number, value: Vector3) {
        const offset = HittableBufferData.SIZE * index + this.SIZE_OFFSET;
        this[offset] = value[0];
        this[offset + 1] = value[1];
        this[offset + 2] = value[2];
    }

    public getRotation(index: number, value: Quaternion) {
        const offset = HittableBufferData.SIZE * index + this.ROTATION_OFFSET;
        value[0] = this[offset];
        value[1] = this[offset + 1];
        value[2] = this[offset + 2];
        value[3] = this[offset + 3];
    }
    public setRotation(index: number, value: Quaternion) {
        const offset = HittableBufferData.SIZE * index + this.ROTATION_OFFSET;
        this[offset] = value[0];
        this[offset + 1] = value[1];
        this[offset + 2] = value[2];
        this[offset + 3] = value[3];
    }

    public getRounding(index: number) {
        return this[HittableBufferData.SIZE * index + this.ROUNDING_OFFSET];
    }
    public setRounding(index: number, value: number) {
        this[HittableBufferData.SIZE * index + this.ROUNDING_OFFSET] = value;
    }

    public getMaterial(index: number, material: Material) {
        material.type = this.getMaterialType(index);
        material.fuzz = this.getMaterialFuzz(index);
        material.gloss = this.getMaterialGloss(index);
        material.density = this.getMaterialDensity(index);
        material.refractiveIndex = this.getMaterialRefractiveIndex(index);
        this.getMaterialColor1(index, material.fill);
        this.getMaterialColor2(index, material.stroke);
    }
    public setMaterial(index: number, material: Material) {
        this.setMaterialType(index, material.type);
        this.setMaterialFuzz(index, material.fuzz);
        this.setMaterialGloss(index, material.gloss);
        this.setMaterialDensity(index, material.density);
        this.setMaterialRefractiveIndex(index, material.refractiveIndex);
        this.setMaterialColor1(index, material.fill);
        this.setMaterialColor2(index, material.stroke);
    }

    public getMaterialType(index: number) {
        return this[HittableBufferData.SIZE * index + this.MATERIAL_TYPE_OFFSET];
    }
    public setMaterialType(index: number, value: number) {
        this[HittableBufferData.SIZE * index + this.MATERIAL_TYPE_OFFSET] = value;
    }

    public getMaterialFuzz(index: number) {
        return this[HittableBufferData.SIZE * index + this.MATERIAL_FUZZ_OFFSET];
    }
    public setMaterialFuzz(index: number, value: number) {
        this[HittableBufferData.SIZE * index + this.MATERIAL_FUZZ_OFFSET] = value;
    }

    public getMaterialGloss(index: number) {
        return this[HittableBufferData.SIZE * index + this.MATERIAL_GLOSS_OFFSET];
    }
    public setMaterialGloss(index: number, value: number) {
        this[HittableBufferData.SIZE * index + this.MATERIAL_GLOSS_OFFSET] = value;
    }

    public getMaterialDensity(index: number) {
        return this[HittableBufferData.SIZE * index + this.MATERIAL_DENSITY_OFFSET];
    }
    public setMaterialDensity(index: number, value: number) {
        this[HittableBufferData.SIZE * index + this.MATERIAL_DENSITY_OFFSET] = value;
    }

    public getMaterialRefractiveIndex(index: number) {
        return this[HittableBufferData.SIZE * index + this.MATERIAL_REFRACTIVE_INDEX_OFFSET];
    }
    public setMaterialRefractiveIndex(index: number, value: number) {
        this[HittableBufferData.SIZE * index + this.MATERIAL_REFRACTIVE_INDEX_OFFSET] = value;
    }

    public getMaterialColor1(index: number, value: ColorRGB) {
        const offset = HittableBufferData.SIZE * index + this.MATERIAL_FILL_OFFSET;
        value[0] = this[offset];
        value[1] = this[offset + 1];
        value[2] = this[offset + 2];
    }
    public setMaterialColor1(index: number, value: ColorRGB) {
        const offset = HittableBufferData.SIZE * index + this.MATERIAL_FILL_OFFSET;
        this[offset] = value[0];
        this[offset + 1] = value[1];
        this[offset + 2] = value[2];
    }
    public getMaterialColor2(index: number, value: ColorRGB) {
        const offset = HittableBufferData.SIZE * index + this.MATERIAL_COLOR2_OFFSET;
        value[0] = this[offset];
        value[1] = this[offset + 1];
        value[2] = this[offset + 2];
    }
    public setMaterialColor2(index: number, value: ColorRGB) {
        const offset = HittableBufferData.SIZE * index + this.MATERIAL_COLOR2_OFFSET;
        this[offset] = value[0];
        this[offset + 1] = value[1];
        this[offset + 2] = value[2];
    }

    public getTextureType(index: number) {
        return this[HittableBufferData.SIZE * index + this.TEXTURE_TYPE_OFFSET];
    }
    public setTextureType(index: number, value: number) {
        this[HittableBufferData.SIZE * index + this.TEXTURE_TYPE_OFFSET] = value;
    }

    public getSegmentColor(index: number, value: ColorRGBA) {
        const offset = HittableBufferData.SIZE * index + this.SEGMENT_COLOR1_OFFSET;
        value[0] = this[offset];
        value[1] = this[offset + 1];
        value[2] = this[offset + 2];
        value[3] = this[offset + 3];
    }
    public setSegmentColor(index: number, value: ColorRGBA) {
        const offset = HittableBufferData.SIZE * index + this.SEGMENT_COLOR1_OFFSET;
        this[offset] = value[0];
        this[offset + 1] = value[1];
        this[offset + 2] = value[2];
        this[offset + 3] = value[3];
    }

    public getTexCoords(index: number, value: Vector4) {
        const offset = HittableBufferData.SIZE * index + this.TEXTURE_COORDS_OFFSET;
        value[0] = this[offset];
        value[1] = this[offset + 1];
        value[2] = this[offset + 2];
        value[3] = this[offset + 3];
    }
    public setTexCoords(index: number, value: Vector4) {
        const offset = HittableBufferData.SIZE * index + this.TEXTURE_COORDS_OFFSET;
        this[offset] = value[0];
        this[offset + 1] = value[1];
        this[offset + 2] = value[2];
        this[offset + 3] = value[3];
    }
    public getTexOffset(index: number, value: Vector4) {
        const offset = HittableBufferData.SIZE * index + this.TEXTURE_OFFSET_OFFSET;
        value[0] = this[offset];
        value[1] = this[offset + 1];
        value[2] = this[offset + 2];
        value[3] = this[offset + 3];
    }
    public setTexOffset(index: number, value: Vector4) {
        const offset = HittableBufferData.SIZE * index + this.TEXTURE_OFFSET_OFFSET;
        this[offset] = value[0];
        this[offset + 1] = value[1];
        this[offset + 2] = value[2];
        this[offset + 3] = value[3];
    }
    public getTexScale(index: number, value: Vector4) {
        const offset = HittableBufferData.SIZE * index + this.TEXTURE_SCALE_OFFSET;
        value[0] = this[offset];
        value[1] = this[offset + 1];
        value[2] = this[offset + 2];
        value[3] = this[offset + 3];
    }
    public setTexScale(index: number, value: Vector4) {
        const offset = HittableBufferData.SIZE * index + this.TEXTURE_SCALE_OFFSET;
        this[offset] = value[0];
        this[offset + 1] = value[1];
        this[offset + 2] = value[2];
        this[offset + 3] = value[3];
    }

    public getSdfBuffer(index: number) {
        return this[HittableBufferData.SIZE * index + this.SDF_BUFFER_OFFSET];
    }
    public setSdfBuffer(index: number, value: number) {
        this[HittableBufferData.SIZE * index + this.SDF_BUFFER_OFFSET] = value;
    }

    public getSdfHalo(index: number) {
        return this[HittableBufferData.SIZE * index + this.SDF_HALO_OFFSET];
    }
    public setSdfHalo(index: number, value: number) {
        this[HittableBufferData.SIZE * index + this.SDF_HALO_OFFSET] = value;
    }

    public getParam(index: number, paramIndex: number): number {
        return this[HittableBufferData.SIZE * index + this.PARAM_OFFSET + paramIndex];
    }
    public setParam(index: number, value: number, paramIndex: number) {
        this[HittableBufferData.SIZE * index + this.PARAM_OFFSET + paramIndex] = value;
    }
}