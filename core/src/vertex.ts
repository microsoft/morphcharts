// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import { ColorRGBA } from "./color.js";
import { Material } from "./material.js";
import { Quaternion, Vector3, Vector4 } from "./matrix.js";

export class UnitVertex {
    // idHover, f32, id used for hover feedback (e.g. whole lines, stacks etc)
    // idColor, unique id encoded as vec4<f32>, uniqueId = idColor[0] + idColor[1] * 2^8 + idColor[2] * 2^16 + idColor[3] * 2^24
    // order, ?
    // stagger order, f32, order for staggered transitions
    // translation, vec3<f32>, (x,y,z)
    // rotation, quaternion, (x,y,z,w)
    // texCoord, vec3<f32>, (x,y,z) texture coordinates
    // selected, boolean, selected flag
    // texture, 
    // sdf buffer
    // sdf border
    // parameter 1
    // parameter 2
    // rounding, f32, rounding for sdf edges
    // material, uint8, material type
    // material color, vec3<f32> (r,g,b)
    // material fuzz, f32, material fuzziness
    // material gloss, f32, material glossiness
    // material density, f32, material density
    // material refractive index, f32, material refractive index
    // segment color, vec3<f32> (r,g,b)

    // RH coordinates (+z from screen to eye, -z from eye to screen)
    //    +y
    //     |
    //     |____ +x
    //    /
    //  +z
    //
    // Block
    //               .---------------.
    //              /|              /|
    //             / |             / |
    //            /  |            /  |
    //        -> .---------------.   |
    //           |   |     o     |   |
    //    height |   '-----------|---' <-
    //   (sizey) |  /            |  /
    //           | /             | / depth (sizez)
    //           |/              |/
    //        -> '---------------' <-
    //           ^               ^
    //           |     width     |
    //                (sizex)
    // 
    // Cylinder
    // 
    //   .-----.
    //  |'-----'| <-
    //  |       |
    //  |       | height 
    //  |   o   | (sizey) 
    //  |       |
    //  |       |
    //   '-----'  <-
    //  ^       ^
    //  |       |
    //  diameter (sizex, sizez)
    //
    // Sphere
    //
    //    .---.
    //  /       \
    // |'- ___ -'|
    //  \       /
    //    '---'
    //  ^        ^
    //  |        |
    //   diameter (sizex, sizey, sizez)
    //
    // Disk
    //                           .---.  o <- texcoord1 (texCoord?, texCoord?)
    //                         /       \
    //                        |    o    |
    //  (texcoord?, texcoord?) \       /  thickness (sizez)
    //           texcoord0 -> o  '---'
    //                        ^         ^
    //                        |         |
    //                         diameter (sizex, sizey)
    //
    // Tube
    //
    //   inner diameter (param1, sizex units)
    //     |     |
    //     \/   \/
    //     _______
    //  .'   ___   '.
    //  |  ( ___ )  | <-
    //  |'._______.'|
    //  |     o     | height (sizey)
    //  |           |
    //   '._______.'  <-
    //  ^           ^
    //  |           |
    //  outer diameter (sizex, sizez)
    //
    // Ring
    //
    //        inner diameter (param1, sizex units)
    //         |       |
    //        \/       \/
    //         ..---.
    //       /      | <-start angle (param2, degrees)
    //     /     .--'
    //    |    /           
    //   |    |    o    ----- <- end angle (param3, degrees)
    //    |    \       /    |
    //     \     '---'     /
    //       \           /  thickness (sizez)
    //         ''-----''
    //   ^                  ^
    //   |                  |
    //    outer diamter (sizex, sizey)
    //
    // Rect XY
    // (sizez 0)               .---------o <- texcoord1 (texCoord?, texCoord?)
    //                         |         |
    //                         |    o    |  height (sizey)
    //  (texcoord?, texcoord?) |         |
    //            texcoord0 -> o---------' <-
    //                         ^         ^
    //                         |         |
    //                         width (sizex)
    //
    // Hex prism (flat-top)
    //     _____
    //   /       \ <-
    //  |\ _____ /|
    //  | |     | |
    //  | |     | | height 
    //  | |  o  | | (sizey)
    //  | |     | |
    //  | |     | |
    //   \|_____|/ <-
    //  ^         ^
    //  |         |
    //   width (sizex), flat-top sizez = sizex * √3 /2
    //
    //
    // Trapezoid
    // Origin at half-width, half-height, half-thickness
    //
    //  b-+----> ..
    //    |      | ''..   thickness (sizez)
    //    |      |     ''..
    //  height1  |        ''..  <-d
    //  (sizey)  |     o      |
    //    |      |   origin   |     a (param1), b (param2), c (param3), d (param4) are heights from (origin-sizey/2) in sizey units
    //    |  a-> '......      |
    //    +->           ''''''' <-c
    //           ^            ^
    //           |            |
    //            width (sizex)
    //
    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    // |    0     |    1     |    2     |    3     |    4     |    5     |    6     |    7     |    8     |    9     |   10     |   11     |   12     |   13     |   14     |   15     |
    // |                 hover id                  | id color | id color | id color | id color | segColor | segColor | segColor | segColor |                  stagger                  |
    // |                                           |    x     |    y     |    z     |    w     |    r     |    g     |    b     |    a     |                                           |
    // |                    F32                    | UI8 NORM | UI8 NORM | UI8 NORM | UI8 NORM | UI8 NORM | UI8 NORM | UI8 NORM | UI8 NORM |                    F32                    |
    // | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 |
    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    //
    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    // |   16     |   17     |   18     |   19     |   20     |   21     |   22     |   23     |   24     |   25     |   26     |   27     |   28     |   29     |   30     |   31     |
    // |                translation                |                translation                |                translation                | selected | texture  |          |          |
    // |                     x                     |                     y                     |                     z                     |          |          |          |          |
    // |                    F32                    |                    F32                    |                    F32                    | I8 NORM  |   UI8    |          |          |
    // | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 |
    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    //
    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    // |   32     |   33     |   34     |   35     |   36     |   37     |    38    |    39    |   40     |   41     |   42     |   43     |   44     |   45     |   46     |   47     |
    // |                   scale                   |                   scale                   |                   scale                   |                 rounding                  |
    // |                     x                     |                     y                     |                     z                     |                                           |
    // |                    F32                    |                    F32                    |                    F32                    |                    F32                    |
    // | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 |
    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    //
    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    // |   48     |   49     |   50     |   51     |   52     |   53     |   54     |   55     |   56     |   57     |   58     |   59     |   60     |   61     |   62     |   63     |
    // |                  rotation                 |                  rotation                 |                  rotation                 |                  rotation                 |
    // |                     x                     |                     y                     |                     z                     |                     w                     |
    // |                    F32                    |                    F32                    |                    F32                    |                    F32                    |
    // | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 |
    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    //
    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    // |   64     |   65     |   66     |   67     |   68     |   69     |   70     |   71     |   72     |   73     |   74     |   75     |   76     |   77     |   78     |   79     |
    // |                  texCoord                 |                  texCoord                 |                  texCoord                 |                  texCoord                 |
    // |                     u0                    |                     v0                    |                     u1                    |                     v1                    |
    // |                    F32                    |                    F32                    |                    F32                    |                    F32                    |
    // | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 |
    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    //
    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    // |   80     |   81     |   82     |   83     |   84     |   85     |   86     |   87     |   88     |   89     |   90     |   91     |   92     |   93     |   94     |   95     |
    // |                 texOffset                 |                 texOffset                 |                 texOffset                 |                 texOffset                 |
    // |                     x                     |                     y                     |                     z                     |                     w                     |
    // |                    F32                    |                    F32                    |                    F32                    |                    F32                    |
    // | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 |
    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    //
    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    // |   96     |   97     |   98     |   99     |   100    |   101    |   102    |   103    |   104    |   105    |   106    |   107    |   108    |   109    |   110    |   111    |
    // |                 texScale                  |                 texScale                  |                 texScale                  |                 texScale                  |
    // |                     x                     |                     y                     |                     z                     |                     w                     |
    // |                    F32                    |                    F32                    |                    F32                    |                    F32                    |
    // | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 |
    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    // 
    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    // |   112    |   113    |   114    |   115    |   116    |   117    |   118    |   119    |   120    |   121    |   122    |   123    |   124    |   125    |   126    |   127    |
    // |                 parameter 1               |                 parameter 2               |                 parameter 3               |                 parameter 4               |
    // |                                           |                                           |                                           |                                           |
    // |                    F32                    |                    F32                    |                    F32                    |                    F32                    |
    // | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 |
    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    //
    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    // |   128    |   129    |   130    |   131    |   132    |   133    |   134    |   135    |   136    |   137    |   138    |   139    |   140    |   141    |   142    |   143    |
    // | mat type |   fuzz   |   gloss  | tex type |         fill        |         fill        |         fill        |          |          |              refractive index             |
    // |          |          |          |          |          r          |          g          |          b          |          |          |                                           |
    // | UI8 NORM | UI8 NORM | UI8 NORM | UI8 NORM |      UI16 NORM      |      UI16 NORM      |      UI16 NORM      |          |          |                    F32                    |
    // | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 |
    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    //
    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    // |   144    |   145    |   146    |   147    |   148    |   149    |   150    |   151    |   152    |   153    |   154    |   155    |   156    |   157    |   158    |   159    |
    // |                  density                  |        stroke       |        stroke       |        stroke       | sdf buff | sdf halo |          |          |          |          |
    // |                                           |          r          |          g          |          b          |          |          |          |          |          |          |
    // |                    F32                    |      UI16 NORM      |      UI16 NORM      |      UI16 NORM      |   UI8    |   UI8    |          |          |          |          |
    // | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 | 00000000 |
    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    public static readonly SIZE_BYTES = 160;
    public static readonly PARAM_SIZE_BYTES = 4;
    public static readonly PARAM_COUNT = 4;

