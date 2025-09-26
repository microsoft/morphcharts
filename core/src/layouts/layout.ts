import { IBuffer } from "../buffer.js";
import { ColorRGBA } from "../color.js";
import { Config } from "../config.js";
import { TextureType } from "../hittable.js";
import { Material } from "../material.js";
import { Quaternion, Vector3, Vector4 } from "../matrix.js";
import { UnitVertex } from "../vertex.js";

export interface ILayoutOptions {
    offset?: number;
    count?: number;
}

export interface IVertexOptions {
    offset?: number;
    count?: number;

    // Bounds
    minBoundsX?: number;
    minBoundsY?: number;
    minBoundsZ?: number;
    maxBoundsX?: number;
    maxBoundsY?: number;
    maxBoundsZ?: number;

    // Reverse
    reverseX?: boolean;
    reverseY?: boolean;
    reverseZ?: boolean;

    // Selected
    selected?: Set<number>;

    // Hover
    hoverIds?: ArrayLike<number>;

    // Stagger
    staggerOrder?: number;
    staggerOrders?: ArrayLike<number>;
    minStaggerOrder?: number;
    maxStaggerOrder?: number;
    staggerOrderReverse?: boolean;

    // Facets
    facetCoordsX?: ArrayLike<number>;
    facetCoordsY?: ArrayLike<number>;
    facetCoordsZ?: ArrayLike<number>;
    facetSpacingX?: number;
    facetSpacingY?: number;
    facetSpacingZ?: number;
    facetsX?: number; // 1-based
    facetsY?: number; // 1-based
    facetsZ?: number; // 1-based

    // Texture
    textureType?: number;
    texCoord?: Vector4;
    texCoords?: ArrayLike<number>;
    texScale?: Vector4;
    texScales?: ArrayLike<number>;
    texOffset?: Vector4;
    texOffsets?: ArrayLike<number>;

    // Sdf
    sdfBuffer?: number;
    sdfBuffers?: ArrayLike<number>;
    sdfHalo?: number;
    sdfHalos?: ArrayLike<number>;

    // Material
    material?: Material;
    materials?: Material[];

    // Segment
    segmentColor?: ColorRGBA;
    segmentColors?: ColorRGBA[];

    // Unit-type specific params (scale-independent)
    params?: { index: number, values: ArrayLike<number> }[];
}

export abstract class LayoutBase {
    protected _positions: Float32Array;
    protected _sizes: Float32Array;
    protected _rotations: Float32Array;
    protected _roundings: Float32Array;

    // Maximum dimension of the model bounds, used to scale model units to unit cube
    protected _maxBounds: number;

    // Scaling of model units to unit cube
    protected _boundsScaling: number;

    // The layout bounds are calculated during layout
    public minLayoutBoundsX: number;
    public minLayoutBoundsY: number;
    public minLayoutBoundsZ: number;
    public maxLayoutBoundsX: number;
    public maxLayoutBoundsY: number;
    public maxLayoutBoundsZ: number;
    public minCumulativeLayoutBoundsX: number;
    public minCumulativeLayoutBoundsY: number;
    public minCumulativeLayoutBoundsZ: number;
    public maxCumulativeLayoutBoundsX: number;
    public maxCumulativeLayoutBoundsY: number;
    public maxCumulativeLayoutBoundsZ: number;

    // The model bounds are used when updating vertices to normalize layout to unit cube, same units as layout bounds
    public modelOriginX: number;
    public modelOriginY: number;
    public modelOriginZ: number;
    public minModelBoundsX: number;
    public minModelBoundsY: number;
    public minModelBoundsZ: number;
    public maxModelBoundsX: number;
    public maxModelBoundsY: number;
    public maxModelBoundsZ: number;

    // Facets
    protected _isFacetted: boolean;
    protected _facetSpacingX: number;
    protected _facetSpacingY: number;
    protected _facetSpacingZ: number;
    protected _facetSizeX: number;
    protected _facetSizeY: number;
    protected _facetSizeZ: number;
    protected _facetsX: number;
    protected _facetsY: number;
    protected _facetsZ: number;
    protected _facetScaling: number;
    public get facetScaling() { return this._facetScaling; }
    public offsetX(facetCoordX: number) { return (((facetCoordX + 0.5) / this._facetsX) - 0.5) * (this.maxModelBoundsX - this.minModelBoundsX) / this._maxBounds; }
    public offsetY(facetCoordY: number) { return (((facetCoordY + 0.5) / this._facetsY) - 0.5) * (this.maxModelBoundsY - this.minModelBoundsY) / this._maxBounds; }
    public offsetZ(facetCoordZ: number) { return (((facetCoordZ + 0.5) / this._facetsZ) - 0.5) * (this.maxModelBoundsZ - this.minModelBoundsZ) / this._maxBounds; }

