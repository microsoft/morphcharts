// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

export interface ISquarifiedTreeMapOptions {
    ids: Uint32Array,
    sizes: ArrayLike<number>,
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
    parentSize: number,
    lookup: { [index: number]: number }
}

export class TreeMap {
    static squarifiedLayout(options: ISquarifiedTreeMapOptions) {
        // Calculate total size of children
        let totalSize = this.totalSize(options.ids, options.sizes, options.from, options.to);

        // Check if the children fill the entire space of the parent
        if (totalSize < options.parentSize) {
            // Create a slice for the children to fill the remaining space of the parent
            const sizeRatio = totalSize / options.parentSize;
            let adjustedWidth = options.width;
            let adjustedHeight = options.height;

            // Choose dimension to slice based on aspect ratio, same as squarified algorithm
            if (options.width < options.height) {
                adjustedHeight = options.height * sizeRatio;
            } else {
                adjustedWidth = options.width * sizeRatio;
            }

            // Update the options to reflect the adjusted dimensions for the children
            options.width = adjustedWidth;
            options.height = adjustedHeight;
        }
        this._squarifiedLayout(options);
    }

    public static totalSize(ids: Uint32Array, sizes: ArrayLike<number>, from: number, to: number): number {
        let size = 0;
        for (let i = from; i <= to; i++) {
            size += sizes[ids[i]];
        }
        return size;
    }

    private static _squarifiedLayout(options: ISquarifiedTreeMapOptions) {
        if (options.from > options.to) return;
        if (options.to - options.from < 2) {
            this._sliceLayout(options);
            return;
        }

        const totalSize = this.totalSize(options.ids, options.sizes, options.from, options.to);
        // Start with the last item in the list (the largest) as the first slice
        const a = options.sizes[options.ids[options.to]] / totalSize;
        let b = a;
        let mid = options.to;
        let smallest = a;
        if (options.width < options.height) {
            while (mid > options.from) {
                // Calculate worst aspect ratio of current slice, considering both the largest and smallest items
                const worst = this.worstAspect(options.height, options.width, a, smallest, b);
                // Calculate worst aspect ratio if we add the next item to the slice
                const q = options.sizes[options.ids[mid - 1]] / totalSize;
                // Check if adding the next item would make the worst aspect ratio worse, if so break and layout the current slice
                const newWorst = this.worstAspect(options.height, options.width, a, Math.min(smallest, q), b + q);
                if (newWorst > worst) {
                    break;
                }
                mid--;
                // Add the next item to the slice
                b += q;
                smallest = Math.min(smallest, q);
            }
            const from = options.from;
            const height = options.height;
            options.from = mid;
            // Calculate height of the slice based on the total size of the items in the slice
            options.height = options.height * b;
            // Layout the slice
            this._sliceLayout(options);

            options.from = from;
            options.height = height;
            options.to = mid - 1;
            // Move the y position down to the start of the remaining space after the slice
            options.y = options.y + height * b;
            // Calculate height of the remaining space after the slice
            options.height = height * (1 - b);
            // Layout the remaining space with the squarified algorithm
            this._squarifiedLayout(options);
        }
        else {
            while (mid > options.from) {
                // Calculate worst aspect ratio of current slice, considering both the largest and smallest items
                const worst = this.worstAspect(options.width, options.height, a, smallest, b);
                // Calculate worst aspect ratio if we add the next item to the slice
                const q = options.sizes[options.ids[mid - 1]] / totalSize;
                // Check if adding the next item would make the worst aspect ratio worse, if so break and layout the current slice
                const newWorst = this.worstAspect(options.width, options.height, a, Math.min(smallest, q), b + q);
                if (newWorst > worst) {
                    break;
                }
                mid--;
                // Add the next item to the slice
                b += q;
                smallest = Math.min(smallest, q);
            }
            const from = options.from;
            const width = options.width;
            options.from = mid;
            // Calculate width of the slice based on the total size of the items in the slice
            options.width = options.width * b;
            // Layout the slice
            this._sliceLayout(options);

            options.from = from;
            options.width = width;
            options.to = mid - 1;
            // Move the x position over to the start of the remaining space after the slice
            options.x = options.x + width * b;
            // Calculate width of the remaining space after the slice
            options.width = width * (1 - b);
            // Layout the remaining space with the squarified algorithm
            this._squarifiedLayout(options);
        }
    }

    private static _sliceLayout(options: ISquarifiedTreeMapOptions) {
        // Layout the items in a single slice, either horizontally or vertically depending on the aspect ratio of the available space
        const totalSize = this.totalSize(options.ids, options.sizes, options.from, options.to);
        let a = 0;
        for (let i = options.to; i >= options.from; i--) {
            const id = options.ids[i];
            const index = options.lookup[id];
            // Calculate the ratio of the item's size to the total size of the slice
            const b = options.sizes[id] / totalSize;
            if (options.width > options.height) {
                options.sizesY[index] = options.height;
                // Calculate width of the item based on its size ratio and the total width of the slice
                options.sizesX[index] = options.width * b;
                // Position the item in the center of its allocated space in the slice
                options.positionsY[index] = options.y + options.height / 2;
                // Position the item at the start of the remaining space in the slice plus half of its allocated width
                options.positionsX[index] = options.x + options.width * a + options.width * b / 2;
            }
            else {
                options.sizesX[index] = options.width;
                // Calculate height of the item based on its size ratio and the total height of the slice
                options.sizesY[index] = options.height * b;
                // Position the item in the center of its allocated space in the slice
                options.positionsX[index] = options.x + options.width / 2;
                // Position the item at the start of the remaining space in the slice plus half of its allocated height
                options.positionsY[index] = options.y + options.height * a + options.height * b / 2;
            }
            a += b;
        }
    }

    private static worstAspect(big: number, small: number, largest: number, smallest: number, total: number): number {
        // Calculate the worst aspect ratio of a slice, considering both the largest and smallest items
        return Math.max(
            this.aspect(big, small, largest, total),
            this.aspect(big, small, smallest, total)
        );
    }

    private static aspect(big: number, small: number, a: number, b: number): number {
        // Calculate the aspect ratio of a slice with size ratio a and b in a space with dimensions big and small, where big is the larger dimension of the space and small is the smaller dimension of the space
        const x = (big * b) / (small * a / b);
        // The aspect ratio is always >= 1, so if x is less than 1 we take the reciprocal
        if (x < 1) { return 1 / x; }
        else { return x; }
    }
}