    public static readonly ID_HOVER_OFFSET_BYTES = 0;
    public static readonly ID_COLOR_OFFSET_BYTES = 4;
    public static readonly SEG_COLOR_OFFSET_BYTES = 8;
    public static readonly STAGGER_ORDER_OFFSET_BYTES = 12;
    public static readonly TRANSLATION_OFFSET_BYTES = 16;
    public static readonly SELECTED_OFFSET_BYTES = 28;
    public static readonly TEXTURE_OFFSET_BYTES = 29;
    public static readonly SCALE_OFFSET_BYTES = 32;
    public static readonly ROUNDING_OFFSET_BYTES = 44;
    public static readonly ROTATION_OFFSET_BYTES = 48;
    public static readonly TEXTURE_COORDS_OFFSET_BYTES = 64;
    public static readonly TEXTURE_OFFSET_OFFSET_BYTES = 80;
    public static readonly TEXTURE_SCALE_OFFSET_BYTES = 96;
    public static readonly PARAM_OFFSET_BYTES = 112;
    public static readonly MAT_TYPE_OFFSET_BYTES = 128;
    public static readonly FUZZ_OFFSET_BYTES = 129;
    public static readonly GLOSS_OFFSET_BYTES = 130;
    public static readonly TEXTURE_TYPE_OFFSET_BYTES = 131;
    public static readonly FILL_OFFSET_BYTES = 132;
    public static readonly REFRACTIVE_INDEX_OFFSET_BYTES = 140;
    public static readonly DENSITY_OFFSET_BYTES = 144;
    public static readonly STROKE_OFFSET_BYTES = 148;
    public static readonly SDF_BUFFER_OFFSET_BYTES = 154;
    public static readonly SDF_HALO_OFFSET_BYTES = 155;

