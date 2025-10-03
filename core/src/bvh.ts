// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import { Vector3 } from "./matrix.js";
import { Hittable } from "./hittable.js";
import { AABB } from "./aabb.js";
import { Time } from "./time.js";

export class LinearBVHNode {
    public bounds: AABB;
    public primitivesOffset: number; // Leaf
    public secondChildOffset: number; // Interior
    public nPrimitives: number;
    public axis: number;
    private _centroid: Vector3;
    private _size: Vector3;

    constructor() {
        this.bounds = new AABB();
        this.primitivesOffset = 0;
        this.secondChildOffset = 0;
        this.nPrimitives = 0;
        this.axis = 0;
        this._centroid = [0, 0, 0];
        this._size = [0, 0, 0];
    }

    public toBuffer(buffer: LinearBVHNodeBufferData, index: number) {
        this.bounds.centroid(this._centroid);
        buffer.setCenter(index, this._centroid);
        this.bounds.size(this._size);
        this._size[0];
        this._size[1];
        this._size[2];
        buffer.setSize(index, this._size);
        buffer.setPrimitivesOffset(index, this.primitivesOffset);
        buffer.setSecondChildOffset(index, this.secondChildOffset);
        buffer.setNPrimitives(index, this.nPrimitives);
        buffer.setAxis(index, this.axis);
    }
}

export class BVHAccel {
    private _maxPrimsInNode: number;
    private _splitMethod: string;
    private _primitives: Hittable[];
    private _orderedPrimitives: Hittable[];
    public get orderedPrimitives() { return this._orderedPrimitives; }
    private _orderedPrimitivesLookup: Uint32Array;
    public get orderedPrimitivesLookup() { return this._orderedPrimitivesLookup; }
    private _primitiveInfo: BVHPrimitiveInfo[];
    private _totalNodes: number;
    private _nodes: LinearBVHNode[];
    public get nodes() { return this._nodes; }
    private _offset: number;
    private _normalized: Vector3;

    /**
     * 
     * @param primitives 
     * @param maxPrimsInNode 
     * @param splitMethod "middle", "equalCounts", "sah"
     * @returns 
     */
    constructor(primitives: Hittable[], maxPrimsInNode: number, splitMethod: string) {
        if (!primitives || primitives.length == 0) {
            return;
        }
        let start = performance.now();
        this._maxPrimsInNode = maxPrimsInNode;
        this._splitMethod = splitMethod;
        this._primitives = primitives;
        this._normalized = [0, 0, 0];

        // Build BVH from primitives
        // Initialize primitiveInfo array for primitives
        this._primitiveInfo = [];
        for (let i = 0; i < primitives.length; i++) {
            this._primitiveInfo.push(new BVHPrimitiveInfo(i, primitives[i].bounds));
        }

        // Build BVH tree for primitives using primitiveInfo
        this._totalNodes = 0;
        this._orderedPrimitives = [];
        this._orderedPrimitivesLookup = new Uint32Array(primitives.length);
        const root = this._recursiveBuild(0, primitives.length); // [first,last)
        console.log(`bvh ${this._totalNodes} nodes split ${this._splitMethod} ${Time.formatDuration(performance.now() - start)}`);

        // Compute representation of depth-first traversal of BVH tree
        start = performance.now();
        this._nodes = [];
        for (let i = 0; i < this._totalNodes; i++) {
            this._nodes.push(new LinearBVHNode());
        }
        this._offset = 0;
        this._flattenBVHTree(root);
        console.log(`bvh flattened ${this._totalNodes} nodes ${Time.formatDuration(performance.now() - start)}`);
    }

