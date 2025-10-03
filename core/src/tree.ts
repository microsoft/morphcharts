// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import { Constants } from "./constants.js";
import { quaternion, Quaternion, vector3, Vector3 } from "./matrix.js";
import { Time } from "./time.js";

export interface ITree3DOptions {
    // Hierarchy
    rootId: number;
    childIds: Uint32Array;
    indices: { [key: number]: number },
    children: { [key: number]: number[] },

    // Receiving arrays for node position, size
    positionsX: Float32Array;
    positionsY: Float32Array;
    positionsZ: Float32Array;

    // Optional parameters
    edgeLengthScaling?: number;
    branchAngle?: number; // [-π/2, π/2] radians
    twistAngle?: number; // [-π, π] radians
    randomBranchAngle?: number; // radians
    randomTwistAngle?: number; // radians
    randomSplitAngle?: number; // radians
    randomEdgeLengthScaling?: number;
    edgeLengths?: ArrayLike<number>; // Lengths from node to parent
    branchAngles?: ArrayLike<number>;
    splitAngles?: ArrayLike<number>;
    twistAngles?: ArrayLike<number>;
    minEdgeLength?: number;
}

export class Tree3D {
    public static layout(options: ITree3DOptions): void {
        const start = performance.now();
        const rootId = options.rootId;
        const childIds = options.childIds;
        const indices = options.indices;
        const children = options.children;
        const positionsX = options.positionsX;
        const positionsY = options.positionsY;
        const positionsZ = options.positionsZ;
        const edgeLengthScaling = options.edgeLengthScaling;
        const branchAngle = options.branchAngle;
        const twistAngle = options.twistAngle;
        const minEdgeLength = options.minEdgeLength;
        const randomBranchAngle = options.randomBranchAngle;
        const randomTwistAngle = options.randomTwistAngle;
        const randomSplitAngle = options.randomSplitAngle;
        const randomEdgeLengthScaling = options.randomEdgeLengthScaling;
        const edgeLengths = options.edgeLengths;
        const branchAngles = options.branchAngles;
        const splitAngles = options.splitAngles;
        const twistAngles = options.twistAngles;
        const ids = childIds;
        const lengths = new Float64Array(ids.length);
        const rotations = new Float64Array(ids.length * 4);
        const rights = new Float64Array(ids.length * 3);
        const ups = new Float64Array(ids.length * 3);
        const forwards = new Float64Array(ids.length * 3);
        const twists = new Float64Array(ids.length * 4);
        const rotation1: Quaternion = [0, 0, 0, 0];
        const rotation2: Quaternion = [0, 0, 0, 0];
        const rotation3: Quaternion = [0, 0, 0, 0];
        const direction: Vector3 = [0, 0, 0];
        const up: Vector3 = [0, 0, 0];
        const right: Vector3 = [0, 0, 0];
        const forward: Vector3 = [0, 0, 0];

        const branch = (
            parentId: number,
            indices: { [index: number]: number },
            children: { [index: number]: number[] }
        ) => {
            const childIds = children[parentId];
            const parentIndex = indices[parentId];

            // Parent
            rotation1[0] = rotations[parentIndex * 4];
            rotation1[1] = rotations[parentIndex * 4 + 1];
            rotation1[2] = rotations[parentIndex * 4 + 2];
            rotation1[3] = rotations[parentIndex * 4 + 3];

            // Parent up
            vector3.transformQuaternion(Constants.VECTOR3_UNITY, rotation1, up);
            ups[parentIndex * 3] = up[0];
            ups[parentIndex * 3 + 1] = up[1];
            ups[parentIndex * 3 + 2] = up[2];

            // Twist parent rotation around up
            let twist = twistAngles ? twistAngles[parentIndex] : twistAngle
            twist += (Math.random() * 2 - 1) * randomTwistAngle;
            // Clamp twist to [-π/2, π/2] radians
            twist = Math.max(Math.min(twist, Constants.PI_OVER_TWO), -Constants.PI_OVER_TWO);
            quaternion.setAxisAngle(up, twist, rotation2);
            quaternion.normalize(rotation2, rotation2);
            quaternion.multiply(rotation2, rotation1, rotation3)
            twists[parentIndex * 4] = rotation3[0];
            twists[parentIndex * 4 + 1] = rotation3[1];
            twists[parentIndex * 4 + 2] = rotation3[2];
            twists[parentIndex * 4 + 3] = rotation3[3];

            // Twisted parent right, forward
            vector3.transformQuaternion(Constants.VECTOR3_UNITX, rotation3, right);
            rights[parentIndex * 3] = right[0];
            rights[parentIndex * 3 + 1] = right[1];
            rights[parentIndex * 3 + 2] = right[2];
            vector3.transformQuaternion(Constants.VECTOR3_UNITZ, rotation3, forward);
            forwards[parentIndex * 3] = forward[0];
            forwards[parentIndex * 3 + 1] = forward[1];
            forwards[parentIndex * 3 + 2] = forward[2];

            // Children
            for (let i = 0; i < childIds.length; i++) {
                const childId = childIds[i];
                const childIndex = indices[childId];
                const parentEdgeLength = lengths[parentIndex];
                up[0] = ups[parentIndex * 3];
                up[1] = ups[parentIndex * 3 + 1];
                up[2] = ups[parentIndex * 3 + 2];
                rotation3[0] = twists[parentIndex * 4];
                rotation3[1] = twists[parentIndex * 4 + 1];
                rotation3[2] = twists[parentIndex * 4 + 2];
                rotation3[3] = twists[parentIndex * 4 + 3];

                // Edge length
                let edgeLength = edgeLengths ? edgeLengths[childIndex] : parentEdgeLength * edgeLengthScaling;
                edgeLength = Math.max(edgeLength + (Math.random() * 2 - 1) * randomEdgeLengthScaling, minEdgeLength);
                lengths[childIndex] = edgeLength;

                // Further twist around parent up to distribute around a cone
                let split = splitAngles ? splitAngles[childIndex] : Constants.TWO_PI * i / childIds.length;
                split += (Math.random() * 2 - 1) * randomSplitAngle;
                quaternion.setAxisAngle(up, split, rotation2);
                quaternion.normalize(rotation2, rotation2);
                quaternion.multiply(rotation2, rotation3, rotation1);

                // Tip along cone edge
                let angle = branchAngles ? branchAngles[childIndex] : branchAngle;
                angle += (Math.random() * 2 - 1) * randomBranchAngle;
                // Clamp angle to [-π/2, π/2] radians
                angle = Math.max(Math.min(angle, Constants.PI_OVER_TWO), -Constants.PI_OVER_TWO);
                quaternion.setAxisAngle(Constants.VECTOR3_UNITX, angle, rotation2);
                quaternion.normalize(rotation2, rotation2);
                quaternion.multiply(rotation1, rotation2, rotation1);
                rotations[childIndex * 4] = rotation1[0];
                rotations[childIndex * 4 + 1] = rotation1[1];
                rotations[childIndex * 4 + 2] = rotation1[2];
                rotations[childIndex * 4 + 3] = rotation1[3];

                // Child node position
                vector3.transformQuaternion(Constants.VECTOR3_UNITY, rotation1, direction);
                const childPositionX = positionsX[parentIndex] + direction[0] * edgeLength;
                const childPositionY = positionsY[parentIndex] + direction[1] * edgeLength;
                const childPositionZ = positionsZ[parentIndex] + direction[2] * edgeLength;
                positionsX[childIndex] = childPositionX;
                positionsY[childIndex] = childPositionY;
                positionsZ[childIndex] = childPositionZ;

                // Bounds
                minLayoutBoundsX = Math.min(minLayoutBoundsX, childPositionX);
                minLayoutBoundsY = Math.min(minLayoutBoundsY, childPositionY);
                minLayoutBoundsZ = Math.min(minLayoutBoundsZ, childPositionZ);
                maxLayoutBoundsX = Math.max(maxLayoutBoundsX, childPositionX);
                maxLayoutBoundsY = Math.max(maxLayoutBoundsY, childPositionY);
                maxLayoutBoundsZ = Math.max(maxLayoutBoundsZ, childPositionZ);

                // Recurse
                if (children[childId]) { branch(childId, indices, children); }
            }
        }

        // Root
        const index = indices[rootId];
        positionsX[index] = 0;
        positionsY[index] = 0;
        positionsZ[index] = 0;
        rotations[index * 4] = 0;
        rotations[index * 4 + 1] = 0;
        rotations[index * 4 + 2] = 0;
        rotations[index * 4 + 3] = 1;
        lengths[index] = edgeLengths ? edgeLengths[index] : 1;
        let minLayoutBoundsX = Number.MAX_VALUE;
        let minLayoutBoundsY = Number.MAX_VALUE;
        let minLayoutBoundsZ = Number.MAX_VALUE;
        let maxLayoutBoundsX = -Number.MAX_VALUE;
        let maxLayoutBoundsY = -Number.MAX_VALUE;
        let maxLayoutBoundsZ = -Number.MAX_VALUE;
        branch(rootId, indices, children);
        console.log(`tree ${childIds.length} ${Time.formatDuration(performance.now() - start)}`);
    }
}