    constructor() {
        // Origin
        this.modelOriginX = 0;
        this.modelOriginY = 0;
        this.modelOriginZ = 0;

        // Bounds
        this.minModelBoundsX = 0;
        this.minModelBoundsY = 0;
        this.minModelBoundsZ = 0;
        this.maxModelBoundsX = 0;
        this.maxModelBoundsY = 0;
        this.maxModelBoundsZ = 0;
        this.minLayoutBoundsX = 0;
        this.minLayoutBoundsY = 0;
        this.minLayoutBoundsZ = 0;
        this.maxLayoutBoundsX = 0;
        this.maxLayoutBoundsY = 0;
        this.maxLayoutBoundsZ = 0;

        // Facets
        this._facetSpacingX = 0;
        this._facetSpacingY = 0;
        this._facetSpacingZ = 0;
        this._facetSizeX = 0;
        this._facetSizeY = 0;
        this._facetSizeZ = 0;
        this._facetsX = 1;
        this._facetsY = 1;
        this._facetsZ = 1;
    }

    protected _updateModelBounds(options: IVertexOptions) {
        this.minModelBoundsX = options.minBoundsX == undefined ? this.minLayoutBoundsX : options.minBoundsX;
        this.minModelBoundsY = options.minBoundsY == undefined ? this.minLayoutBoundsY : options.minBoundsY;
        this.minModelBoundsZ = options.minBoundsZ == undefined ? this.minLayoutBoundsZ : options.minBoundsZ;
        this.maxModelBoundsX = options.maxBoundsX == undefined ? this.maxLayoutBoundsX : options.maxBoundsX;
        this.maxModelBoundsY = options.maxBoundsY == undefined ? this.maxLayoutBoundsY : options.maxBoundsY;
        this.maxModelBoundsZ = options.maxBoundsZ == undefined ? this.maxLayoutBoundsZ : options.maxBoundsZ;

        // Facets
        this._isFacetted =
            (options.facetsX !== undefined && options.facetsX > 1 && options.facetCoordsX != null) ||
            (options.facetsY !== undefined && options.facetsY > 1 && options.facetCoordsY != null) ||
            (options.facetsZ !== undefined && options.facetsZ > 1 && options.facetCoordsZ != null);
        this._facetSpacingX = options.facetSpacingX == undefined ? 0 : options.facetSpacingX;
        this._facetSpacingY = options.facetSpacingY == undefined ? 0 : options.facetSpacingY;
        this._facetSpacingZ = options.facetSpacingZ == undefined ? 0 : options.facetSpacingZ;
        let modelSizeX = this.maxModelBoundsX - this.minModelBoundsX;
        let modelSizeY = this.maxModelBoundsY - this.minModelBoundsY;
        let modelSizeZ = this.maxModelBoundsZ - this.minModelBoundsZ;
        const maxBounds = Math.max(modelSizeX, Math.max(modelSizeY, modelSizeZ));
        this._facetSizeX = modelSizeX;
        this._facetSizeY = modelSizeY;
        this._facetSizeZ = modelSizeZ;
        this._facetsX = options.facetCoordsX ? options.facetsX : 1;
        this._facetsY = options.facetCoordsY ? options.facetsY : 1;
        this._facetsZ = options.facetCoordsZ ? options.facetsZ : 1;

        // Grow model bounds to a grid of facets
        this.minModelBoundsX -= this._facetSizeX * this._facetSpacingX / 2;
        this.minModelBoundsY -= this._facetSizeY * this._facetSpacingY / 2;
        this.minModelBoundsZ -= this._facetSizeZ * this._facetSpacingZ / 2;
        this.maxModelBoundsX = this.minModelBoundsX + this._facetsX * this._facetSizeX * (1 + this._facetSpacingX);
        this.maxModelBoundsY = this.minModelBoundsY + this._facetsY * this._facetSizeY * (1 + this._facetSpacingY);
        this.maxModelBoundsZ = this.minModelBoundsZ + this._facetsZ * this._facetSizeZ * (1 + this._facetSpacingZ);

        // Origin
        this.modelOriginX = (this.minModelBoundsX + this.maxModelBoundsX) / 2;
        this.modelOriginY = (this.minModelBoundsY + this.maxModelBoundsY) / 2;
        this.modelOriginZ = (this.minModelBoundsZ + this.maxModelBoundsZ) / 2;

        // Size
        modelSizeX = this.maxModelBoundsX - this.minModelBoundsX;
        modelSizeY = this.maxModelBoundsY - this.minModelBoundsY;
        modelSizeZ = this.maxModelBoundsZ - this.minModelBoundsZ;

        // Scaling
        this._maxBounds = Math.max(modelSizeX, Math.max(modelSizeY, modelSizeZ));
        this._boundsScaling = this._maxBounds == 0 ? 1 : 1 / this._maxBounds;
        this._facetScaling = maxBounds / this._maxBounds;
    }

