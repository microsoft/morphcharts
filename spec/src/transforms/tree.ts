// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import * as Core from "@microsoft/morphcharts-core";
import { Dataset } from "../dataset.js";
import { IHierarchy } from "./stratify.js";
import { Transform } from "./transform.js";
import { Group } from "../marks/group.js";

export class Tree3D extends Transform {

    /**
     * Constant-volume tree at each depth, with edge lengths (L) and edge thicknesses (T)
     * Given a volume (V), and an aspect ratio (A=L/T):
     *  L=Ax(V/A)^(1/3)
     *  T=L/A
     */
    transform(group: Group, dataset: Dataset, hierarchy: IHierarchy, readonly: boolean): Dataset {
        let start = performance.now();
        if (readonly) { dataset = dataset.clone(); }
        let sizeValues: ArrayLike<number>;
        const field = this._transformJSON.field;
        if (field) {
            const sizeColumnIndex = dataset.getColumnIndex(field);
            if (sizeColumnIndex == -1) { throw new Error(`tree3d transform field ${field} not found`); }
            sizeValues = dataset.all.columnValues(sizeColumnIndex, false);
        }
        const method = this._transformJSON.method;
        const rootId = hierarchy.rootIds[0];
        const indices = hierarchy.indices;
        const children = hierarchy.children;
        const ids: number[] = [];
        const depths = new Uint32Array(dataset.length);
        const sizes = new Float32Array(dataset.length);
        const descendants = new Uint32Array(dataset.length);
        let maxDepth = 0;
        const buildTree = (parentId: number, depth: number) => {
            const parentIndex = indices[parentId];
            ids.push(parentIndex);
            const childIds = children[parentId];
            if (childIds !== undefined) {
                let totalSize = 0;
                for (let i = 0; i < childIds.length; i++) {
                    const childId = childIds[i];
                    buildTree(childId, depth + 1);
                    const childIndex = indices[childId];
                    totalSize += sizes[childIndex];
                    descendants[parentIndex] += descendants[childIndex] + 1; // +1 for the child itself
                }
                if (sizeValues) {
                    const parentSize = sizeValues[parentIndex];
                    sizes[parentIndex] = totalSize + parentSize;
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
                descendants[parentIndex] = 0;
            }
            depths[parentIndex] = depth;
            maxDepth = Math.max(maxDepth, depth);
        };
        buildTree(rootId, 0);
        switch (method) {
            default:
            case "tree":
                const parseValue = (v: any, defaultValue: number) => {
                    if (v == undefined) return defaultValue;
                    if (typeof v == "number") return v;
                    if (typeof v == "object" && v.signal) return group.parseSignalValue(v.signal);
                    return defaultValue;
                };
                const edgeLengthScaling = parseValue(this._transformJSON.lengthScaling, 1);
                const branchAngle = parseValue(this._transformJSON.angle, 0) * Core.Constants.RADIANS_PER_DEGREE;
                const twistAngle = parseValue(this._transformJSON.twist, 0) * Core.Constants.RADIANS_PER_DEGREE;
                const minEdgeLength = parseValue(this._transformJSON.minLength, 0.01);
                const randomBranchAngle = parseValue(this._transformJSON.randomAngle, 0) * Core.Constants.RADIANS_PER_DEGREE;
                const randomTwistAngle = parseValue(this._transformJSON.randomTwist, 0) * Core.Constants.RADIANS_PER_DEGREE;
                const randomSplitAngle = parseValue(this._transformJSON.randomSplit, 0) * Core.Constants.RADIANS_PER_DEGREE;
                const randomEdgeLengthScaling = parseValue(this._transformJSON.randomLengthScaling, 0);
                const positionsX = new Float32Array(dataset.length);
                const positionsY = new Float32Array(dataset.length);
                const positionsZ = new Float32Array(dataset.length);

                // Field names
                let columnIndex;
                const edgeLengths = this._transformJSON.lengths;
                let edgeLengthValues;
                if (edgeLengths) {
                    columnIndex = dataset.getColumnIndex(edgeLengths);
                    if (columnIndex == -1) { throw new Error(`tree3d transform field ${edgeLengths} not found`); }
                    edgeLengthValues = dataset.all.columnValues(columnIndex, false);
                }
                const edgeLengthScalings = this._transformJSON.lengthScalings;
                let edgeLengthScalingValues;
                if (edgeLengthScalings) {
                    columnIndex = dataset.getColumnIndex(edgeLengthScalings);
                    if (columnIndex == -1) { throw new Error(`tree3d transform field ${edgeLengthScalings} not found`); }
                    edgeLengthScalingValues = dataset.all.columnValues(columnIndex, false);
                }
                const splitAngles = this._transformJSON.splits;
                let splitAngleValues;
                if (splitAngles) {
                    columnIndex = dataset.getColumnIndex(splitAngles);
                    if (columnIndex == -1) { throw new Error(`tree3d transform field ${splitAngles} not found`); }
                    splitAngleValues = dataset.all.columnValues(columnIndex, false);
                }
                const branchAngles = this._transformJSON.angles;
                let branchAngleValues;
                if (branchAngles) {
                    columnIndex = dataset.getColumnIndex(branchAngles);
                    if (columnIndex == -1) { throw new Error(`tree3d transform field ${branchAngles} not found`); }
                    branchAngleValues = dataset.all.columnValues(columnIndex, false);
                }
                const twistAngles = this._transformJSON.twists;
                let twistAngleValues;
                if (twistAngles) {
                    columnIndex = dataset.getColumnIndex(twistAngles);
                    if (columnIndex == -1) { throw new Error(`tree3d transform field ${twistAngles} not found`); }
                    twistAngleValues = dataset.all.columnValues(columnIndex, false);
                }

                // Size
                let treeSize: [number, number, number] | undefined;
                if (this._transformJSON.size) {
                    const size = this._transformJSON.size;
                    if (Array.isArray(size)) {
                        treeSize = [
                            size.length > 0 ? parseValue(size[0], 0) : 0,
                            size.length > 1 ? parseValue(size[1], 0) : 0,
                            size.length > 2 ? parseValue(size[2], 0) : 0,
                        ];
                    }
                }

                // Build tree
                const options: Core.ITree3DOptions = {
                    rootId: hierarchy.rootIds[0],
                    childIds: hierarchy.childIds,
                    indices: hierarchy.indices,
                    children: hierarchy.children,
                    positionsX: positionsX,
                    positionsY: positionsY,
                    positionsZ: positionsZ,
                    size: treeSize,
                    edgeLengthScaling: edgeLengthScaling,
                    branchAngle: branchAngle,
                    twistAngle: twistAngle,
                    randomBranchAngle: randomBranchAngle,
                    randomTwistAngle: randomTwistAngle,
                    randomSplitAngle: randomSplitAngle,
                    randomEdgeLengthScaling: randomEdgeLengthScaling,
                    minEdgeLength: minEdgeLength,
                    edgeLengths: edgeLengthValues,
                    edgeLengthScalings: edgeLengthScalingValues,
                    branchAngles: branchAngleValues,
                    splitAngles: splitAngleValues,
                    twistAngles: twistAngleValues
                };
                Core.Tree3D.layout(options);

                // Add columns
                for (let i = 0; i < dataset.length; i++) {
                    const row = dataset.rows[i];
                    row.push((positionsX[i]).toString()); // x
                    row.push((positionsY[i]).toString()); // y
                    row.push((positionsZ[i]).toString()); // z
                    row.push(depths[i].toString()); // depth
                    // Children
                    const childIds = children[hierarchy.childIds[i]];
                    if (childIds !== undefined) { row.push(childIds.length.toString()); }
                    else { row.push("0"); }
                    row.push(sizes[i].toString()); // size
                    row.push(descendants[i].toString()); // descendants
                }

                // As
                let x = "x";
                let y = "y";
                let z = "z";
                let depth = "depth";
                let _children = "children";
                let size = "size";
                let _descendants = "descendants";
                if (this._transformJSON.as) {
                    const as = this._transformJSON.as;
                    if (Array.isArray(as)) {
                        x = as[0].toString();
                        if (as.length > 1) { y = as[1].toString(); }
                        if (as.length > 2) { z = as[2].toString(); }
                        if (as.length > 3) { depth = as[3].toString(); }
                        if (as.length > 4) { _children = as[4].toString(); }
                        if (as.length > 5) { size = as[5].toString(); }
                        if (as.length > 6) { _descendants = as[6].toString(); }
                    }
                }

                // Add headings, columnTypes
                dataset.headings.push(x);
                dataset.columnTypes.push(Core.Data.ColumnType.float);
                dataset.headings.push(y);
                dataset.columnTypes.push(Core.Data.ColumnType.float);
                dataset.headings.push(z);
                dataset.columnTypes.push(Core.Data.ColumnType.float);
                dataset.headings.push(depth);
                dataset.columnTypes.push(Core.Data.ColumnType.float);
                dataset.headings.push(_children);
                dataset.columnTypes.push(Core.Data.ColumnType.float);
                dataset.headings.push(size);
                dataset.columnTypes.push(Core.Data.ColumnType.float);
                dataset.headings.push(_descendants);
                dataset.columnTypes.push(Core.Data.ColumnType.float);
                console.log(`tree3d ${dataset.length} rows ${Core.Time.formatDuration(performance.now() - start)}`);
                return dataset;
        }
    }
}