// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import * as Core from "core";
import { Dataset } from "../dataset.js";
import { Transform } from "./transform.js";
import { IHierarchy } from "./stratify.js";

export class Pack extends Transform {
    /**
     * Compute layout for circle packing
     * @param dataset
     * @param hierarchy
     * @param readonly
     * @returns
     */
    transform(dataset: Dataset, hierarchy: IHierarchy, readonly: boolean): Dataset {
        let start = performance.now();
        if (readonly) {
            dataset = dataset.clone();
        }

        const field = this._transformJSON.field;
        const width = this._transformJSON.size[0];
        const height = this._transformJSON.size[1];
        let xColumn = "x";
        let yColumn = "y";
        let rColumn = "r";
        let depthColumn = "depth";
        // let childrenColumn = "children";
        const as = this._transformJSON.as;
        // Default ["x", "y", "r", "depth", "children"]
        if (as && Array.isArray(as) && as.length == 5) {
            xColumn = as[0];
            yColumn = as[1];
            rColumn = as[2];
            depthColumn = as[3];
        }

        let sizeValues: Float64Array;
        if (field) {
            const sizeColumnIndex = dataset.getColumnIndex(field);
            if (sizeColumnIndex == -1) { throw new Error(`pack transform field ${field} not found`); }
            sizeValues = dataset.all.columnValues(sizeColumnIndex, false)
        }

        const rootId = hierarchy.rootIds[0];
        const indices = hierarchy.indices;
        const children = hierarchy.children;
        const ids: number[] = [];
        const positions = new Float64Array(dataset.length);
        const depths = new Uint32Array(dataset.length);
        const sizes = new Float64Array(dataset.length);
        let position = 0;
        let maxDepth = 0;
        const buildTree = (parentId: number, depth: number) => {
            // TODO: Don't add leaf nodes if counting size and size is 0
            const parentIndex = indices[parentId];
            ids.push(parentIndex);
            positions[parentIndex] = position;
            const childIds = children[parentId];
            if (childIds !== undefined) {
                let totalSize = 0;
                for (let i = 0; i < childIds.length; i++) {
                    const childId = childIds[i];
                    buildTree(childId, depth + 1);
                    const childIndex = indices[childId];
                    totalSize += sizes[childIndex];
                }
                if (sizeValues) {
                    const parentSize = sizeValues[parentIndex];
                    sizes[parentIndex] = totalSize + parentSize;
                    position += parentSize;
                }
                else {
                    // Don't add size if counting leaf nodes
                    sizes[parentIndex] = totalSize;
                }
            }
            else {
                // Leaf node
                const size = sizeValues ? sizeValues[parentIndex] : 1; // Default to unit size
                sizes[parentIndex] = size;
                position += size;
            }
            depths[parentIndex] = depth;
            maxDepth = Math.max(maxDepth, depth);
        };
        buildTree(rootId, 0);

        // Area
        for (let i = 0; i < dataset.length; i++) { sizes[i] = Math.sqrt(sizes[i]); }

        // Pack circles
        const keyValues = hierarchy.childIds;
        const positionsX = new Float64Array(dataset.length);
        const positionsY = new Float64Array(dataset.length);
        const radii = new Float64Array(dataset.length);
        const buildTreeMap = (
            parentId: number,
            x: number,
            y: number,
            radius: number,
        ) => {
            // Order children by size
            const children = hierarchy.children[keyValues[parentId]];
            let orderedChildrenNodeIds = new Uint32Array(children.length);
            for (let i = 0; i < children.length; i++) { orderedChildrenNodeIds[i] = hierarchy.indices[children[i]]; }
            orderedChildrenNodeIds.sort((a, b) => sizes[b] - sizes[a]);

            // Arrange children
            const circles: Circle[] = [];
            for (let i = 0; i < orderedChildrenNodeIds.length; i++) {
                const index = orderedChildrenNodeIds[i];
                circles.push(new Circle(0, 0, sizes[index]));
            }
            const r = PackCircles.packSiblings(circles);
            const scale = radius / r;
            for (let i = 0; i < orderedChildrenNodeIds.length; i++) {
                const index = orderedChildrenNodeIds[i];
                positionsX[index] = x + circles[i].x * scale;
                positionsY[index] = y + circles[i].y * scale;
                radii[index] = circles[i].radius * scale;
            }

            // Iterate children, reurse for nodes which are parents
            for (let i = 0; i < orderedChildrenNodeIds.length; i++) {
                const nodeId = orderedChildrenNodeIds[i];
                if (hierarchy.children[keyValues[nodeId]]) {
                    const x = positionsX[nodeId];
                    const y = positionsY[nodeId];
                    const radius = radii[nodeId]; // Keep 1x scale
                    buildTreeMap(nodeId, x, y, radius);
                }
            }
        };

        // Start with root
        const rootNodeId = hierarchy.indices[hierarchy.rootIds[0]];
        const radius = Math.min(width, height);
        const x = 0;
        const y = 0;
        positionsX[rootNodeId] = x;
        positionsY[rootNodeId] = y;
        radii[rootNodeId] = radius;
        buildTreeMap(rootNodeId, 0, 0, radius);

        // Add columns
        for (let i = 0; i < dataset.length; i++) {
            const row = dataset.rows[i];
            row.push((positionsX[i] + width / 2).toString()); // x
            row.push((positionsY[i] + height / 2).toString()); // y
            row.push(radii[i].toString()); // radii
            row.push(depths[i].toString()); // depth
            row.push(sizes[i].toString()); // sizes
        }

        // Add headings, columnTypes
        dataset.headings.push(xColumn);
        dataset.columnTypes.push(Core.Data.ColumnType.float);
        dataset.headings.push(yColumn);
        dataset.columnTypes.push(Core.Data.ColumnType.float);
        dataset.headings.push(rColumn);
        dataset.columnTypes.push(Core.Data.ColumnType.float);
        dataset.headings.push(depthColumn);
        dataset.columnTypes.push(Core.Data.ColumnType.integer);
        dataset.headings.push("size0");
        dataset.columnTypes.push(Core.Data.ColumnType.integer);
        console.log(`Circle pack ${dataset.length} rows ${Math.round(performance.now() - start)}ms`);
        return dataset;
    }
}

