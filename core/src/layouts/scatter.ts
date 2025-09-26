import { IBuffer } from "../buffer.js";
import { quaternion, Quaternion, Vector3 } from "../matrix.js";
import { Time } from "../time.js";
import { LayoutBase, ILayoutOptions, IVertexOptions } from "./layout.js";

export interface IScatterLayoutOptions extends ILayoutOptions {
    positionsX?: ArrayLike<number>;
    positionsY?: ArrayLike<number>;
    positionsZ?: ArrayLike<number>;
    positionScalingX?: number;
    positionScalingY?: number;
    positionScalingZ?: number;
    size?: number;
    sizes?: ArrayLike<number>;
    sizesX?: ArrayLike<number>;
    sizesY?: ArrayLike<number>;
    sizesZ?: ArrayLike<number>;
    sizeScaling?: number;
    sizeScalingX?: number;
    sizeScalingY?: number;
    sizeScalingZ?: number;
    minSize?: Vector3;
    rotation?: Quaternion;
    rotations?: ArrayLike<number>;
    roundingScaling?: number; // TODO: Define scaling in size-units?
    rounding?: number;
    roundings?: ArrayLike<number>;
}

export interface IScatterVertexOptions extends IVertexOptions { }

export class Scatter extends LayoutBase {
    public layout(buffer: IBuffer, ids: ArrayLike<number>, options: IScatterLayoutOptions) {
        const start = performance.now();
        const offset = options.offset == undefined ? 0 : options.offset;
        const count = options.count == undefined ? ids.length : options.count;
        const positionScalingX = options.positionScalingX == undefined ? 1 : options.positionScalingX;
        const positionScalingY = options.positionScalingY == undefined ? 1 : options.positionScalingY;
        const positionScalingZ = options.positionScalingZ == undefined ? 1 : options.positionScalingZ;
        const sizeScalingX = options.sizeScaling == undefined ? options.sizeScalingX == undefined ? 1 : options.sizeScalingX : options.sizeScaling;
        const sizeScalingY = options.sizeScaling == undefined ? options.sizeScalingY == undefined ? 1 : options.sizeScalingY : options.sizeScaling;
        const sizeScalingZ = options.sizeScaling == undefined ? options.sizeScalingZ == undefined ? 1 : options.sizeScalingZ : options.sizeScaling;
        const sizesX = options.sizes ? options.sizes : options.sizesX;
        const sizesY = options.sizes ? options.sizes : options.sizesY;
        const sizesZ = options.sizes ? options.sizes : options.sizesZ;
        const minSizeX = options.minSize ? options.minSize[0] : 0;
        const minSizeY = options.minSize ? options.minSize[1] : 0;
        const minSizeZ = options.minSize ? options.minSize[2] : 0;
        const roundingScaling = options.roundingScaling == undefined ? 1 : options.roundingScaling;
        const _rotation: Quaternion = options.rotation ? options.rotation : quaternion.createIdentity();

        // Re-use working arrays, expand if not big enough
        if (!this._positions || this._positions.length < buffer.length * 3) {
            this._positions = new Float32Array(buffer.length * 3);
            this._sizes = new Float32Array(buffer.length * 3);
            this._roundings = new Float32Array(buffer.length);
            this._rotations = new Float32Array(buffer.length * 4);
        }

        // Bounds
        this.minLayoutBoundsX = Number.MAX_VALUE;
        this.minLayoutBoundsY = Number.MAX_VALUE;
        this.minLayoutBoundsZ = Number.MAX_VALUE;
        this.maxLayoutBoundsX = -Number.MAX_VALUE;
        this.maxLayoutBoundsY = -Number.MAX_VALUE;
        this.maxLayoutBoundsZ = -Number.MAX_VALUE;

        // Layout
        const lookup = buffer.lookup;
        for (let i = 0; i < count; i++) {
            const id = ids[i + offset];
            const index = lookup[id];

            // Position
            let positionX = options.positionsX ? options.positionsX[id] * positionScalingX : 0;
            let positionY = options.positionsY ? options.positionsY[id] * positionScalingY : 0;
            let positionZ = options.positionsZ ? options.positionsZ[id] * positionScalingZ : 0;
            this._positions[index * 3] = positionX;
            this._positions[index * 3 + 1] = positionY;
            this._positions[index * 3 + 2] = positionZ;

            // Size
            let sizeX = Math.max((options.size ? options.size : sizesX ? Math.abs(sizesX[id]) : 1) * sizeScalingX, minSizeX);
            let sizeY = Math.max((options.size ? options.size : sizesY ? Math.abs(sizesY[id]) : 1) * sizeScalingY, minSizeY);
            let sizeZ = Math.max((options.size ? options.size : sizesZ ? Math.abs(sizesZ[id]) : 1) * sizeScalingZ, minSizeZ);
            this._sizes[index * 3] = sizeX;
            this._sizes[index * 3 + 1] = sizeY;
            this._sizes[index * 3 + 2] = sizeZ;

            // Rounding
            this._roundings[index] = (options.rounding ? options.rounding : options.roundings ? Math.abs(options.roundings[id]) : 0) * roundingScaling;

            // Rotation
            if (options.rotations) {
                _rotation[0] = options.rotations[id * 4];
                _rotation[1] = options.rotations[id * 4 + 1];
                _rotation[2] = options.rotations[id * 4 + 2];
                _rotation[3] = options.rotations[id * 4 + 3];
            }
            this._rotations[index * 4] = _rotation[0];
            this._rotations[index * 4 + 1] = _rotation[1];
            this._rotations[index * 4 + 2] = _rotation[2];
            this._rotations[index * 4 + 3] = _rotation[3];

            // Bounds
            this.minLayoutBoundsX = Math.min(this.minLayoutBoundsX, positionX - sizeX * 0.5);
            this.minLayoutBoundsY = Math.min(this.minLayoutBoundsY, positionY - sizeY * 0.5);
            this.minLayoutBoundsZ = Math.min(this.minLayoutBoundsZ, positionZ - sizeZ * 0.5);
            this.maxLayoutBoundsX = Math.max(this.maxLayoutBoundsX, positionX + sizeX * 0.5);
            this.maxLayoutBoundsY = Math.max(this.maxLayoutBoundsY, positionY + sizeY * 0.5);
            this.maxLayoutBoundsZ = Math.max(this.maxLayoutBoundsZ, positionZ + sizeZ * 0.5);

            // TODO: Rotate bounding box based on size and update bounds
            if (_rotation[3] != 1) { }
        }

        // Cumulative layout bounds
        this._updateCumulativeLayoutBounds();
        console.log(`${this.constructor.name.toLowerCase()} layout ${count} rows ${Time.formatDuration(performance.now() - start)}`);
    }

    public update(buffer: IBuffer, ids: ArrayLike<number>, options: IVertexOptions): void {
        const start = performance.now();
        const count = options.count == undefined ? ids.length : options.count;

        // Bounds, facets
        this._updateModelBounds(options);

        // Update vertex buffer
        super.update(buffer, ids, options);
        console.log(`${this.constructor.name.toLowerCase()} update ${count} rows ${Time.formatDuration(performance.now() - start)}`);
    }
}