    private _recursiveBuild(start: number, end: number): BVHBuildNode {
        const node = new BVHBuildNode(start, end - 1); // Inclusive
        this._totalNodes++;

        // Compute bounds of all primitives in BVH node
        const bounds = new AABB();
        for (let i = start; i < end; i++) {
            bounds.unionBounds(this._primitiveInfo[i].bounds);
            // Check for Nan
            if (isNaN(this._primitiveInfo[i].bounds.min[0]) || isNaN(this._primitiveInfo[i].bounds.min[1]) || isNaN(this._primitiveInfo[i].bounds.min[2]) ||
                isNaN(this._primitiveInfo[i].bounds.max[0]) || isNaN(this._primitiveInfo[i].bounds.max[1]) || isNaN(this._primitiveInfo[i].bounds.max[2])) {
                console.log(`primitive ${i} bounds NaN`, this._primitiveInfo[i].bounds);
            }
        }

        const nPrimitives = end - start;
        if (nPrimitives == 1) {
            // Create leaf BVHBuildNode
            const firstPrimOffset = this._orderedPrimitives.length;
            for (let i = start; i < end; i++) {
                const primNum = this._primitiveInfo[i].primitiveNumber;
                this._orderedPrimitivesLookup[this._orderedPrimitives.length] = primNum;
                this._orderedPrimitives.push(this._primitives[primNum]);
            }
            node.initLeaf(firstPrimOffset, nPrimitives, bounds);
            return node;
        } else {
            // Compute bound of primitive centroids, choose split dimension dim 
            const centroidBounds = new AABB();
            for (let i = start; i < end; i++) {
                centroidBounds.unionPoint(this._primitiveInfo[i].centroid);
            }
            const dim = centroidBounds.maximumExtent();

            // Partition primitives into two sets and build children
            let mid = Math.floor((start + end) / 2);
            if (centroidBounds.max[dim] == centroidBounds.min[dim]) {
                // Create leaf BVHBuildNode
                const firstPrimOffset = this._orderedPrimitives.length;
                for (let i = start; i < end; i++) {
                    const primNum = this._primitiveInfo[i].primitiveNumber;
                    this._orderedPrimitivesLookup[this._orderedPrimitives.length] = primNum;

                    this._orderedPrimitives.push(this._primitives[primNum]);
                }
                node.initLeaf(firstPrimOffset, nPrimitives, bounds);
                return node;
            }
            else {
                // Partition primitives based on splitMethod
                switch (this._splitMethod) {
                    case "middle":
                        break;

                    case "equalCounts":
                        // Partition primitives into two equally sized subsets
                        // The first half have the smallest centroid coordinate values along the chosen axis
                        mid = Math.floor((start + end) / 2);
                        // Sort subset
                        const primtiveInfo = this._primitiveInfo.slice(start, end);
                        primtiveInfo.sort(function (a, b) { return (a.centroid[dim] - b.centroid[dim]) });
                        for (let i = start; i < end; i++) {
                            this._primitiveInfo[i] = primtiveInfo[i - start];
                        }
                        break;

                    case "sah":
                    default:
                        // Partition primitives using approximate SAH
                        if (nPrimitives <= 4) {
                            // Partition primitives into equally sized subsets (SplitMethod.equalCounts)
                            mid = Math.floor((start + end) / 2);
                            // Sort subset
                            const primtiveInfo = this._primitiveInfo.slice(start, end);
                            primtiveInfo.sort(function (a, b) { return (a.centroid[dim] - b.centroid[dim]) });
                            for (let i = start; i < end; i++) {
                                this._primitiveInfo[i] = primtiveInfo[i - start];
                            }
                        } else {
                            // Allocate BucketInfo for SAH partition buckets
                            const nBuckets = 12;
                            const buckets: { count: number, bounds: AABB }[] = [];
                            for (let i = 0; i < nBuckets; i++) {
                                buckets.push({
                                    count: 0,
                                    bounds: new AABB(),
                                });
                            }

                            // Initialize BucketInfo for SAH partition buckets
                            for (let i = start; i < end; i++) {
                                // Determine primitive centroid bucket
                                centroidBounds.normalize(this._primitiveInfo[i].centroid, this._normalized);
                                const b = Math.min(Math.round(nBuckets * this._normalized[dim]), nBuckets - 1);
                                buckets[b].count++;

                                // Update the bucket's bounds to include the primitive bounds
                                buckets[b].bounds.unionBounds(this._primitiveInfo[i].bounds);
                            }

                            // Compute costs for splitting after each bucket
                            const cost = [];
                            for (let i = 0; i < nBuckets - 1; i++) {
                                const b0 = new AABB();
                                const b1 = new AABB();
                                let count0 = 0
                                let count1 = 0;
                                for (let j = 0; j <= i; j++) {
                                    b0.unionBounds(buckets[j].bounds);
                                    count0 += buckets[j].count;
                                }
                                for (let j = i + 1; j < nBuckets; j++) {
                                    b1.unionBounds(buckets[j].bounds);
                                    count1 += buckets[j].count;
                                }
                                cost.push(0.125 + (
                                    count0 * b0.surfaceArea() +
                                    count1 * b1.surfaceArea()) / bounds.surfaceArea());
                            }

                            // Find bucket to split at that minimizes SAH metric
                            let minCost = cost[0];
                            let minCostSplitBucket = 0;
                            for (let i = 1; i < nBuckets - 1; i++) {
                                if (cost[i] < minCost) {
                                    minCost = cost[i];
                                    minCostSplitBucket = i;
                                }
                            }

                            // Either create leaf or split primitives at selected SAH bucket
                            const leafCost = nPrimitives;
                            if (nPrimitives > this._maxPrimsInNode || minCost < leafCost) {
                                // Sort subset
                                const primtiveInfo = this._primitiveInfo.slice(start, end);
                                primtiveInfo.sort(function (a, b) { return (a.centroid[dim] - b.centroid[dim]) });
                                for (let i = start; i < end; i++) {
                                    this._primitiveInfo[i] = primtiveInfo[i - start];
                                }

                                // Find first hittable at split bucket
                                for (let i = start; i < end; i++) {
                                    centroidBounds.normalize(this._primitiveInfo[i].centroid, this._normalized);
                                    const b = Math.min(Math.round(nBuckets * this._normalized[dim]), nBuckets - 1);
                                    if (b > minCostSplitBucket) {
                                        mid = i;
                                        break;
                                    }
                                }
                            }
                            else {
                                // Create leaf BVHBuildNode
                                const firstPrimOffset = this._orderedPrimitives.length;
                                for (let i = start; i < end; i++) {
                                    const primNum = this._primitiveInfo[i].primitiveNumber;
                                    this._orderedPrimitivesLookup[this._orderedPrimitives.length] = primNum;
                                    this._orderedPrimitives.push(this._primitives[primNum]);
                                }
                                node.initLeaf(firstPrimOffset, nPrimitives, bounds);
                                return node;
                            }
                        }
                        break;
                }

                node.initInterior(dim,
                    this._recursiveBuild(start, mid),
                    this._recursiveBuild(mid, end));
            }
        }
        return node;
    }

