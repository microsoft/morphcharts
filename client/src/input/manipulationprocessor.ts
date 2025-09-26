import * as Core from "core";

import { Manipulator } from "./manipulator.js";
import { MathUtils } from "core/dist/math.js";

export class IManipulationProcessorOptions {
    dragToleranceSquared?: number;
    manipulatorMinRelativeDistanceSquared?: number;
}

export class ManipulationProcessor {
    private _previousCentroid: Core.Vector3;
    private _centroid: Core.Vector3;
    private _relativePositionToCentroid: Core.Vector3;
    private _directionToCentroid: Core.Vector3;
    private _previousDirectionToCentroid: Core.Vector3;
    private _previousCount: number;
    private _manipulators: { [key: string]: Manipulator };
    private _removedManipulators: number[];
    private _count: number;
    private _isDragging: boolean;
    public cumulativeTranslation: Core.Vector3; // [0,1]
    public translationDelta: Core.Vector3; // [0,1]
    public minScale: number;
    public maxScale: number;
    public cumulativeScale: number;
    public scaleDelta: number;
    public twistAxis: Core.Vector3;
    public cumulativeTwist: number;
    public twistDelta: number;
    public centroid: Core.Vector3;
    public addManipulator: (manipulator: Manipulator) => boolean;
    public removeManipulator: (manipulator: Manipulator) => void;
    public prepareManipulation: () => void;
    public beginManipulation: () => void;
    public processManipulation: (elapsedTime: number) => void;
    public endManipulation: () => void;
    public get manipulators() { return this._manipulators; }
    public get count() { return this._count; }
    public get isDragging() { return this._isDragging; }

    // Config
    public dragToleranceSquared: number;
    public manipulatorMinRelativeDistanceSquared: number;

    constructor(options?: IManipulationProcessorOptions) {

        this.dragToleranceSquared = options?.dragToleranceSquared ?? 100;
        this.manipulatorMinRelativeDistanceSquared = options?.manipulatorMinRelativeDistanceSquared ?? 100;

        this._count = 0;
        this._centroid = [0, 0, 0];
        this._previousCentroid = [0, 0, 0];
        this._relativePositionToCentroid = [0, 0, 0];
        this._directionToCentroid = [0, 0, 0];
        this._previousDirectionToCentroid = [0, 0, 0];
        this._manipulators = {};
        this._removedManipulators = [];
        this.cumulativeTranslation = [0, 0, 0];
        this.translationDelta = [0, 0, 0];
        this.centroid = [0, 0, 0];
        this.maxScale = Number.MAX_VALUE;
        this.twistAxis = [0, 0, 1];
        this.initialize();
    }

    public update(elapsedTime: number, manipulators: { [key: string]: Manipulator }) {
        // Persisted
        for (const key in this._manipulators) {
            const manipulator = this._manipulators[key];
            if (!manipulators[manipulator.id]) {
                if (this.removeManipulator) {
                    this.removeManipulator(manipulator);
                }
                this._removedManipulators.push(manipulator.id);
            }
        }

        // Removed
        if (this._removedManipulators.length > 0) {
            for (let i = 0; i < this._removedManipulators.length; i++) {
                delete this._manipulators[this._removedManipulators[i]];
                this._count--;
            }
            this._removedManipulators = [];
        }

        // New
        for (const key in manipulators) {
            const manipulator = manipulators[key];
            if (!this._manipulators[manipulator.id]) {
                if (!this.addManipulator || this.addManipulator(manipulator)) {
                    manipulator.initialPosition[0] = manipulator.position[0];
                    manipulator.initialPosition[1] = manipulator.position[1];
                    manipulator.initialPosition[2] = manipulator.position[2];
                    this._manipulators[manipulator.id] = manipulator;
                    this._count++;
                }
            }
        }

        // Deltas
        this.translationDelta[0] = 0;
        this.translationDelta[1] = 0;
        this.translationDelta[2] = 0;
        this.scaleDelta = 0;
        this.twistDelta = 0;

        if (this._count > 0) {
            if (this._previousCount > 0) {
                // Process
                if (this.prepareManipulation) {
                    this.prepareManipulation();
                }
                this._process();
                if (this.processManipulation) {
                    this.processManipulation(elapsedTime);
                }
            }
            else {
                // Begin
                this.initialize();
                if (this.beginManipulation) {
                    this.beginManipulation();
                }
            }
        }
        else {
            if (this._previousCount > 0) {
                // End
                if (this.endManipulation) {
                    this.endManipulation();
                }
            }
        }

        // Dragging
        this._isDragging = (this._count == 1 && Core.vector3.lengthSquared(this.cumulativeTranslation) > this.dragToleranceSquared) || this._count > 1;

        // Previous
        this._previousCount = this._count;
    }