    protected _updateCumulativeLayoutBounds() {
        this.minCumulativeLayoutBoundsX = this.minCumulativeLayoutBoundsX == undefined ? this.minLayoutBoundsX : Math.min(this.minCumulativeLayoutBoundsX, this.minLayoutBoundsX);
        this.minCumulativeLayoutBoundsY = this.minCumulativeLayoutBoundsY == undefined ? this.minLayoutBoundsY : Math.min(this.minCumulativeLayoutBoundsY, this.minLayoutBoundsY);
        this.minCumulativeLayoutBoundsZ = this.minCumulativeLayoutBoundsZ == undefined ? this.minLayoutBoundsZ : Math.min(this.minCumulativeLayoutBoundsZ, this.minLayoutBoundsZ);
        this.maxCumulativeLayoutBoundsX = this.maxCumulativeLayoutBoundsX == undefined ? this.maxLayoutBoundsX : Math.max(this.maxCumulativeLayoutBoundsX, this.maxLayoutBoundsX);
        this.maxCumulativeLayoutBoundsY = this.maxCumulativeLayoutBoundsY == undefined ? this.maxLayoutBoundsY : Math.max(this.maxCumulativeLayoutBoundsY, this.maxLayoutBoundsY);
        this.maxCumulativeLayoutBoundsZ = this.maxCumulativeLayoutBoundsZ == undefined ? this.maxLayoutBoundsZ : Math.max(this.maxCumulativeLayoutBoundsZ, this.maxLayoutBoundsZ);
    }

    public resetCumulativeLayoutBounds() {
        this.minCumulativeLayoutBoundsX = undefined;
        this.minCumulativeLayoutBoundsY = undefined;
        this.minCumulativeLayoutBoundsZ = undefined;
        this.maxCumulativeLayoutBoundsX = undefined;
        this.maxCumulativeLayoutBoundsY = undefined;
        this.maxCumulativeLayoutBoundsZ = undefined;
    }