    private _flattenBVHTree(node: BVHBuildNode): number {
        const linearNode = this._nodes[this._offset];
        linearNode.bounds = node.bounds;
        const myOffset = this._offset++;
        if (node.nPrimitives > 0) {
            linearNode.primitivesOffset = node.firstPrimOffset;
            linearNode.nPrimitives = node.nPrimitives;
        }
        else {
            // Create interior flattened BVH node
            linearNode.axis = node.splitAxis;
            linearNode.nPrimitives = 0;
            this._flattenBVHTree(node.left);
            linearNode.secondChildOffset = this._flattenBVHTree(node.right);

        }
        return myOffset;
    }
}

class BVHPrimitiveInfo {
    private _primitiveNumber: number;
    private _bounds: AABB;
    private _centroid: Vector3;
    public get primitiveNumber() { return this._primitiveNumber; }
    public get bounds() { return this._bounds; }
    public get centroid() { return this._centroid; }
    constructor(primitiveNumber: number, bounds: AABB) {
        this._primitiveNumber = primitiveNumber;
        this._bounds = bounds;
        this._centroid = [0, 0, 0];
        bounds.centroid(this._centroid);
    }
}

class BVHBuildNode {
    private _bounds: AABB;
    private _left: BVHBuildNode;
    private _right: BVHBuildNode;
    private _splitAxis: number;
    private _firstPrimOffset: number;
    private _nPrimitives: number;
    public get bounds() { return this._bounds; }
    public get left() { return this._left; }
    public get right() { return this._right; }
    public get splitAxis() { return this._splitAxis; }
    public get firstPrimOffset() { return this._firstPrimOffset; }
    public get nPrimitives() { return this._nPrimitives; }

