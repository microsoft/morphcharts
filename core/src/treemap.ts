// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

export interface ISquarifiedTreeMapOptions {
    ids: Uint32Array,
    sizes?: ArrayLike<number>, // If sizes are not provided, the sizes are assumed to be 1
    positionsX: Float32Array,
    positionsY: Float32Array,
    sizesX: Float32Array,
    sizesY: Float32Array,
    from: number,
    to: number,
    x: number,
    y: number,
    width: number,
    height: number,
    lookup: { [index: number]: number }
}

export class TreeMap {
    static squarifiedLayout(options: ISquarifiedTreeMapOptions) {
        if (options.from > options.to) return;
        if (options.to - options.from < 2) {
            TreeMap._sliceLayout({
                ids: options.ids,
                sizes: options.sizes,
                positionsX: options.positionsX,
                positionsY: options.positionsY,
                sizesX: options.sizesX,
                sizesY: options.sizesY,
                from: options.from,
                to: options.to,
                x: options.x,
                y: options.y,
                width: options.width,
                height: options.height,
                lookup: options.lookup,
            });
            return;
        }

        const totalSize = options.sizes ? TreeMap.totalSize(options.ids, options.sizes, options.from, options.to) : options.to - options.from + 1;
        const a = options.sizes ? options.sizes[options.ids[options.to]] / totalSize : 1 / totalSize;
        let b = a;
        let mid = options.to;
        if (options.width < options.height) {
            while (mid > options.from) {
                const aspect = TreeMap.aspect(options.height, options.width, a, b);
                const q = options.sizes ? options.sizes[options.ids[mid - 1]] / totalSize : 1 / totalSize;
                if (TreeMap.aspect(options.height, options.width, a, b + q) > aspect) {
                    break;
                }
                mid--;
                b += q;
            }
            TreeMap._sliceLayout({
                ids: options.ids,
                sizes: options.sizes,
                positionsX: options.positionsX,
                positionsY: options.positionsY,
                sizesX: options.sizesX,
                sizesY: options.sizesY,
                from: mid,
                to: options.to,
                x: options.x,
                y: options.y,
                width: options.width,
                height: options.height * b,
                lookup: options.lookup,
            });
            TreeMap.squarifiedLayout({
                ids: options.ids,
                sizes: options.sizes,
                positionsX: options.positionsX,
                positionsY: options.positionsY,
                sizesX: options.sizesX,
                sizesY: options.sizesY,
                from: options.from,
                to: mid - 1,
                x: options.x,
                y: options.y + options.height * b,
                width: options.width,
                height: options.height * (1 - b),
                lookup: options.lookup,
            });
        }
        else {
            while (mid > options.from) {
                const aspect = TreeMap.aspect(options.width, options.height, a, b);
                const q = options.sizes ? options.sizes[options.ids[mid - 1]] / totalSize : 1 / totalSize;
                if (TreeMap.aspect(options.width, options.height, a, b + q) > aspect) {
                    break;
                }
                mid--;
                b += q;
            }
            TreeMap._sliceLayout({
                ids: options.ids,
                sizes: options.sizes,
                positionsX: options.positionsX,
                positionsY: options.positionsY,
                sizesX: options.sizesX,
                sizesY: options.sizesY,
                from: mid,
                to: options.to,
                x: options.x,
                y: options.y,
                width: options.width * b,
                height: options.height,
                lookup: options.lookup,
            });
            TreeMap.squarifiedLayout({
                ids: options.ids,
                sizes: options.sizes,
                positionsX: options.positionsX,
                positionsY: options.positionsY,
                sizesX: options.sizesX,
                sizesY: options.sizesY,
                from: options.from,
                to: mid - 1,
                x: options.x + options.width * b,
                y: options.y,
                width: options.width * (1 - b),
                height: options.height,
                lookup: options.lookup,
            });
        }
    }

    public static totalSize(ids: Uint32Array, sizes: ArrayLike<number>, from: number, to: number): number {
        let size = 0;
        for (let i = from; i <= to; i++) {
            size += sizes[ids[i]];
        }
        return size;
    }

    private static _sliceLayout(options: ISquarifiedTreeMapOptions) {
        const totalSize = options.sizes ? TreeMap.totalSize(options.ids, options.sizes, options.from, options.to) : options.to - options.from + 1;
        let a = 0;
        for (let i = options.to; i >= options.from; i--) {
            const id = options.ids[i];
            const index = options.lookup[id];
            const b = options.sizes ? options.sizes[id] / totalSize : 1 / totalSize;
            if (options.width > options.height) {
                options.sizesY[index] = options.height;
                options.sizesX[index] = options.width * b;
                options.positionsY[index] = options.y + options.height / 2;
                options.positionsX[index] = options.x + options.width * a + options.width * b / 2;
            }
            else {
                options.sizesX[index] = options.width;
                options.sizesY[index] = options.height * b;
                options.positionsX[index] = options.x + options.width / 2;
                options.positionsY[index] = options.y + options.height * a + options.height * b / 2;
            }
            a += b;
        }
    }

    private static aspect(big: number, small: number, a: number, b: number): number {
        const x = (big * b) / (small * a / b);
        if (x < 1) {
            return 1 / x;
        }
        return x;
    }
}