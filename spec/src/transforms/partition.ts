import * as Core from "core";
import { Dataset } from "../dataset.js";
import { IHierarchy } from "./stratify.js";
import { Transform } from "./transform.js";
import { Group } from "../marks/group.js";

export class Partition extends Transform {
    /**
     * Compute layout for adjacency diagram
     * @param dataset 
     * @param hierarchy 
     * @param readonly 
     * @returns 
     */
    transform(group: Group, dataset: Dataset, hierarchy: IHierarchy, readonly: boolean): Dataset {
        // TODO: Support transform.sort

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

        // Values
        let sizeValues: ArrayLike<number>;
        const field = this._transformJSON.field;
        if (field) {
            const sizeColumnIndex = dataset.getColumnIndex(field);
            if (sizeColumnIndex > -1) {
                sizeValues = dataset.all.columnValues(sizeColumnIndex, false)
            }
        }

        let start = performance.now();
        if (readonly) { dataset = dataset.clone(); }
        const rootId = hierarchy.rootIds[0];
        const indices = hierarchy.indices;
        const children = hierarchy.children;
        const ids: number[] = [];
        const positions = new Float32Array(dataset.length);
        const depths = new Uint32Array(dataset.length);
        const sizes = new Float32Array(dataset.length);
        const descendents = new Uint32Array(dataset.length);
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
                    descendents[parentIndex] += descendents[childIndex] + 1; // +1 for the child itself
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
                descendents[parentIndex] = 0;
            }
            depths[parentIndex] = depth;
            maxDepth = Math.max(maxDepth, depth);
        };
        buildTree(rootId, 0);

        // Max size is size of root id
        const maxSize = sizes[indices[rootId]];

        // Normalize to size and add columns
        const sizeY = height / (maxDepth + 1);
        for (let i = 0; i < dataset.length; i++) {
            const sizeX = width * sizes[i] / maxSize;
            const positionX = width * positions[i] / maxSize;
            const positionY = depths[i] * sizeY;
            const row = dataset.rows[i];
            row.push(positionX.toString()); // x0
            row.push(positionY.toString()); // y0
            row.push((positionX + sizeX).toString()); // x1
            row.push((positionY + sizeY).toString()); // y1
            row.push(depths[i].toString()); // depth
            // Children
            const childIds = children[hierarchy.childIds[i]];
            if (childIds !== undefined) { row.push(childIds.length.toString()); }
            else { row.push("0"); }
            row.push(sizes[i].toString()); // size
            row.push(descendents[i].toString()); // descendents
        }

        // As
        let x0 = "x0";
        let y0 = "y0";
        let x1 = "x1";
        let y1 = "y1";
        let depth = "depth";
        let _children = "children";
        let size = "size";
        let _descendents = "descendents";
        if (this._transformJSON.as) {
            const as = this._transformJSON.as;
            if (as && Array.isArray(as)) {
                if (as.length > 0) { x0 = as[0]; }
                if (as.length > 1) { y0 = as[1]; }
                if (as.length > 2) { x1 = as[2]; }
                if (as.length > 3) { y1 = as[3]; }
                if (as.length > 4) { depth = as[4]; }
                if (as.length > 5) { _children = as[5]; }
                if (as.length > 6) { size = as[6]; }
                if (as.length > 7) { _descendents = as[7]; }
            }
        }

        // Add headings, columnTypes
        dataset.headings.push(x0);
        dataset.columnTypes.push(Core.Data.ColumnType.float);
        dataset.headings.push(y0);
        dataset.columnTypes.push(Core.Data.ColumnType.float);
        dataset.headings.push(x1);
        dataset.columnTypes.push(Core.Data.ColumnType.float);
        dataset.headings.push(y1);
        dataset.columnTypes.push(Core.Data.ColumnType.float);
        dataset.headings.push(depth);
        dataset.columnTypes.push(Core.Data.ColumnType.float);
        dataset.headings.push(_children);
        dataset.columnTypes.push(Core.Data.ColumnType.float);
        dataset.headings.push(size);
        dataset.columnTypes.push(Core.Data.ColumnType.float);
        dataset.headings.push(_descendents);
        dataset.columnTypes.push(Core.Data.ColumnType.float);
        console.log(`partition ${dataset.length} rows ${Core.Time.formatDuration(performance.now() - start)}`);
        return dataset;
    }
}