    public update(buffer: IBuffer, ids: ArrayLike<number>, options: IVertexOptions) {
        const offset = options.offset == undefined ? 0 : options.offset;
        const count = options.count == undefined ? ids.length : options.count;
        const reverseX = options.reverseX == undefined ? false : options.reverseX;
        const reverseY = options.reverseY == undefined ? false : options.reverseY;
        const reverseZ = options.reverseZ == undefined ? false : options.reverseZ;

        // Update
        const position: Vector3 = [0, 0, 0];
        const size: Vector3 = [0, 0, 0];
        const rotation: Quaternion = [0, 0, 0, 0];
        const texCoord: Vector4 = [0, 0, 0, 0];
        const texOffset: Vector4 = [0, 0, 0, 0];
        const texScale: Vector4 = [0, 0, 0, 0];
        const lookup = buffer.lookup;
        const dataView = buffer.dataView;
        for (let i = 0; i < count; i++) {
            const id = ids[i + offset];
            const index = lookup[id];

            // Position
            let positionX = this._positions[index * 3];
            let positionY = this._positions[index * 3 + 1];
            let positionZ = this._positions[index * 3 + 2];
            if (this._isFacetted) {
                if (reverseX) { positionX = this.minModelBoundsX + this.minModelBoundsX + this._facetSizeX * (1 + this._facetSpacingX) - positionX; }
                if (reverseY) { positionY = this.minModelBoundsY + this.minModelBoundsY + this._facetSizeY * (1 + this._facetSpacingY) - positionY; }
                if (reverseZ) { positionZ = this.minModelBoundsZ + this.minModelBoundsZ + this._facetSizeZ * (1 + this._facetSpacingZ) - positionZ; }
                const facetX = options.facetCoordsX ? options.facetCoordsX[id] : 0;
                const facetY = options.facetCoordsY ? options.facetCoordsY[id] : 0;
                const facetZ = options.facetCoordsZ ? options.facetCoordsZ[id] : 0;
                positionX += facetX * this._facetSizeX * (1 + this._facetSpacingX);
                positionY += facetY * this._facetSizeY * (1 + this._facetSpacingY);
                positionZ += facetZ * this._facetSizeZ * (1 + this._facetSpacingZ);
            }
            else {
                if (reverseX) { positionX = this.minModelBoundsX + this.maxModelBoundsX - positionX; }
                if (reverseY) { positionY = this.minModelBoundsY + this.maxModelBoundsY - positionY; }
                if (reverseZ) { positionZ = this.minModelBoundsZ + this.maxModelBoundsZ - positionZ; }
            }
            position[0] = (positionX - this.modelOriginX) * this._boundsScaling;
            position[1] = (positionY - this.modelOriginY) * this._boundsScaling;
            position[2] = (positionZ - this.modelOriginZ) * this._boundsScaling;
            UnitVertex.setTranslation(dataView, index, position);

            // Size
            size[0] = this._sizes[index * 3] * this._boundsScaling;
            size[1] = this._sizes[index * 3 + 1] * this._boundsScaling;
            size[2] = this._sizes[index * 3 + 2] * this._boundsScaling;
            UnitVertex.setScale(dataView, index, size);

            // Rounding
            UnitVertex.setRounding(dataView, index, this._roundings[index] * this._boundsScaling);

            // Rotation
            rotation[0] = this._rotations[index * 4];
            rotation[1] = this._rotations[index * 4 + 1];
            rotation[2] = this._rotations[index * 4 + 2];
            rotation[3] = this._rotations[index * 4 + 3];
            if (reverseX) {
                rotation[1] = -rotation[1];
                rotation[2] = -rotation[2];
            }
            if (reverseY) {
                rotation[0] = -rotation[0];
                rotation[2] = -rotation[2];
            }
            if (reverseZ) {
                rotation[0] = -rotation[0];
                rotation[1] = -rotation[1];
            }
            UnitVertex.setRotation(dataView, index, rotation);

            // Hover
            UnitVertex.setIdHover(dataView, index, options.hoverIds ? options.hoverIds[id] : id);

            // Selected
            const selection = options.selected && options.selected.size > 0;
            UnitVertex.setSelected(dataView, index, selection ? options.selected.has(id) ? 1 : -1 : 0);

            // TODO: Stagger order

            // Parameters (scaling-independent)
            if (options.params) {
                for (let j = 0; j < Math.min(options.params.length, UnitVertex.PARAM_COUNT); j++) {
                    const param = options.params[j];
                    UnitVertex.setParam(dataView, index, param.values[id], param.index);
                }
            }

            // SDF
            UnitVertex.setSdfBuffer(dataView, index, options.sdfBuffer ? options.sdfBuffer : options.sdfBuffers ? options.sdfBuffers[id] : Config.sdfBuffer);
            UnitVertex.setSdfHalo(dataView, index, options.sdfHalo ? options.sdfHalo : options.sdfHalos ? options.sdfHalos[id] : Config.sdfHalo);

            // Materials
            const material = options.material || (options.materials && options.materials[id]);
            if (material) { UnitVertex.setMaterial(dataView, index, material); }

            // Texture
            UnitVertex.setTextureType(dataView, index, options.textureType | TextureType.solidColor);
            texCoord[0] = options.texCoord ? options.texCoord[0] : options.texCoords ? options.texCoords[id * 4] : 0;
            texCoord[1] = options.texCoord ? options.texCoord[1] : options.texCoords ? options.texCoords[id * 4 + 1] : 0;
            texCoord[2] = options.texCoord ? options.texCoord[2] : options.texCoords ? options.texCoords[id * 4 + 2] : 1;
            texCoord[3] = options.texCoord ? options.texCoord[3] : options.texCoords ? options.texCoords[id * 4 + 3] : 1;
            UnitVertex.setTexCoords(dataView, index, texCoord);
            texOffset[0] = options.texOffset ? options.texOffset[0] : options.texOffsets ? options.texOffsets[id * 4] : 0;
            texOffset[1] = options.texOffset ? options.texOffset[1] : options.texOffsets ? options.texOffsets[id * 4 + 1] : 0;
            texOffset[2] = options.texOffset ? options.texOffset[2] : options.texOffsets ? options.texOffsets[id * 4 + 2] : 0;
            texOffset[3] = options.texOffset ? options.texOffset[3] : options.texOffsets ? options.texOffsets[id * 4 + 3] : 0;
            UnitVertex.setTexOffset(dataView, index, texOffset);
            texScale[0] = options.texScale ? options.texScale[0] : options.texScales ? options.texScales[id * 4] : 1;
            texScale[1] = options.texScale ? options.texScale[1] : options.texScales ? options.texScales[id * 4 + 1] : 1;
            texScale[2] = options.texScale ? options.texScale[2] : options.texScales ? options.texScales[id * 4 + 2] : 1;
            texScale[3] = options.texScale ? options.texScale[3] : options.texScales ? options.texScales[id * 4 + 3] : 1;
            UnitVertex.setTexScale(dataView, index, texScale);

            // Segment
            UnitVertex.setSegColor(dataView, index, options.segmentColor ? options.segmentColor : options.segmentColors ? options.segmentColors[id] : [buffer.idColors[id * 4], buffer.idColors[id * 4 + 1], buffer.idColors[id * 4 + 2], buffer.idColors[id * 4 + 3]]);
        }
    }
}