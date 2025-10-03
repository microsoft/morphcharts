// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import { Constants } from "./constants.js";
import { Vector2, Vector3 } from "./matrix.js";

export interface IHexBinOptions {
    ids: ArrayLike<number>; // Ids to bin, length <= values.length, but any id must be < values.length (i.e. start with zero-based contiguous array before any filtering)
    valuesX: ArrayLike<number>; // Un-filtered x values
    valuesY: ArrayLike<number>; // Un-filtered y values
    minValueX: number;
    minValueY: number;
    maxValueX: number;
    maxValueY: number;
    binsX: number; // Requested x bins
    binIds: Uint32Array; // Array to receive bin ids, of length valuesX, valuesY
    offset?: number;
    count?: number;
}

export interface IHexBinResult {
    binIds: Uint32Array; // Which bin did the id end up in, of length valuesX, valuesY
    positionsX: ArrayLike<number>; // Bin x positions, of length (non-empty bins)
    positionsY: ArrayLike<number>; // Bin y positions, of length (non-empty bins)
    counts: Uint32Array; // Number of items in each bin, of length (non-empty bins). Float32Array so I can bind this directly to unit size for a histogram.
    minCount: number; // Min non-zero count per bin
    maxCount: number; // Max count per bin
    orientation: string; // "pointyTop", "flatTop"
    size: number; // Distance from center to any corner
    lookup: { [index: number]: number };
    binsY: number;
}

export class Hex {
    //
    //       +---> .---------.
    //       |    /           \
    //       |   /             \
    //  height  <       o       >
    //       |   \             /
    //       |    \           /
    //       +---> '---------'
    //          ^               ^
    //          |               |
    //          ^-----size------+
    //          +-----width-----+
    // 
    //       +--->     .'.     <---+
    //       |       /     \       |
    //       |    /           \    |
    //       |  |               |  |
    //  height  |       o       |  size
    //       |  |               |  |
    //       |    \           /    |
    //       |       \     /       |
    //       +--->     '.'     <---+
    //          ^               ^
    //          |               |
    //          +-----width-----+
    // 
    //
    public static width(size: number, orientation: string) {
        if (orientation == "pointyTop") {
            return Constants.ROOT_THREE * size;
        }
        else {
            // "flatTop"
            return 2 * size;
        }
    }

    public static height(size: number, orientation: string) {
        if (orientation == "pointyTop") {
            return 2 * size;
        }
        else {
            // "flatTop"
            return Constants.ROOT_THREE * size;
        }
    }

    public static pointyHexCorner(center: Vector2, size: number, i: number, position: Vector2) {
        const angleDegrees = 60 * i + 30;
        const angleRadians = Constants.RADIANS_PER_DEGREE * angleDegrees;
        position[0] = center[0] + size * Math.cos(angleRadians);
        position[1] = center[1] + size * Math.sin(angleRadians);
    }

    public static cubeToAxial(cube: Vector3, hex: Vector2) {
        hex[0] = cube[0]; // x
        hex[1] = cube[2]; // z
    }

    public static axialToCube(hex: Vector2, cube: Vector3) {
        const x = hex[0]; // q
        const z = hex[1]; // r
        const y = -x - z;
        cube[0] = x;
        cube[1] = y;
        cube[2] = z;
    }

    public static cubeToOddr(cube: Vector3, hex: Vector2) {
        const col = cube[0] + (cube[2] - (cube[2] & 1)) / 2;
        const row = cube[2];
        hex[0] = col;
        hex[1] = row;
    }

    public static oddrToCube(hex: Vector2, cube: Vector3) {
        const x = hex[0] - (hex[1] - (hex[1] & 1)) / 2;
        const z = hex[1];
        const y = -x - z
        cube[0] = x;
        cube[1] = y;
        cube[2] = z;
    }

    public static pointyHexToPixel(hex: Vector2, size: number, point: Vector2) {
        point[0] = size * (Constants.ROOT_THREE * hex[0] + Constants.ROOT_THREE / 2 * hex[1]);
        point[1] = size * (3 / 2 * hex[1]);
    }

    public static pixelToPointyHex(point: Vector2, size: number, hex: Vector2) {
        hex[0] = (Constants.ROOT_THREE / 3 * point[0] - 1 / 3 * point[1]) / size;
        hex[1] = (2 / 3 * point[1]) / size;
        this.hexRound(hex, hex);
    }

    public static hexRound(hex: Vector2, hexRound: Vector2) {
        const cube: Vector3 = [0, 0, 0];
        this.axialToCube(hex, cube);
        this.cubeRound(cube, cube);
        this.cubeToAxial(cube, hexRound);
    }

    public static cubeRound(cube: Vector3, cubeRound: Vector3) {
        let rx = Math.round(cube[0]);
        let ry = Math.round(cube[1]);
        let rz = Math.round(cube[2]);
        const x_diff = Math.abs(rx - cube[0]);
        const y_diff = Math.abs(ry - cube[1]);
        const z_diff = Math.abs(rz - cube[2]);
        if (x_diff > y_diff && x_diff > z_diff) {
            rx = -ry - rz;
        }
        else if (y_diff > z_diff) {
            ry = -rx - rz;
        }
        else {
            rz = -rx - ry;
        }
        cubeRound[0] = rx;
        cubeRound[1] = ry;
        cubeRound[2] = rz;
    }