    public static getId(bufferView: DataView, index: number): number {
        return bufferView.getFloat32(UnitVertex.SIZE_BYTES * index + this.ID_HOVER_OFFSET_BYTES, true);
    }
    public static setIdHover(bufferView: DataView, index: number, value: number) {
        bufferView.setFloat32(UnitVertex.SIZE_BYTES * index + this.ID_HOVER_OFFSET_BYTES, value, true);
    }
    public static copyIdHover(fromBufferView: DataView, fromIndex: number, toBufferView: DataView, toIndex: number) {
        toBufferView.setFloat32(UnitVertex.SIZE_BYTES * toIndex + this.ID_HOVER_OFFSET_BYTES, fromBufferView.getFloat32(UnitVertex.SIZE_BYTES * fromIndex + this.ID_HOVER_OFFSET_BYTES, true), true);
    }

    public static getTranslation(bufferView: DataView, index: number, value: Vector3) {
        const offset = UnitVertex.SIZE_BYTES * index + this.TRANSLATION_OFFSET_BYTES;
        value[0] = bufferView.getFloat32(offset, true);
        value[1] = bufferView.getFloat32(offset + 4, true);
        value[2] = bufferView.getFloat32(offset + 8, true);
    }
    public static setTranslation(bufferView: DataView, index: number, value: Vector3) {
        const offset = UnitVertex.SIZE_BYTES * index + this.TRANSLATION_OFFSET_BYTES;
        bufferView.setFloat32(offset, value[0], true);
        bufferView.setFloat32(offset + 4, value[1], true);
        bufferView.setFloat32(offset + 8, value[2], true);
    }
    public static copyTranslation(fromBufferView: DataView, fromIndex: number, toBufferView: DataView, toIndex: number) {
        const fromOffset = UnitVertex.SIZE_BYTES * fromIndex + this.TRANSLATION_OFFSET_BYTES;
        const toOffset = UnitVertex.SIZE_BYTES * toIndex + this.TRANSLATION_OFFSET_BYTES;
        toBufferView.setFloat32(toOffset, fromBufferView.getFloat32(fromOffset, true), true);
        toBufferView.setFloat32(toOffset + 4, fromBufferView.getFloat32(fromOffset + 4, true), true);
        toBufferView.setFloat32(toOffset + 8, fromBufferView.getFloat32(fromOffset + 8, true), true);
    }

    public static getScale(bufferView: DataView, index: number, value: Vector3) {
        const offset = UnitVertex.SIZE_BYTES * index + this.SCALE_OFFSET_BYTES;
        value[0] = bufferView.getFloat32(offset, true);
        value[1] = bufferView.getFloat32(offset + 4, true);
        value[2] = bufferView.getFloat32(offset + 8, true);
    }
    public static setScale(bufferView: DataView, index: number, value: Vector3) {
        const offset = UnitVertex.SIZE_BYTES * index + this.SCALE_OFFSET_BYTES;
        bufferView.setFloat32(offset, value[0], true);
        bufferView.setFloat32(offset + 4, value[1], true);
        bufferView.setFloat32(offset + 8, value[2], true);
    }
    public static copyScale(fromBufferView: DataView, fromIndex: number, toBufferView: DataView, toIndex: number) {
        const fromOffset = UnitVertex.SIZE_BYTES * fromIndex + this.SCALE_OFFSET_BYTES;
        const toOffset = UnitVertex.SIZE_BYTES * toIndex + this.SCALE_OFFSET_BYTES;
        toBufferView.setFloat32(toOffset, fromBufferView.getFloat32(fromOffset, true), true);
        toBufferView.setFloat32(toOffset + 4, fromBufferView.getFloat32(fromOffset + 4, true), true);
        toBufferView.setFloat32(toOffset + 8, fromBufferView.getFloat32(fromOffset + 8, true), true);
    }