    public initialize() {
        this.centroid[0] = 0;
        this.centroid[1] = 0;
        this.centroid[2] = 0;
        this.cumulativeTranslation[0] = 0;
        this.cumulativeTranslation[1] = 0;
        this.cumulativeTranslation[2] = 0;
        this.cumulativeScale = 1;
        this.cumulativeTwist = 0;
    }

    private _process() {
        // Persisted
        if (this._previousCount > 0) {
            // Persisted, added, removed
            let persisted = 0;
            for (const key in this._manipulators) {
                const manipulator = this._manipulators[key];
                if (manipulator.isPersisted) {
                    persisted++;
                }
            }
            // const added = keys.length - persisted;
            const removed = this._previousCount - persisted;

            // Persisted
            if (persisted > 0) {
                if (removed > 0) {
                    // Previous centroid
                    this._centroid[0] = this._previousCentroid[0];
                    this._centroid[1] = this._previousCentroid[1];
                    this._centroid[2] = this._previousCentroid[2];

                }
                else {
                    // Calculate new centroid for persisted contacts
                    this._centroid[0] = 0;
                    this._centroid[1] = 0;
                    this._centroid[2] = 0;
                    for (const key in this._manipulators) {
                        const manipulator = this._manipulators[key];
                        if (manipulator.isPersisted) {
                            this._centroid[0] += manipulator.position[0];
                            this._centroid[1] += manipulator.position[1];
                            this._centroid[2] += manipulator.position[2];
                        }
                    }
                    this._centroid[0] /= persisted;
                    this._centroid[1] /= persisted;
                    this._centroid[2] /= persisted;
                }

                // Process changes to persisted manipulators
                for (const key in this._manipulators) {
                    const manipulator = this._manipulators[key];

                    // Check if present in previous state
                    if (manipulator.isPersisted) {
                        // Dragging
                        manipulator.maxTranslationSquared = Math.max(manipulator.maxTranslationSquared, Core.vector3.distanceSquared(manipulator.position, manipulator.initialPosition));

                        // Translation
                        this.translationDelta[0] += manipulator.position[0] - manipulator.previousPosition[0];
                        this.translationDelta[1] += manipulator.position[1] - manipulator.previousPosition[1];
                        this.translationDelta[2] += manipulator.position[2] - manipulator.previousPosition[2];

                        // Position relative to centroid
                        this._relativePositionToCentroid[0] = manipulator.position[0] - this._centroid[0];
                        this._relativePositionToCentroid[1] = manipulator.position[1] - this._centroid[1];
                        this._relativePositionToCentroid[2] = manipulator.position[2] - this._centroid[2];
                        const distanceToCentroidSquared = Core.vector3.lengthSquared(this._relativePositionToCentroid);
                        if (distanceToCentroidSquared < this.manipulatorMinRelativeDistanceSquared) {
                            this.scaleDelta += 1;
                        }
                        else {
                            const distanceToCentroid = Math.sqrt(distanceToCentroidSquared);
                            const previousDistanceToCentroidSquared = Core.vector3.lengthSquared(manipulator.previousPositionRelativeToCentroid);
                            const previousDistanceToCentroid = Math.sqrt(previousDistanceToCentroidSquared);

                            // Scale
                            this.scaleDelta += distanceToCentroid / previousDistanceToCentroid;

                            // Twist
                            this._directionToCentroid[0] = this._relativePositionToCentroid[0] / distanceToCentroid;
                            this._directionToCentroid[1] = this._relativePositionToCentroid[1] / distanceToCentroid;
                            this._directionToCentroid[2] = this._relativePositionToCentroid[2] / distanceToCentroid;
                            this._previousDirectionToCentroid[0] = manipulator.previousPositionRelativeToCentroid[0] / previousDistanceToCentroid;
                            this._previousDirectionToCentroid[1] = manipulator.previousPositionRelativeToCentroid[1] / previousDistanceToCentroid;
                            this._previousDirectionToCentroid[2] = manipulator.previousPositionRelativeToCentroid[2] / previousDistanceToCentroid;
                            this.twistDelta += Core.Angles.signedAngleBetweenVectors(this._previousDirectionToCentroid, this._directionToCentroid, this.twistAxis);
                        }
                    }
                }

                // Translation
                this.translationDelta[0] /= persisted;
                this.translationDelta[1] /= persisted;
                this.translationDelta[2] /= persisted;
                this.cumulativeTranslation[0] += this.translationDelta[0];
                this.cumulativeTranslation[1] += this.translationDelta[1];
                this.cumulativeTranslation[2] += this.translationDelta[2];

                // Scale
                this.scaleDelta /= persisted;
                this.cumulativeScale = MathUtils.clamp(this.cumulativeScale * this.scaleDelta, this.minScale, this.maxScale);
                this.scaleDelta -= 1;

                // Twist
                this.twistDelta /= persisted;
                this.cumulativeTwist += this.twistDelta;
            }
        }

        // Centroid for all manipulators
        this.centroid[0] = 0;
        this.centroid[1] = 0;
        this.centroid[2] = 0;
        for (const key in this._manipulators) {
            const manipulator = this._manipulators[key];
            this.centroid[0] += manipulator.position[0];
            this.centroid[1] += manipulator.position[1];
            this.centroid[2] += manipulator.position[2];
        }
        this.centroid[0] /= this._count;
        this.centroid[1] /= this._count;
        this.centroid[2] /= this._count;
        for (const key in this._manipulators) {
            const manipulator = this._manipulators[key];
            manipulator.positionRelativeToCentroid[0] = manipulator.position[0] - this.centroid[0];
            manipulator.positionRelativeToCentroid[1] = manipulator.position[1] - this.centroid[1];
            manipulator.positionRelativeToCentroid[2] = manipulator.position[2] - this.centroid[2];
        }

        // Previous state
        this._previousCentroid[0] = this.centroid[0];
        this._previousCentroid[1] = this.centroid[1];
        this._previousCentroid[2] = this.centroid[2];

        // Previous manipulator state
        for (const key in this._manipulators) {
            const manipulator = this._manipulators[key];
            manipulator.isPersisted = true;
            manipulator.previousPosition[0] = manipulator.position[0];
            manipulator.previousPosition[1] = manipulator.position[1];
            manipulator.previousPosition[2] = manipulator.position[2];

            manipulator.previousRotationAxis[0] = manipulator.rotationAxis[0];
            manipulator.previousRotationAxis[1] = manipulator.rotationAxis[1];
            manipulator.previousRotationAxis[2] = manipulator.rotationAxis[2];

            manipulator.previousPositionRelativeToCentroid[0] = manipulator.positionRelativeToCentroid[0];
            manipulator.previousPositionRelativeToCentroid[1] = manipulator.positionRelativeToCentroid[1];
            manipulator.previousPositionRelativeToCentroid[2] = manipulator.positionRelativeToCentroid[2];
        }
    }
}