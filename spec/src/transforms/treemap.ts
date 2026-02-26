// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import * as Core from "core";
import { Dataset } from "../dataset.js";
import { IHierarchy } from "./stratify.js";
import { Transform } from "./transform.js";
import { Group } from "../marks/group.js";

export class Treemap extends Transform {
    /**
     * Compute layout for treemap
     * @param dataset 
     * @param hierarchy 
     * @param readonly 
     * @returns 
     */
    transform(group: Group, dataset: Dataset, hierarchy: IHierarchy, readonly: boolean): Dataset {
        // Width, height
        let width = 1, height = 1;
        if (this._transformJSON.size) {
            const size = this._transformJSON.size;
            if (Array.isArray(size) && size.length == 2) {
                if (typeof size[0] == "number") { width = size[0]; }
                else if (typeof size[0] == "object" && size[0].signal) {
                    width = group.parseSignalValue(size[0].signal);
                }
                if (typeof size[1] == "number") { height = size[1]; }
                else if (typeof size[1] == "object" && size[1].signal) {
                    height = group.parseSignalValue(size[1].signal);
                }
            }
            else if (typeof size == "object" && size.signal) {
                const s = group.parseSignalValue(size.signal);
                if (Array.isArray(s) && s.length == 2) { width = s[0]; height = s[1]; }
            }
        }

        let start = performance.now();
        if (readonly) { dataset = dataset.clone(); }
        let sizeValues: Float64Array;
        const field = this._transformJSON.field;
        let sizeColumnIndex = -1;
        if (field) {
            sizeColumnIndex = dataset.getColumnIndex(field);
            if (sizeColumnIndex == -1) { throw new Error(`treemap transform field ${field} not found`); }
            sizeValues = dataset.all.columnValues(sizeColumnIndex, false);
        }
        const method = this._transformJSON.method;
        const paddingOuter = this._transformJSON.paddingOuter;
        const paddingInner = this._transformJSON.paddingInner;
        const paddingOuterMultiplier = this._transformJSON.paddingOuterMultiplier;
        const paddingInnerMultiplier = this._transformJSON.paddingInnerMultiplier;

        // As
        let x0Column = "x0";
        let y0Column = "y0";
        let x1Column = "x1";
        let y1Column = "y1";
        let depthColumn = "depth";
        let childrenColumn = "children";
        let sizeColumn = "size";
        let descendentsColumn = "descendents";

        // Support flat hierarchy (no stratify)
        if (!hierarchy) {
            switch (method) {
                default:
                case "squarify":
                    const positionsX = new Float32Array(dataset.length);
                    const positionsY = new Float32Array(dataset.length);
                    const sizesX = new Float32Array(dataset.length);
                    const sizesY = new Float32Array(dataset.length);

                    // No lookup (may be required for facets)
                    const lookup: { [key: number]: number } = {};
                    for (let i = 0; i < dataset.length; i++) { lookup[i] = i; }

                    // Order by size
                    let orderedIds: Uint32Array;
                    if (sizeColumnIndex == -1) {
                        // No order (all same size)
                        orderedIds = dataset.all.ids;
                        sizeValues = new Float64Array(dataset.length);
                        for (let i = 0; i < dataset.length; i++) { sizeValues[i] = 1; }
                    }
                    else { orderedIds = dataset.all.orderedIds(sizeColumnIndex) }

                    // Total size
                    let totalSize = 0;
                    for (let i = 0; i < dataset.length; i++) { totalSize += sizeValues[i]; }

                    // X, y
                    let x = -width / 2;
                    let y = -height / 2;

                    // Padding outer
                    if (paddingOuter) {
                        width -= paddingOuter;
                        height -= paddingOuter;
                        x += paddingOuter / 2;
                        y += paddingOuter / 2;
                    }
                    if (paddingOuterMultiplier) {
                        x += width * (1 - paddingOuterMultiplier) / 2;
                        y += height * (1 - paddingOuterMultiplier) / 2;
                        width *= paddingOuterMultiplier;
                        height *= paddingOuterMultiplier;
                    }

                    // Squarified layout
                    const options: Core.ISquarifiedTreeMapOptions = {
                        ids: orderedIds,
                        sizes: sizeValues,
                        positionsX: positionsX,
                        positionsY: positionsY,
                        sizesX: sizesX,
                        sizesY: sizesY,
                        from: 0,
                        to: orderedIds.length - 1,
                        x: x,
                        y: y,
                        width: width,
                        height: height,
                        parentSize: totalSize,
                        lookup: lookup,
                    };
                    Core.TreeMap.squarifiedLayout(options);

                    // Padding inner
                    for (let i = 0; i < dataset.length; i++) {
                        let x = positionsX[i];
                        let y = positionsY[i];
                        let width = sizesX[i];
                        let height = sizesY[i];
                        if (paddingInner) {
                            width -= paddingInner;
                            height -= paddingInner;
                        }
                        if (paddingInnerMultiplier) {
                            width *= paddingInnerMultiplier;
                            height *= paddingInnerMultiplier;
                        }
                        positionsX[i] = x;
                        positionsY[i] = y;
                        sizesX[i] = width;
                        sizesY[i] = height;
                    }

                    // Add columns
                    const halfWidth = width / 2;
                    const halfHeight = height / 2;
                    for (let i = 0; i < dataset.length; i++) {
                        const row = dataset.rows[i];
                        row.push((positionsX[i] + halfWidth - sizesX[i] / 2).toString()); // x0
                        row.push((positionsY[i] + halfHeight - sizesY[i] / 2).toString()); // y0
                        row.push((positionsX[i] + halfWidth + sizesX[i] / 2).toString()); // x1
                        row.push((positionsY[i] + halfHeight + sizesY[i] / 2).toString()); // y1
                        row.push(sizeValues[i].toString()); // size
                    }

                    // As
                    // For flat hierarchy, use [x0, y0, x1, y1, size]
                    if (this._transformJSON.as) {
                        const as = this._transformJSON.as;
                        if (as && Array.isArray(as)) {
                            if (as.length > 0) { x0Column = as[0]; }
                            if (as.length > 1) { y0Column = as[1]; }
                            if (as.length > 2) { x1Column = as[2]; }
                            if (as.length > 3) { y1Column = as[3]; }
                            if (as.length > 4) { sizeColumn = as[4]; }
                        }
                    }

                    // Add headings, columnTypes
                    dataset.headings.push(x0Column);
                    dataset.columnTypes.push(Core.Data.ColumnType.float);
                    dataset.headings.push(y0Column);
                    dataset.columnTypes.push(Core.Data.ColumnType.float);
                    dataset.headings.push(x1Column);
                    dataset.columnTypes.push(Core.Data.ColumnType.float);
                    dataset.headings.push(y1Column);
                    dataset.columnTypes.push(Core.Data.ColumnType.float);
                    dataset.headings.push(sizeColumn);
                    dataset.columnTypes.push(Core.Data.ColumnType.float);
                    console.log(`treemap flat width ${width} height ${height} ${dataset.length} rows ${Core.Time.formatDuration(performance.now() - start)}`);
                    return dataset;
            }
        }

        // Hierarchical treemap
        const rootId = hierarchy.rootIds[0];
        const indices = hierarchy.indices;
        const children = hierarchy.children;
        const depths = new Uint32Array(dataset.length);
        const sizes = new Float32Array(dataset.length);
        const descendents = new Uint32Array(dataset.length);
        let maxDepth = 0;
        const buildTree = (parentId: number, depth: number) => {
            const parentIndex = indices[parentId];
            const childIds = children[parentId];
            if (childIds !== undefined) {
                let totalSize = 0;
                for (let i = 0; i < childIds.length; i++) {
                    const childId = childIds[i];
                    buildTree(childId, depth + 1);
                    const childIndex = indices[childId];
                    totalSize += sizes[childIndex];
                    descendents[parentIndex] += descendents[childIndex] + 1; // +1 for the child itself
                }
                if (sizeValues) {
                    const parentSize = sizeValues[parentIndex];
                    sizes[parentIndex] = totalSize + parentSize;
                }
                else {
                    // Only sum children sizes (ignore parent size) so that children completely fill the parent
                    sizes[parentIndex] = totalSize;
                }
            }
            else {
                // Leaf node
                const size = sizeValues ? sizeValues[parentIndex] : 1; // Default to unit size
                sizes[parentIndex] = size;
                
                // No-op (descendents typed array initialized to zero)
                // descendents[parentIndex] = 0;
            }
            depths[parentIndex] = depth;
            maxDepth = Math.max(maxDepth, depth);
        };
        buildTree(rootId, 0);
        switch (method) {
            default:
            case "squarify":
                const keyValues = hierarchy.childIds;
                const positionsX = new Float32Array(dataset.length);
                const positionsY = new Float32Array(dataset.length);
                const sizesX = new Float32Array(dataset.length);
                const sizesY = new Float32Array(dataset.length);

                // No lookup (may be required for facets)
                const lookup: { [key: number]: number } = {};
                for (let i = 0; i < dataset.length; i++) {
                    lookup[i] = i;
                }

                const buildTreeMap = (
                    parentId: number,
                    x: number,
                    y: number,
                    width: number,
                    height: number
                ) => {
                    // Order children by size
                    const children = hierarchy.children[keyValues[parentId]];
                    let orderedChildrenNodeIds = new Uint32Array(children.length);
                    for (let i = 0; i < children.length; i++) { orderedChildrenNodeIds[i] = hierarchy.indices[children[i]]; }
                    orderedChildrenNodeIds.sort((a, b) => sizes[a] - sizes[b]);

                    // Padding outer
                    if (paddingOuter) {
                        width -= paddingOuter;
                        height -= paddingOuter;
                        x += paddingOuter / 2;
                        y += paddingOuter / 2;
                    }
                    if (paddingOuterMultiplier) {
                        x += width * (1 - paddingOuterMultiplier) / 2;
                        y += height * (1 - paddingOuterMultiplier) / 2;
                        width *= paddingOuterMultiplier;
                        height *= paddingOuterMultiplier;
                    }

                    // Squarified layout
                    const options: Core.ISquarifiedTreeMapOptions = {
                        ids: orderedChildrenNodeIds,
                        sizes: sizes,
                        positionsX: positionsX,
                        positionsY: positionsY,
                        sizesX: sizesX,
                        sizesY: sizesY,
                        from: 0,
                        to: orderedChildrenNodeIds.length - 1,
                        x: x,
                        y: y,
                        width: width,
                        height: height,
                        parentSize: sizes[parentId],
                        lookup: lookup,
                    };
                    Core.TreeMap.squarifiedLayout(options);

                    // Iterate children, writing a block for leaf nodes, and building a treemap for children which are parents
                    for (let i = 0; i < orderedChildrenNodeIds.length; i++) {
                        const id = orderedChildrenNodeIds[i];

                        // Padding inner
                        let width = sizesX[id];
                        let height = sizesY[id];
                        if (paddingInner) {
                            width -= paddingInner;
                            height -= paddingInner;
                        }
                        if (paddingInnerMultiplier) {
                            width *= paddingInnerMultiplier;
                            height *= paddingInnerMultiplier;
                        }
                        sizesX[id] = width;
                        sizesY[id] = height;

                        if (hierarchy.children[keyValues[id]]) {
                            let width = sizesX[id];
                            let height = sizesY[id];
                            buildTreeMap(id, positionsX[id] - width / 2, positionsY[id] - height / 2, width, height);
                        }
                    }
                };

                // Start with root
                const rootNodeId = indices[rootId];
                positionsX[rootNodeId] = 0;
                positionsY[rootNodeId] = 0;
                sizesX[rootNodeId] = width;
                sizesY[rootNodeId] = height;
                buildTreeMap(rootNodeId, -width / 2, -height / 2, width, height);

                // Add columns
                const halfWidth = width / 2;
                const halfHeight = height / 2;
                for (let i = 0; i < dataset.length; i++) {
                    const row = dataset.rows[i];
                    row.push((positionsX[i] + halfWidth - sizesX[i] / 2).toString()); // x0
                    row.push((positionsY[i] + halfHeight - sizesY[i] / 2).toString()); // y0
                    row.push((positionsX[i] + halfWidth + sizesX[i] / 2).toString()); // x1
                    row.push((positionsY[i] + halfHeight + sizesY[i] / 2).toString()); // y1
                    row.push(depths[i].toString()); // depth
                    // Children
                    const childIds = children[hierarchy.childIds[i]];
                    if (childIds !== undefined) { row.push(childIds.length.toString()); }
                    else { row.push("0"); }
                    row.push(sizes[i].toString()); // size
                    row.push(descendents[i].toString()); // descendents
                }

                // As
                // For hierarchy, use [x0, y0, x1, y1, depth, children, size, descendents]
                if (this._transformJSON.as) {
                    const as = this._transformJSON.as;
                    if (Array.isArray(as)) {
                        if (as.length > 0) { x0Column = as[0]; }
                        if (as.length > 1) { y0Column = as[1]; }
                        if (as.length > 2) { x1Column = as[2]; }
                        if (as.length > 3) { y1Column = as[3]; }
                        if (as.length > 4) { depthColumn = as[4]; }
                        if (as.length > 5) { childrenColumn = as[5]; }
                        if (as.length > 6) { sizeColumn = as[6]; }
                        if (as.length > 7) { descendentsColumn = as[7]; }
                    }
                }

                // Add headings, columnTypes
                dataset.headings.push(x0Column);
                dataset.columnTypes.push(Core.Data.ColumnType.float);
                dataset.headings.push(y0Column);
                dataset.columnTypes.push(Core.Data.ColumnType.float);
                dataset.headings.push(x1Column);
                dataset.columnTypes.push(Core.Data.ColumnType.float);
                dataset.headings.push(y1Column);
                dataset.columnTypes.push(Core.Data.ColumnType.float);
                dataset.headings.push(depthColumn);
                dataset.columnTypes.push(Core.Data.ColumnType.integer);
                dataset.headings.push(childrenColumn);
                dataset.columnTypes.push(Core.Data.ColumnType.integer);
                dataset.headings.push(sizeColumn);
                dataset.columnTypes.push(Core.Data.ColumnType.float);
                dataset.headings.push(descendentsColumn);
                dataset.columnTypes.push(Core.Data.ColumnType.integer);
                console.log(`treemap width ${width} height ${height} ${dataset.length} rows ${Core.Time.formatDuration(performance.now() - start)}`);
                return dataset;
        }
    }
}