    public static getRotation(bufferView: DataView, index: number, value: Quaternion) {
        const offset = UnitVertex.SIZE_BYTES * index + this.ROTATION_OFFSET_BYTES;
        value[0] = bufferView.getFloat32(offset, true);
        value[1] = bufferView.getFloat32(offset + 4, true);
        value[2] = bufferView.getFloat32(offset + 8, true);
        value[3] = bufferView.getFloat32(offset + 12, true);
    }
    public static setRotation(bufferView: DataView, index: number, value: Quaternion) {
        const offset = UnitVertex.SIZE_BYTES * index + this.ROTATION_OFFSET_BYTES;
        bufferView.setFloat32(offset, value[0], true);
        bufferView.setFloat32(offset + 4, value[1], true);
        bufferView.setFloat32(offset + 8, value[2], true);
        bufferView.setFloat32(offset + 12, value[3], true);
    }
    public static copyRotation(fromBufferView: DataView, fromIndex: number, toBufferView: DataView, toIndex: number) {
        const fromOffset = UnitVertex.SIZE_BYTES * fromIndex + this.ROTATION_OFFSET_BYTES;
        const toOffset = UnitVertex.SIZE_BYTES * toIndex + this.ROTATION_OFFSET_BYTES;
        toBufferView.setFloat32(toOffset, fromBufferView.getFloat32(fromOffset, true), true);
        toBufferView.setFloat32(toOffset + 4, fromBufferView.getFloat32(fromOffset + 4, true), true);
        toBufferView.setFloat32(toOffset + 8, fromBufferView.getFloat32(fromOffset + 8, true), true);
        toBufferView.setFloat32(toOffset + 12, fromBufferView.getFloat32(fromOffset + 12, true), true);
    }

    public static getTexCoords(bufferView: DataView, index: number, value: Vector4) {
        const offset = UnitVertex.SIZE_BYTES * index + this.TEXTURE_COORDS_OFFSET_BYTES;
        value[0] = bufferView.getFloat32(offset, true);
        value[1] = bufferView.getFloat32(offset + 4, true);
        value[2] = bufferView.getFloat32(offset + 8, true);
        value[3] = bufferView.getFloat32(offset + 12, true);
    }
    public static setTexCoords(bufferView: DataView, index: number, value: Vector4) {
        const offset = UnitVertex.SIZE_BYTES * index + this.TEXTURE_COORDS_OFFSET_BYTES;
        bufferView.setFloat32(offset, value[0], true);
        bufferView.setFloat32(offset + 4, value[1], true);
        bufferView.setFloat32(offset + 8, value[2], true);
        bufferView.setFloat32(offset + 12, value[3], true);
    }
    public static copyTexCoords(fromBufferView: DataView, fromIndex: number, toBufferView: DataView, toIndex: number) {
        const fromOffset = UnitVertex.SIZE_BYTES * fromIndex + this.TEXTURE_COORDS_OFFSET_BYTES;
        const toOffset = UnitVertex.SIZE_BYTES * toIndex + this.TEXTURE_COORDS_OFFSET_BYTES;
        toBufferView.setFloat32(toOffset, fromBufferView.getFloat32(fromOffset, true), true);
        toBufferView.setFloat32(toOffset + 4, fromBufferView.getFloat32(fromOffset + 4, true), true);
        toBufferView.setFloat32(toOffset + 8, fromBufferView.getFloat32(fromOffset + 8, true), true);
        toBufferView.setFloat32(toOffset + 12, fromBufferView.getFloat32(fromOffset + 12, true), true);
    }
    public static getTexOffset(bufferView: DataView, index: number, value: Vector4) {
        const offset = UnitVertex.SIZE_BYTES * index + this.TEXTURE_OFFSET_OFFSET_BYTES;
        value[0] = bufferView.getFloat32(offset, true);
        value[1] = bufferView.getFloat32(offset + 4, true);
        value[2] = bufferView.getFloat32(offset + 8, true);
        value[3] = bufferView.getFloat32(offset + 12, true);
    }
    public static setTexOffset(bufferView: DataView, index: number, value: Vector4) {
        const offset = UnitVertex.SIZE_BYTES * index + this.TEXTURE_OFFSET_OFFSET_BYTES;
        bufferView.setFloat32(offset, value[0], true);
        bufferView.setFloat32(offset + 4, value[1], true);
        bufferView.setFloat32(offset + 8, value[2], true);
        bufferView.setFloat32(offset + 12, value[3], true);
    }
    public static copyTexOffset(fromBufferView: DataView, fromIndex: number, toBufferView: DataView, toIndex: number) {
        const fromOffset = UnitVertex.SIZE_BYTES * fromIndex + this.TEXTURE_OFFSET_OFFSET_BYTES;
        const toOffset = UnitVertex.SIZE_BYTES * toIndex + this.TEXTURE_OFFSET_OFFSET_BYTES;
        toBufferView.setFloat32(toOffset, fromBufferView.getFloat32(fromOffset, true), true);
        toBufferView.setFloat32(toOffset + 4, fromBufferView.getFloat32(fromOffset + 4, true), true);
        toBufferView.setFloat32(toOffset + 8, fromBufferView.getFloat32(fromOffset + 8, true), true);
        toBufferView.setFloat32(toOffset + 12, fromBufferView.getFloat32(fromOffset + 12, true), true);
    }
    public static getTexScale(bufferView: DataView, index: number, value: Vector4) {
        const offset = UnitVertex.SIZE_BYTES * index + this.TEXTURE_SCALE_OFFSET_BYTES;
        value[0] = bufferView.getFloat32(offset, true);
        value[1] = bufferView.getFloat32(offset + 4, true);
        value[2] = bufferView.getFloat32(offset + 8, true);
        value[3] = bufferView.getFloat32(offset + 12, true);
    }
    public static setTexScale(bufferView: DataView, index: number, value: Vector4) {
        const offset = UnitVertex.SIZE_BYTES * index + this.TEXTURE_SCALE_OFFSET_BYTES;
        bufferView.setFloat32(offset, value[0], true);
        bufferView.setFloat32(offset + 4, value[1], true);
        bufferView.setFloat32(offset + 8, value[2], true);
        bufferView.setFloat32(offset + 12, value[3], true);
    }
    public static copyTexScale(fromBufferView: DataView, fromIndex: number, toBufferView: DataView, toIndex: number) {
        const fromOffset = UnitVertex.SIZE_BYTES * fromIndex + this.TEXTURE_SCALE_OFFSET_BYTES;
        const toOffset = UnitVertex.SIZE_BYTES * toIndex + this.TEXTURE_SCALE_OFFSET_BYTES;
        toBufferView.setFloat32(toOffset, fromBufferView.getFloat32(fromOffset, true), true);
        toBufferView.setFloat32(toOffset + 4, fromBufferView.getFloat32(fromOffset + 4, true), true);
        toBufferView.setFloat32(toOffset + 8, fromBufferView.getFloat32(fromOffset + 8, true), true);
        toBufferView.setFloat32(toOffset + 12, fromBufferView.getFloat32(fromOffset + 12, true), true);
    }

