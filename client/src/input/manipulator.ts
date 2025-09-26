import * as Core from "core";

export class Manipulator {
    public id: number;
    public position: Core.Vector3;
    public previousPosition: Core.Vector3;
    public initialPosition: Core.Vector3;
    public maxTranslationSquared: number;
    public holdOrigin: Core.Vector3;
    public positionRelativeToCentroid: Core.Vector3;
    public previousPositionRelativeToCentroid: Core.Vector3;
    public rotationAxis: Core.Vector3;
    public previousRotationAxis: Core.Vector3;
    public button: number;
    public shiftKey: boolean;
    public ctrlKey: boolean;
    public altKey: boolean;
    public pickedIndex: number;
    public type: string;
    public isPersisted: boolean;
    public isPicking: boolean;
    public isPicked: boolean;
    public holdBeginTime: number;
    public event: Event;

    constructor() {
        this.pickedIndex = 0;
        this.maxTranslationSquared = 0;
        this.initialPosition = [0, 0, 0];
        this.position = [0, 0, 0];
        this.previousPosition = [0, 0, 0];
        this.holdOrigin = [0, 0, 0];
        this.positionRelativeToCentroid = [0, 0, 0];
        this.previousPositionRelativeToCentroid = [0, 0, 0];
        this.rotationAxis = [0, 0, 0];
        this.previousRotationAxis = [0, 0, 0];
    }
}