class Circle {
    x: number;
    y: number;
    radius: number;

    constructor(x: number = 0, y: number = 0, radius: number = 0) {
        this.x = x;
        this.y = y;
        this.radius = radius;
    }
}

export class PackCircles {
    /**
     * Pack circles in siblings array into a tight circle and return the radius of the enclosing circle
     * @param circles 
     */
    static packSiblings(circles: Circle[]): number {
        const n = circles.length;
        if (n === 0) return 0;

        let a: Circle, b: Circle, c: Circle;
        let i: number;
        let nodeJ: FrontChainNode, nodeK: FrontChainNode;
        let sj: number, sk: number;

        // Place the first circle
        a = circles[0];
        a.x = 0;
        a.y = 0;
        if (n === 1) return a.radius;

        // Place the second circle
        b = circles[1];
        a.x = -b.radius;
        b.x = a.radius;
        b.y = 0;
        if (n === 2) return a.radius + b.radius;

        // Place the third circle
        c = circles[2];
        PackCircles.place(b, a, c);

        // Initialize the front-chain using the first three circles a, b and c
        let nodeA = new FrontChainNode(a);
        let nodeB = new FrontChainNode(b);
        let nodeC = new FrontChainNode(c);

        nodeA.next = nodeC.previous = nodeB;
        nodeB.next = nodeA.previous = nodeC;
        nodeC.next = nodeB.previous = nodeA;

        // Compute the initial closest circle pair to the centroid
        let aa = PackCircles.score(nodeA);
        let ca = PackCircles.score(nodeC);
        if (ca < aa) {
            nodeA = nodeC;
            aa = ca;
        }
        nodeB = nodeA.next;

        // Attempt to place each remaining circle…
        pack: for (i = 3; i < n; ++i) {
            c = circles[i];
            PackCircles.place(nodeA.circle, nodeB.circle, c);
            let nodeNewC = new FrontChainNode(c);

            // Find the closest intersecting circle on the front-chain, if any.
            // "Closeness" is determined by linear distance along the front-chain.
            nodeJ = nodeB.next;
            nodeK = nodeA.previous;
            sj = nodeB.circle.radius;
            sk = nodeA.circle.radius;

            do {
                if (sj <= sk) {
                    if (PackCircles.intersects(nodeJ.circle, nodeNewC.circle)) {
                        nodeB = nodeJ;
                        nodeA.next = nodeB;
                        nodeB.previous = nodeA;
                        --i;
                        continue pack;
                    }
                    sj += nodeJ.circle.radius;
                    nodeJ = nodeJ.next;
                } else {
                    if (PackCircles.intersects(nodeK.circle, nodeNewC.circle)) {
                        nodeA = nodeK;
                        nodeA.next = nodeB;
                        nodeB.previous = nodeA;
                        --i;
                        continue pack;
                    }
                    sk += nodeK.circle.radius;
                    nodeK = nodeK.previous;
                }
            } while (nodeJ !== nodeK.next);

            // Success! Insert the new circle c between a and b.
            nodeNewC.previous = nodeA;
            nodeNewC.next = nodeB;
            nodeA.next = nodeB.previous = nodeB = nodeNewC;

            // Compute the new closest circle pair to the centroid.
            aa = PackCircles.score(nodeA);
            let currentNode = nodeNewC;
            while ((currentNode = currentNode.next) !== nodeB) {
                ca = PackCircles.score(currentNode);
                if (ca < aa) {
                    nodeA = currentNode;
                    aa = ca;
                }
            }
            nodeB = nodeA.next;
        }

        // Compute the enclosing circle of the front chain
        const frontChainCircles: Circle[] = [nodeB.circle];
        let currentNode = nodeB;
        while ((currentNode = currentNode.next) !== nodeB) {
            frontChainCircles.push(currentNode.circle);
        }

        const enclosing = PackCircles.enclose(frontChainCircles);

        // Translate the circles to put the enclosing circle around the origin
        for (i = 0; i < n; ++i) {
            const circle = circles[i];
            circle.x -= enclosing.x;
            circle.y -= enclosing.y;
        }

        return enclosing.radius;
    }