    // Scale from [0,255] to [0,1]
    public static getIdColor(bufferView: DataView, index: number, value: Vector4) {
        const offset = UnitVertex.SIZE_BYTES * index + this.ID_COLOR_OFFSET_BYTES;
        value[0] = bufferView.getUint8(offset) / 0xff;
        value[1] = bufferView.getUint8(offset + 1) / 0xff;
        value[2] = bufferView.getUint8(offset + 2) / 0xff;
        value[3] = bufferView.getUint8(offset + 3) / 0xff;
    }
    // Scale from [0,1] to [0,255]
    public static setIdColor(bufferView: DataView, index: number, value: Vector4) {
        const offset = UnitVertex.SIZE_BYTES * index + this.ID_COLOR_OFFSET_BYTES;
        bufferView.setUint8(offset, value[0] * 0xff);
        bufferView.setUint8(offset + 1, value[1] * 0xff);
        bufferView.setUint8(offset + 2, value[2] * 0xff);
        bufferView.setUint8(offset + 3, value[3] * 0xff);
    }

    // Scale from [-128,127] to [-1,1]
    public static getSelected(bufferView: DataView, index: number): number {
        return bufferView.getInt8(UnitVertex.SIZE_BYTES * index + this.SELECTED_OFFSET_BYTES) / 0x7F;
    }
    // Scale from [-1,1] to [-128,127]
    public static setSelected(bufferView: DataView, index: number, value: number) {
        bufferView.setInt8(UnitVertex.SIZE_BYTES * index + this.SELECTED_OFFSET_BYTES, value * 0x7F);
    }
    public static copySelected(fromBufferView: DataView, fromIndex: number, toBufferView: DataView, toIndex: number) {
        toBufferView.setInt8(UnitVertex.SIZE_BYTES * toIndex + this.SELECTED_OFFSET_BYTES, fromBufferView.getInt8(UnitVertex.SIZE_BYTES * fromIndex + this.SELECTED_OFFSET_BYTES));
    }

    public static getRounding(bufferView: DataView, index: number): number {
        return bufferView.getFloat32(UnitVertex.SIZE_BYTES * index + this.ROUNDING_OFFSET_BYTES, true);
    }
    public static setRounding(bufferView: DataView, index: number, value: number) {
        bufferView.setFloat32(UnitVertex.SIZE_BYTES * index + this.ROUNDING_OFFSET_BYTES, value, true);
    }
    public static copyRounding(fromBufferView: DataView, fromIndex: number, toBufferView: DataView, toIndex: number) {
        toBufferView.setFloat32(UnitVertex.SIZE_BYTES * toIndex + this.ROUNDING_OFFSET_BYTES, fromBufferView.getFloat32(UnitVertex.SIZE_BYTES * fromIndex + this.ROUNDING_OFFSET_BYTES, true), true);
    }