    /**
     * Point-top hex binning
     * For binning pointy-top, should use width = (maxValueX - minValueX) / binsX
     * Increase the binX by +1, so that requested binsX fit within bounds, but half a bin can spill outside of bounds
     * e.g. for binning a 94 unit-wide area along the length, request 94 bins so each bin is 1 unit, but could actually see alternating rows of 94, 95 bins. Each bin is still 1 unit wide.
     * Subtract (width / 2) from minBoundsX to give left-bounds (bin from center to center)
     * Add (width / 2) to maxBoundsX to give right bounds (bin from center to center)
     * height = (maxValueY - minValueY)
     * binsY = ceil(height / heightBetweenCenters) + 1, places centers on bounds
     * @param options 
     * @returns list of bins ids, and an array of bin x,y positions for non-empty bins
     */
    public static bin(options: IHexBinOptions): IHexBinResult {
        const offset = options.offset == undefined ? 0 : options.offset;
        const count = options.count == undefined ? options.ids.length : options.count;
        const width = (options.maxValueX - options.minValueX) / options.binsX;
        const minValueX = options.minValueX - width / 2;
        const binsX = options.binsX + 1;
        const size = width / Constants.ROOT_THREE; // Distance from center to any corner
        const height = 2 * size;
        const heightBetweenCenters = 3 * height / 4;
        const binsY = Math.ceil((options.maxValueY - options.minValueY) / heightBetweenCenters) + 1;
        const minValueY = options.minValueY;

        // Bounds
        // const maxBounds = Math.max(options.maxValueX - options.minValueX, options.maxValueY - options.minValueY);

        // Hex size
        // const width = maxBounds / (options.binsX - 1); // Measure between centers of left, right pointy-top hex
        // const size = width / this.ROOT_THREE; // Distance from center to any corner
        // const height = 2 * size;
        // const heightBetweenCenters = 3 * height / 4;

        // Vertical bins
        // const binsY = Math.ceil((options.maxValueY - options.minValueY) / heightBetweenCenters) + 1; // Add 1 to place centers at top, bottom row

        // Bin
        const minQ = -Math.floor(binsY / 2);
        // const maxBins = (options.binsX - minQ) * binsY;
        const maxBins = (binsX - minQ) * binsY;
        const binCounts = new Float32Array(maxBins);
        const binLookup = new Uint32Array(maxBins);
        const binIds = new Uint32Array(options.valuesX.length);
        const point: Vector2 = [0, 0];
        const hex: Vector2 = [0, 0];
        let nonEmptyBins = 0;
        let minCount = Number.MAX_VALUE;
        let maxCount = -Number.MAX_VALUE;
        for (let i = 0; i < count; i++) {
            const id = options.ids[i + offset];
            // point[0] = options.valuesX[id] - options.minValueX;
            // point[1] = options.valuesY[id] - options.minValueY;
            point[0] = options.valuesX[id] - minValueX;
            point[1] = options.valuesY[id] - minValueY;
            this.pixelToPointyHex(point, size, hex);
            const q = hex[0] - minQ;
            const r = hex[1];
            // const binId = q + r * (options.binsX - minQ);
            const binId = q + r * (binsX - minQ);
            if (binCounts[binId] == 0) {
                binLookup[binId] = nonEmptyBins;
                nonEmptyBins++;
            }
            binCounts[binId]++;
            binIds[id] = binId;
            minCount = Math.min(minCount, binCounts[binId]);
            maxCount = Math.max(maxCount, binCounts[binId]);
        }
        const positionsX = new Float32Array(nonEmptyBins);
        const positionsY = new Float32Array(nonEmptyBins);
        const counts = new Uint32Array(nonEmptyBins);
        const lookup: { [index: number]: number } = {};
        for (let i = 0; i < maxBins; i++) {
            const count = binCounts[i];
            if (count > 0) {
                const index = binLookup[i];
                lookup[i] = index;
                counts[index] = count;
                // const q = i % (options.binsX - minQ);
                // const r = Math.floor(i / (options.binsX - minQ));
                const q = i % (binsX - minQ);
                const r = Math.floor(i / (binsX - minQ));
                hex[0] = q + minQ;
                hex[1] = r;
                this.pointyHexToPixel(hex, size, point);
                // positionsX[index] = point[0] + options.minValueX;
                // positionsY[index] = point[1] + options.minValueY;
                positionsX[index] = point[0] + minValueX;
                positionsY[index] = point[1] + minValueY;
            }
        }
        const result: IHexBinResult = {
            binIds: binIds,
            positionsX: positionsX,
            positionsY: positionsY,
            counts: counts,
            minCount: minCount,
            maxCount: maxCount,
            orientation: "pointyTop",
            size: size,
            lookup: lookup,
            binsY: binsY,
        };
        return result;
    }
}