    /**
     * Place circle c tangent to circles a and b
     */
    private static place(a: Circle, b: Circle, c: Circle): void {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d2 = dx * dx + dy * dy;

        if (d2) {
            const a2 = (a.radius + c.radius) * (a.radius + c.radius);
            const b2 = (b.radius + c.radius) * (b.radius + c.radius);
            let x: number, y: number;

            if (a2 > b2) {
                x = (d2 + b2 - a2) / (2 * d2);
                y = Math.sqrt(Math.max(0, b2 / d2 - x * x));
                c.x = b.x - x * dx - y * dy;
                c.y = b.y - x * dy + y * dx;
            } else {
                x = (d2 + a2 - b2) / (2 * d2);
                y = Math.sqrt(Math.max(0, a2 / d2 - x * x));
                c.x = a.x + x * dx - y * dy;
                c.y = a.y + x * dy + y * dx;
            }
        } else {
            c.x = a.x + c.radius;
            c.y = a.y;
        }
    }

    /**
     * Check if two circles intersect
     */
    private static intersects(a: Circle, b: Circle): boolean {
        const dr = a.radius + b.radius - 1e-6;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        return dr > 0 && dr * dr > dx * dx + dy * dy;
    }

    /**
     * Compute score for a node (distance to centroid)
     */
    private static score(node: FrontChainNode): number {
        const a = node.circle;
        const b = node.next.circle;
        const ab = a.radius + b.radius;
        const dx = (a.x * b.radius + b.x * a.radius) / ab;
        const dy = (a.y * b.radius + b.y * a.radius) / ab;
        return dx * dx + dy * dy;
    }

    /**
     * Compute the smallest enclosing circle of a set of circles
     */
    private static enclose(circles: Circle[]): Circle {
        const n = circles.length;
        if (n === 0) return new Circle(0, 0, 0);
        if (n === 1) return new Circle(circles[0].x, circles[0].y, circles[0].radius);

        // Use Welzl's algorithm implementation
        let i = 0;
        let B: Circle[] = [];
        let p: Circle;
        let e: Circle | null = null;

        // Shuffle circles for randomization (simplified version)
        const shuffled = [...circles];
        for (let idx = shuffled.length - 1; idx > 0; idx--) {
            const j = Math.floor(Math.random() * (idx + 1));
            [shuffled[idx], shuffled[j]] = [shuffled[j], shuffled[idx]];
        }

        while (i < n) {
            p = shuffled[i];
            if (e && PackCircles.enclosesWeak(e, p)) {
                ++i;
            } else {
                e = PackCircles.encloseBasis(B = PackCircles.extendBasis(B, p));
                i = 0;
            }
        }

        return e || new Circle(0, 0, 0);
    }

    private static enclosesWeak(circle: Circle, p: Circle): boolean {
        const dr = circle.radius - p.radius + Math.max(circle.radius, p.radius, 1) * 1e-9;
        const dx = p.x - circle.x;
        const dy = p.y - circle.y;
        return dr > 0 && dr * dr > dx * dx + dy * dy;
    }