    public static getParam(bufferView: DataView, index: number, paramIndex: number): number {
        return bufferView.getFloat32(UnitVertex.SIZE_BYTES * index + this.PARAM_OFFSET_BYTES + this.PARAM_SIZE_BYTES * paramIndex, true);
    }
    public static setParam(bufferView: DataView, index: number, value: number, paramIndex: number) {
        bufferView.setFloat32(UnitVertex.SIZE_BYTES * index + this.PARAM_OFFSET_BYTES + this.PARAM_SIZE_BYTES * paramIndex, value, true);
    }
    public static copyParam(fromBufferView: DataView, fromIndex: number, toBufferView: DataView, toIndex: number, paramIndex: number) {
        toBufferView.setFloat32(UnitVertex.SIZE_BYTES * toIndex + this.PARAM_OFFSET_BYTES + this.PARAM_SIZE_BYTES * paramIndex, fromBufferView.getFloat32(UnitVertex.SIZE_BYTES * fromIndex + this.PARAM_OFFSET_BYTES + this.PARAM_SIZE_BYTES * paramIndex, true), true);
    }

    public static getTexture(bufferView: DataView, index: number): number {
        return bufferView.getUint8(UnitVertex.SIZE_BYTES * index + this.TEXTURE_OFFSET_BYTES);
    }
    public static setTexture(bufferView: DataView, index: number, value: number) {
        bufferView.setUint8(UnitVertex.SIZE_BYTES * index + this.TEXTURE_OFFSET_BYTES, value);
    }
    public static copyTexture(fromBufferView: DataView, fromIndex: number, toBufferView: DataView, toIndex: number) {
        toBufferView.setUint8(UnitVertex.SIZE_BYTES * toIndex + this.TEXTURE_OFFSET_BYTES, fromBufferView.getUint8(UnitVertex.SIZE_BYTES * fromIndex + this.TEXTURE_OFFSET_BYTES));
    }

    public static getSdfBuffer(bufferView: DataView, index: number): number {
        return bufferView.getUint8(UnitVertex.SIZE_BYTES * index + this.SDF_BUFFER_OFFSET_BYTES);
    }
    public static setSdfBuffer(bufferView: DataView, index: number, value: number) {
        bufferView.setUint8(UnitVertex.SIZE_BYTES * index + this.SDF_BUFFER_OFFSET_BYTES, value);
    }
    public static copySdfBuffer(fromBufferView: DataView, fromIndex: number, toBufferView: DataView, toIndex: number) {
        toBufferView.setUint8(UnitVertex.SIZE_BYTES * toIndex + this.SDF_BUFFER_OFFSET_BYTES, fromBufferView.getUint8(UnitVertex.SIZE_BYTES * fromIndex + this.SDF_BUFFER_OFFSET_BYTES));
    }

    public static getSdfHalo(bufferView: DataView, index: number): number {
        return bufferView.getUint8(UnitVertex.SIZE_BYTES * index + this.SDF_HALO_OFFSET_BYTES);
    }
    public static setSdfHalo(bufferView: DataView, index: number, value: number) {
        bufferView.setUint8(UnitVertex.SIZE_BYTES * index + this.SDF_HALO_OFFSET_BYTES, value);
    }
    public static copySdfHalo(fromBufferView: DataView, fromIndex: number, toBufferView: DataView, toIndex: number) {
        toBufferView.setUint8(UnitVertex.SIZE_BYTES * toIndex + this.SDF_HALO_OFFSET_BYTES, fromBufferView.getUint8(UnitVertex.SIZE_BYTES * fromIndex + this.SDF_HALO_OFFSET_BYTES));
    }

    public static getMaterial(bufferView: DataView, index: number, material: Material) {
        material.type = this.getMaterialType(bufferView, index);
        material.fuzz = this.getFuzz(bufferView, index);
        material.density = this.getDensity(bufferView, index);
        material.refractiveIndex = this.getRefractiveIndex(bufferView, index);
        material.gloss = this.getMatGloss(bufferView, index);
        this.getFill(bufferView, index, material.fill);
        this.getStroke(bufferView, index, material.stroke);
    }
    public static setMaterial(bufferView: DataView, index: number, material: Material) {
        this.setMaterialType(bufferView, index, material.type);
        this.setFuzz(bufferView, index, material.fuzz);
        this.setDensity(bufferView, index, material.density);
        this.setRefractiveIndex(bufferView, index, material.refractiveIndex);
        this.setGloss(bufferView, index, material.gloss);
        this.setFill(bufferView, index, material.fill);
        this.setStroke(bufferView, index, material.stroke);
    }
    public static copyMaterial(fromBufferView: DataView, fromIndex: number, toBufferView: DataView, toIndex: number) {
        this.copyMaterialType(fromBufferView, fromIndex, toBufferView, toIndex);
        this.copyFuzz(fromBufferView, fromIndex, toBufferView, toIndex);
        this.copyDensity(fromBufferView, fromIndex, toBufferView, toIndex);
        this.copyRefractiveIndex(fromBufferView, fromIndex, toBufferView, toIndex);
        this.copyGloss(fromBufferView, fromIndex, toBufferView, toIndex);
        this.copyFill(fromBufferView, fromIndex, toBufferView, toIndex);
        this.copyStroke(fromBufferView, fromIndex, toBufferView, toIndex);
    }