    // Debug
    private _start: number;
    private _end: number;
    public get start() { return this._start; }
    public get end() { return this._end; }
    constructor(start: number, end: number) {
        this._start = start;
        this._end = end;
    }

    public initLeaf(first: number, n: number, bounds: AABB) {
        this._firstPrimOffset = first;
        this._nPrimitives = n;
        this._bounds = bounds;
        this._left = null;
        this._right = null;
    }

    public initInterior(axis: number, left: BVHBuildNode, right: BVHBuildNode) {
        this._left = left;
        this._right = right;
        this._bounds = new AABB();
        this._bounds.unionBounds(this._left.bounds);
        this._bounds.unionBounds(this._right.bounds);
        this._splitAxis = axis;
        this._nPrimitives = 0;
    }
}

export class LinearBVHNodeBufferData extends Float32Array {
    public static readonly SIZE = 48 / 4;

    public readonly CENTER_OFFSET = 0 / 4;
    public readonly PRIMITIVES_OFFSET_OFFSET = 12 / 4;
    public readonly SIZE_OFFSET = 16 / 4;
    public readonly SECOND_CHILD_OFFSET_OFFSET = 28 / 4;
    public readonly N_PRIMITIVES_OFFSET = 32 / 4;
    public readonly AXIS_OFFSET = 36 / 4;

    public getCenter(index: number, value: Vector3): void {
        const offset = LinearBVHNodeBufferData.SIZE * index + this.CENTER_OFFSET;
        value[0] = this[offset];
        value[1] = this[offset + 1];
        value[2] = this[offset + 2];
    }
    public setCenter(index: number, value: Vector3): void {
        const offset = LinearBVHNodeBufferData.SIZE * index + this.CENTER_OFFSET;
        this[offset] = value[0];
        this[offset + 1] = value[1];
        this[offset + 2] = value[2];
    }
    public getSize(index: number, value: Vector3): void {
        const offset = LinearBVHNodeBufferData.SIZE * index + this.SIZE_OFFSET;
        value[0] = this[offset];
        value[1] = this[offset + 1];
        value[2] = this[offset + 2];
    }
    public setSize(index: number, value: Vector3): void {
        const offset = LinearBVHNodeBufferData.SIZE * index + this.SIZE_OFFSET;
        this[offset] = value[0];
        this[offset + 1] = value[1];
        this[offset + 2] = value[2];
    }
    public getPrimitivesOffset(index: number): number {
        return this[LinearBVHNodeBufferData.SIZE * index + this.PRIMITIVES_OFFSET_OFFSET];
    }
    public setPrimitivesOffset(index: number, value: number): void {
        this[LinearBVHNodeBufferData.SIZE * index + this.PRIMITIVES_OFFSET_OFFSET] = value;
    }
    public getSecondChildOffset(index: number): number {
        return this[LinearBVHNodeBufferData.SIZE * index + this.SECOND_CHILD_OFFSET_OFFSET];
    }
    public setSecondChildOffset(index: number, value: number): void {
        this[LinearBVHNodeBufferData.SIZE * index + this.SECOND_CHILD_OFFSET_OFFSET] = value;
    }
    public getNPrimitives(index: number): number {
        return this[LinearBVHNodeBufferData.SIZE * index + this.N_PRIMITIVES_OFFSET];
    }
    public setNPrimitives(index: number, value: number): void {
        this[LinearBVHNodeBufferData.SIZE * index + this.N_PRIMITIVES_OFFSET] = value;
    }
    public getAxis(index: number): number {
        return this[LinearBVHNodeBufferData.SIZE * index + this.AXIS_OFFSET];
    }
    public setAxis(index: number, value: number): void {
        this[LinearBVHNodeBufferData.SIZE * index + this.AXIS_OFFSET] = value;
    }
}