    private static extendBasis(B: Circle[], p: Circle): Circle[] {
        if (PackCircles.enclosesWeakAll(p, B)) return [p];

        // If we get here then B must have at least one element
        for (let i = 0; i < B.length; ++i) {
            if (PackCircles.enclosesNot(p, B[i]) &&
                PackCircles.enclosesWeakAll(PackCircles.encloseBasis2(B[i], p), B)) {
                return [B[i], p];
            }
        }

        // If we get here then B must have at least two elements
        for (let i = 0; i < B.length - 1; ++i) {
            for (let j = i + 1; j < B.length; ++j) {
                if (PackCircles.enclosesNot(PackCircles.encloseBasis2(B[i], B[j]), p) &&
                    PackCircles.enclosesNot(PackCircles.encloseBasis2(B[i], p), B[j]) &&
                    PackCircles.enclosesNot(PackCircles.encloseBasis2(B[j], p), B[i]) &&
                    PackCircles.enclosesWeakAll(PackCircles.encloseBasis3(B[i], B[j], p), B)) {
                    return [B[i], B[j], p];
                }
            }
        }

        throw new Error("unable to extend basis");
    }

    private static enclosesWeakAll(circle: Circle, B: Circle[]): boolean {
        for (let i = 0; i < B.length; ++i) {
            if (!PackCircles.enclosesWeak(circle, B[i])) {
                return false;
            }
        }
        return true;
    }

    private static enclosesNot(circle: Circle, p: Circle): boolean {
        const dr = circle.radius - p.radius;
        const dx = p.x - circle.x;
        const dy = p.y - circle.y;
        return dr < 0 || dr * dr < dx * dx + dy * dy;
    }

    private static encloseBasis(B: Circle[]): Circle {
        switch (B.length) {
            case 1: return PackCircles.encloseBasis1(B[0]);
            case 2: return PackCircles.encloseBasis2(B[0], B[1]);
            case 3: return PackCircles.encloseBasis3(B[0], B[1], B[2]);
            default: throw new Error("invalid basis size");
        }
    }

    private static encloseBasis1(a: Circle): Circle {
        return new Circle(a.x, a.y, a.radius);
    }

    private static encloseBasis2(a: Circle, b: Circle): Circle {
        const x1 = a.x, y1 = a.y, r1 = a.radius;
        const x2 = b.x, y2 = b.y, r2 = b.radius;
        const x21 = x2 - x1, y21 = y2 - y1, r21 = r2 - r1;
        const l = Math.sqrt(x21 * x21 + y21 * y21);
        return new Circle(
            (x1 + x2 + x21 / l * r21) / 2,
            (y1 + y2 + y21 / l * r21) / 2,
            (l + r1 + r2) / 2
        );
    }

    private static encloseBasis3(a: Circle, b: Circle, c: Circle): Circle {
        const x1 = a.x, y1 = a.y, r1 = a.radius;
        const x2 = b.x, y2 = b.y, r2 = b.radius;
        const x3 = c.x, y3 = c.y, r3 = c.radius;
        const a2 = x1 - x2;
        const a3 = x1 - x3;
        const b2 = y1 - y2;
        const b3 = y1 - y3;
        const c2 = r2 - r1;
        const c3 = r3 - r1;
        const d1 = x1 * x1 + y1 * y1 - r1 * r1;
        const d2 = d1 - x2 * x2 - y2 * y2 + r2 * r2;
        const d3 = d1 - x3 * x3 - y3 * y3 + r3 * r3;
        const ab = a3 * b2 - a2 * b3;
        const xa = (b2 * d3 - b3 * d2) / (ab * 2) - x1;
        const xb = (b3 * c2 - b2 * c3) / ab;
        const ya = (a3 * d2 - a2 * d3) / (ab * 2) - y1;
        const yb = (a2 * c3 - a3 * c2) / ab;
        const A = xb * xb + yb * yb - 1;
        const B = 2 * (r1 + xa * xb + ya * yb);
        const C = xa * xa + ya * ya - r1 * r1;
        const r = -(Math.abs(A) > 1e-6 ? (B + Math.sqrt(B * B - 4 * A * C)) / (2 * A) : C / B);
        return new Circle(
            x1 + xa + xb * r,
            y1 + ya + yb * r,
            r
        );
    }
}

class FrontChainNode {
    circle: Circle;
    next: FrontChainNode;
    previous: FrontChainNode;

    constructor(circle: Circle) {
        this.circle = circle;
        this.next = this;
        this.previous = this;
    }
}