    public static getMaterialType(bufferView: DataView, index: number): number {
        return bufferView.getUint8(UnitVertex.SIZE_BYTES * index + this.MAT_TYPE_OFFSET_BYTES);
    }
    public static setMaterialType(bufferView: DataView, index: number, value: number) {
        bufferView.setUint8(UnitVertex.SIZE_BYTES * index + this.MAT_TYPE_OFFSET_BYTES, value);
    }
    public static copyMaterialType(fromBufferView: DataView, fromIndex: number, toBufferView: DataView, toIndex: number) {
        toBufferView.setUint8(UnitVertex.SIZE_BYTES * toIndex + this.MAT_TYPE_OFFSET_BYTES, fromBufferView.getUint8(UnitVertex.SIZE_BYTES * fromIndex + this.MAT_TYPE_OFFSET_BYTES));
    }

    public static getTextureType(bufferView: DataView, index: number): number {
        return bufferView.getUint8(UnitVertex.SIZE_BYTES * index + this.TEXTURE_TYPE_OFFSET_BYTES);
    }
    public static setTextureType(bufferView: DataView, index: number, value: number) {
        bufferView.setUint8(UnitVertex.SIZE_BYTES * index + this.TEXTURE_TYPE_OFFSET_BYTES, value);
    }
    public static copyTextureType(fromBufferView: DataView, fromIndex: number, toBufferView: DataView, toIndex: number) {
        toBufferView.setUint8(UnitVertex.SIZE_BYTES * toIndex + this.TEXTURE_TYPE_OFFSET_BYTES, fromBufferView.getUint8(UnitVertex.SIZE_BYTES * fromIndex + this.TEXTURE_TYPE_OFFSET_BYTES));
    }

    public static getFill(bufferView: DataView, index: number, value: Vector3) {
        const offset = UnitVertex.SIZE_BYTES * index + this.FILL_OFFSET_BYTES;
        // Use Uint16 since color can be greater than 1.0 for HDR rendering
        value[0] = bufferView.getUint16(offset) / 0xff;
        value[1] = bufferView.getUint16(offset + 2) / 0xff;
        value[2] = bufferView.getUint16(offset + 4) / 0xff;
    }
    public static setFill(bufferView: DataView, index: number, value: Vector3) {
        const offset = UnitVertex.SIZE_BYTES * index + this.FILL_OFFSET_BYTES;
        // Use Uint16 since color can be greater than 1.0 for HDR rendering
        bufferView.setUint16(offset, value[0] * 0xff);
        bufferView.setUint16(offset + 2, value[1] * 0xff);
        bufferView.setUint16(offset + 4, value[2] * 0xff);
    }
    public static copyFill(fromBufferView: DataView, fromIndex: number, toBufferView: DataView, toIndex: number) {
        const fromOffset = UnitVertex.SIZE_BYTES * fromIndex + this.FILL_OFFSET_BYTES;
        const toOffset = UnitVertex.SIZE_BYTES * toIndex + this.FILL_OFFSET_BYTES;
        // Use Uint16 since color can be greater than 1.0 for HDR rendering
        toBufferView.setUint16(toOffset, fromBufferView.getUint16(fromOffset));
        toBufferView.setUint16(toOffset + 2, fromBufferView.getUint16(fromOffset + 2));
        toBufferView.setUint16(toOffset + 4, fromBufferView.getUint16(fromOffset + 4));
    }
    public static getStroke(bufferView: DataView, index: number, value: Vector3) {
        const offset = UnitVertex.SIZE_BYTES * index + this.STROKE_OFFSET_BYTES;
        // Use Uint16 since color can be greater than 1.0 for HDR rendering
        value[0] = bufferView.getUint16(offset) / 0xff;
        value[1] = bufferView.getUint16(offset + 2) / 0xff;
        value[2] = bufferView.getUint16(offset + 4) / 0xff;
    }
    public static setStroke(bufferView: DataView, index: number, value: Vector3) {
        const offset = UnitVertex.SIZE_BYTES * index + this.STROKE_OFFSET_BYTES;
        // Use Uint16 since color can be greater than 1.0 for HDR rendering
        bufferView.setUint16(offset, value[0] * 0xff);
        bufferView.setUint16(offset + 2, value[1] * 0xff);
        bufferView.setUint16(offset + 4, value[2] * 0xff);
    }
    public static copyStroke(fromBufferView: DataView, fromIndex: number, toBufferView: DataView, toIndex: number) {
        const fromOffset = UnitVertex.SIZE_BYTES * fromIndex + this.STROKE_OFFSET_BYTES;
        const toOffset = UnitVertex.SIZE_BYTES * toIndex + this.STROKE_OFFSET_BYTES;
        // Use Uint16 since color can be greater than 1.0 for HDR rendering
        toBufferView.setUint16(toOffset, fromBufferView.getUint16(fromOffset));
        toBufferView.setUint16(toOffset + 2, fromBufferView.getUint16(fromOffset + 2));
        toBufferView.setUint16(toOffset + 4, fromBufferView.getUint16(fromOffset + 4));
    }
    
    // Scale from [0,255] to [0,1]
    public static getFuzz(bufferView: DataView, index: number) {
        const offset = UnitVertex.SIZE_BYTES * index + this.FUZZ_OFFSET_BYTES;
        return bufferView.getUint8(offset) / 0xff;
    }
    // Scale from [0,1] to [0,255]
    public static setFuzz(bufferView: DataView, index: number, value: number) {
        const offset = UnitVertex.SIZE_BYTES * index + this.FUZZ_OFFSET_BYTES;
        bufferView.setUint8(offset, value * 0xff);
    }
    public static copyFuzz(fromBufferView: DataView, fromIndex: number, toBufferView: DataView, toIndex: number) {
        toBufferView.setUint8(UnitVertex.SIZE_BYTES * toIndex + this.FUZZ_OFFSET_BYTES, fromBufferView.getUint8(UnitVertex.SIZE_BYTES * fromIndex + this.FUZZ_OFFSET_BYTES));
    }
    // Scale from [0,255] to [0,1]
    public static getMatGloss(bufferView: DataView, index: number) {
        const offset = UnitVertex.SIZE_BYTES * index + this.GLOSS_OFFSET_BYTES;
        return bufferView.getUint8(offset) / 0xff;
    }
    // Scale from [0,1] to [0,255]
    public static setGloss(bufferView: DataView, index: number, value: number) {
        const offset = UnitVertex.SIZE_BYTES * index + this.GLOSS_OFFSET_BYTES;
        bufferView.setUint8(offset, value * 0xff);
    }
    public static copyGloss(fromBufferView: DataView, fromIndex: number, toBufferView: DataView, toIndex: number) {
        toBufferView.setUint8(UnitVertex.SIZE_BYTES * toIndex + this.GLOSS_OFFSET_BYTES, fromBufferView.getUint8(UnitVertex.SIZE_BYTES * fromIndex + this.GLOSS_OFFSET_BYTES));
    }
    public static getDensity(bufferView: DataView, index: number): number {
        return bufferView.getFloat32(UnitVertex.SIZE_BYTES * index + this.DENSITY_OFFSET_BYTES, true);
    }
    public static setDensity(bufferView: DataView, index: number, value: number) {
        bufferView.setFloat32(UnitVertex.SIZE_BYTES * index + this.DENSITY_OFFSET_BYTES, value, true);
    }
    public static copyDensity(fromBufferView: DataView, fromIndex: number, toBufferView: DataView, toIndex: number) {
        toBufferView.setFloat32(UnitVertex.SIZE_BYTES * toIndex + this.DENSITY_OFFSET_BYTES, fromBufferView.getFloat32(UnitVertex.SIZE_BYTES * fromIndex + this.DENSITY_OFFSET_BYTES, true), true);
    }
    public static getRefractiveIndex(bufferView: DataView, index: number): number {
        return bufferView.getFloat32(UnitVertex.SIZE_BYTES * index + this.REFRACTIVE_INDEX_OFFSET_BYTES, true);
    }
    public static setRefractiveIndex(bufferView: DataView, index: number, value: number) {
        bufferView.setFloat32(UnitVertex.SIZE_BYTES * index + this.REFRACTIVE_INDEX_OFFSET_BYTES, value, true);
    }
    public static copyRefractiveIndex(fromBufferView: DataView, fromIndex: number, toBufferView: DataView, toIndex: number) {
        toBufferView.setFloat32(UnitVertex.SIZE_BYTES * toIndex + this.REFRACTIVE_INDEX_OFFSET_BYTES, fromBufferView.getFloat32(UnitVertex.SIZE_BYTES * fromIndex + this.REFRACTIVE_INDEX_OFFSET_BYTES, true), true);
    }
    // Scale from [0,255] to [0,1]
    public static getSegColor(bufferView: DataView, index: number, value: ColorRGBA) {
        const offset = UnitVertex.SIZE_BYTES * index + this.SEG_COLOR_OFFSET_BYTES;
        value[0] = bufferView.getUint8(offset) / 0xff;
        value[1] = bufferView.getUint8(offset + 1) / 0xff
        value[2] = bufferView.getUint8(offset + 2) / 0xff;
        value[3] = bufferView.getUint8(offset + 3) / 0xff
    }
    // Scale from [0,1] to [0,255]
    public static setSegColor(bufferView: DataView, index: number, value: ColorRGBA) {
        const offset = UnitVertex.SIZE_BYTES * index + this.SEG_COLOR_OFFSET_BYTES;
        bufferView.setUint8(offset, value[0] * 0xff);
        bufferView.setUint8(offset + 1, value[1] * 0xff);
        bufferView.setUint8(offset + 2, value[2] * 0xff);
        bufferView.setUint8(offset + 3, value[3] * 0xff);
    }
    public static copySegColor(fromBufferView: DataView, fromIndex: number, toBufferView: DataView, toIndex: number) {
        const fromOffset = UnitVertex.SIZE_BYTES * fromIndex + this.SEG_COLOR_OFFSET_BYTES;
        const toOffset = UnitVertex.SIZE_BYTES * toIndex + this.SEG_COLOR_OFFSET_BYTES;
        toBufferView.setUint8(toOffset, fromBufferView.getUint8(fromOffset));
        toBufferView.setUint8(toOffset + 1, fromBufferView.getUint8(fromOffset + 1));
        toBufferView.setUint8(toOffset + 2, fromBufferView.getUint8(fromOffset + 2));
        toBufferView.setUint8(toOffset + 3, fromBufferView.getUint8(fromOffset + 3));
    }
}
