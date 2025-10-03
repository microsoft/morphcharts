// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import * as Core from "core";

export class BufferVisual extends Core.BufferVisual implements Core.IBufferVisual {
    public hittables: Core.Hittable[];
    private _debugMaterial: Core.Material;

    constructor(buffer: Core.IBuffer) {
        super(buffer);
        this._debugMaterial = new Core.Material();
    }

    public update() {
        const hasChanged = this._hasChanged;
        super.update();
        if (hasChanged) {
            const start = performance.now();
            const buffer = this._buffer;
            const parameters: number[] = [];
            this.hittables = [];
            for (let i = 0; i < buffer.length; i++) {
                // Position
                const position: Core.Vector3 = [0, 0, 0];
                Core.UnitVertex.getTranslation(buffer.dataView, i, position);

                // Size
                const size: Core.Vector3 = [0, 0, 0];
                Core.UnitVertex.getScale(buffer.dataView, i, size);

                // Rotation
                const rotation: Core.Quaternion = [0, 0, 0, 0];
                Core.UnitVertex.getRotation(buffer.dataView, i, rotation);

                // Rounding
                const rounding = Core.UnitVertex.getRounding(buffer.dataView, i);

                // Material
                const material = new Core.Material();
                Core.UnitVertex.getMaterial(buffer.dataView, i, material);

                // Inverse gamma
                material.fill = [
                    Math.pow(material.fill[0], 2.2),
                    Math.pow(material.fill[1], 2.2),
                    Math.pow(material.fill[2], 2.2),
                ];
                material.stroke = [
                    Math.pow(material.stroke[0], 2.2),
                    Math.pow(material.stroke[1], 2.2),
                    Math.pow(material.stroke[2], 2.2),
                ];

                // Convert glass absorption to attenuation
                // if (hittable.material.type == Core.MaterialType.glass) {
                //     hittable.material.fill[0] = hittable.material.fill[0] == 0 ? 0 : -Math.log(hittable.material.fill[0]);
                //     hittable.material.fill[1] = hittable.material.fill[1] == 0 ? 0 : -Math.log(hittable.material.fill[1]);
                //     hittable.material.fill[2] = hittable.material.fill[2] == 0 ? 0 : -Math.log(hittable.material.fill[2]);
                // }

                // Segment color
                const segment: Core.ColorRGBA = [0, 0, 0, 0];
                Core.UnitVertex.getSegColor(buffer.dataView, i, segment);

                // Texture
                const textureType = Core.UnitVertex.getTextureType(buffer.dataView, i) as Core.TextureType;
                const texCoords: Core.Vector4 = [0, 0, 0, 0];
                Core.UnitVertex.getTexCoords(buffer.dataView, i, texCoords);
                const texOffset: Core.Vector4 = [0, 0, 0, 0];
                Core.UnitVertex.getTexOffset(buffer.dataView, i, texOffset);
                const texScale: Core.Vector4 = [0, 0, 0, 0];
                Core.UnitVertex.getTexScale(buffer.dataView, i, texScale);

                // Hittable types
                let hittable: Core.Hittable;
                switch (buffer.unitType.toLowerCase()) {
                    case "box":
                    default:
                        const hittableBoxOptions: Core.IHittableBoxOptions = {
                            center: position,
                            size: size,
                            segmentColor: segment,
                            material: material,
                            textureType: textureType,
                            texCoords: texCoords,
                            texScale: texScale,
                            texOffset: texOffset,
                            rotation: rotation,
                        };
                        hittable = new Core.HittableBox(hittableBoxOptions);
                        break;
                    case "boxsdf":
                        const hittableBoxSdfOptions: Core.IHittableBoxSdfOptions = {
                            center: position,
                            size: size,
                            rounding: rounding,
                            segmentColor: segment,
                            material: material,
                            textureType: textureType,
                            texCoords: texCoords,
                            texScale: texScale,
                            texOffset: texOffset,
                            rotation: rotation,
                        }
                        hittable = new Core.HittableBoxSdf(hittableBoxSdfOptions);
                        break;
                    case "boxframesdf":
                        parameters[0] = Core.UnitVertex.getParam(buffer.dataView, i, 0); // Thickness, size units
                        const hittableBoxFrameOptions: Core.IHittableBoxFrameSdfOptions = {
                            center: position,
                            size: size,
                            thickness: parameters[0] || Math.min(size[0], size[1], size[2]) * 0.1, // Default to 10% of min size dimension if not specified
                            rounding: rounding,
                            segmentColor: segment,
                            material: material,
                            textureType: textureType,
                            texCoords: texCoords,
                            texScale: texScale,
                            texOffset: texOffset,
                        };
                        hittable = new Core.HittableBoxFrameSdf(hittableBoxFrameOptions);
                        break;
                    case "cappedtorussdf":
                        parameters[0] = Core.UnitVertex.getParam(buffer.dataView, i, 0); // Inner radius, outer radius units
                        parameters[1] = Core.UnitVertex.getParam(buffer.dataView, i, 1); // Start angle
                        parameters[2] = Core.UnitVertex.getParam(buffer.dataView, i, 2); // End angle
                        parameters[3] = Core.UnitVertex.getParam(buffer.dataView, i, 3); // Padding
                        const hittableCappedTorusSdfOptions: Core.IHittableCappedTorusSdfOptions = {
                            center: position,
                            outerRadius: size[0] * 0.5,
                            innerRadius: parameters[0],
                            startAngle: parameters[1],
                            endAngle: parameters[2],
                            padding: parameters[3],
                            segmentColor: segment,
                            material: material,
                            textureType: textureType,
                            texCoords: texCoords,
                            texScale: texScale,
                            texOffset: texOffset,
                            rotation: rotation,
                        };
                        hittable = new Core.HittableCappedTorusSdf(hittableCappedTorusSdfOptions);
                        break;
                    case "cylinder":
                        const hittableCylinderOptions: Core.IHittableCylinderOptions = {
                            center: position,
                            radius: size[0] * 0.5,
                            height: size[1],
                            rotation: rotation,
                            segmentColor: segment,
                            material: material,
                            textureType: textureType,
                            texCoords: texCoords,
                            texScale: texScale,
                            texOffset: texOffset,
                        };
                        hittable = new Core.HittableCylinder(hittableCylinderOptions);
                        break;
                    case "cylindersdf":
                        const hittableCylinderSdfOptions: Core.IHittableCylinderSdfOptions = {
                            center: position,
                            radius: size[0] * 0.5,
                            height: size[1],
                            rounding: rounding,
                            rotation: rotation,
                            segmentColor: segment,
                            material: material,
                            textureType: textureType,
                            texCoords: texCoords,
                            texScale: texScale,
                            texOffset: texOffset,
                        };
                        hittable = new Core.HittableCylinderSdf(hittableCylinderSdfOptions);
                        break;
                    // TODO: hexprism
                    case "hexprismsdf":
                        const hexPrismSsdfOptions: Core.IHittableHexPrismSdfOptions = {
                            center: position,
                            radius: size[0] * 0.5,
                            height: size[1],
                            rounding: rounding,
                            segmentColor: segment,
                            material: material,
                            textureType: textureType,
                            texCoords: texCoords,
                            texScale: texScale,
                            texOffset: texOffset,
                        };
                        hittable = new Core.HittableHexPrismSdf(hexPrismSsdfOptions);
                        break;
                    case "quadsdf":
                        for (let j = 0; j < 4; j++) { parameters[j] = Core.UnitVertex.getParam(buffer.dataView, i, j); } // a, b, c, d  
                        const quadSdfOptions: Core.IHittableQuadSdfOptions = {
                            center: position,
                            size: size,
                            a: parameters[0], // a
                            b: parameters[1], // b
                            c: parameters[2], // c
                            d: parameters[3], // d
                            segmentColor: segment,
                            material: material,
                            textureType: textureType,
                            texCoords: texCoords,
                            texScale: texScale,
                            texOffset: texOffset,
                        };
                        hittable = new Core.HittableQuadSdf(quadSdfOptions);
                        break;
                    case "ringsdf":
                        parameters[0] = Core.UnitVertex.getParam(buffer.dataView, i, 0); // Inner radius, outer radius units
                        parameters[1] = Core.UnitVertex.getParam(buffer.dataView, i, 1); // Start angle
                        parameters[2] = Core.UnitVertex.getParam(buffer.dataView, i, 2); // End angle
                        parameters[3] = Core.UnitVertex.getParam(buffer.dataView, i, 3); // Padding
                        const ringSdfOptions: Core.IHittableRingSdfOptions = {
                            center: position,
                            outerRadius: size[0] * 0.5,
                            thickness: size[2],
                            innerRadius: parameters[0],
                            startAngle: parameters[1],
                            endAngle: parameters[2],
                            padding: parameters[3],
                            segmentColor: segment,
                            material: material,
                            textureType: textureType,
                            texCoords: texCoords,
                            texScale: texScale,
                            texOffset: texOffset,
                            rotation: rotation,
                        };
                        hittable = new Core.HittableRingSdf(ringSdfOptions);
                        break;
                    case "tubesdf":
                        parameters[0] = Core.UnitVertex.getParam(buffer.dataView, i, 0); // Inner radius, outer radius units
                        parameters[2] = Core.UnitVertex.getParam(buffer.dataView, i, 2); // End angle
                        const tubeSdfOptions: Core.IHittableTubeSdfOptions = {
                            center: position,
                            outerRadius: size[0] * 0.5,
                            height: size[1],
                            innerRadius: parameters[0],
                            rounding: rounding,
                            segmentColor: segment,
                            material: material,
                            textureType: textureType,
                            texCoords: texCoords,
                            texScale: texScale,
                            texOffset: texOffset,
                            rotation: rotation
                        };
                        hittable = new Core.HittableTubeSdf(tubeSdfOptions);
                        break;
                    case "sphere":
                        const sphereOptions: Core.IHittableSphereOptions = {
                            center: position,
                            radius: size[0] * 0.5,
                            segmentColor: segment,
                            material: material,
                            textureType: textureType,
                            texCoords: texCoords,
                            texScale: texScale,
                            texOffset: texOffset,
                        };
                        hittable = new Core.HittableSphere(sphereOptions);
                        break;
                    case "xyrect":
                        const xyRectOptions: Core.IHittableRectOptions = {
                            center: position,
                            size: [size[0], size[1]],
                            segmentColor: segment,
                            material: material,
                            textureType: textureType,
                            texCoords: texCoords,
                            texScale: texScale,
                            texOffset: texOffset,
                        };
                        hittable = new Core.HittableXyRect(xyRectOptions);
                        break;
                    case "xzrect":
                        const xzRectOptions: Core.IHittableRectOptions = {
                            center: position,
                            size: [size[0], size[2]],
                            segmentColor: segment,
                            material: material,
                            textureType: textureType,
                            texCoords: texCoords,
                            texScale: texScale,
                            texOffset: texOffset,
                        };
                        hittable = new Core.HittableXzRect(xzRectOptions);
                        break;
                    case "yzrect":
                        const yzRectOptions: Core.IHittableRectOptions = {
                            center: position,
                            size: [size[1], size[2]],
                            segmentColor: segment,
                            material: material,
                            textureType: textureType,
                            texCoords: texCoords,
                            texScale: texScale,
                            texOffset: texOffset,
                        };
                        hittable = new Core.HittableYzRect(yzRectOptions);
                        break;
                }

                // Add
                this.hittables.push(hittable);

                // Debug hittable bounds by adding another hittable of type boxFrame, with same bounds
                const debugBounds = false; // TODO: Add debug flag(s) to mark (can also use to show group bounds)
                if (debugBounds) {
                    const boundsCentroid: Core.Vector3 = [0, 0, 0];
                    const boundsSize: Core.Vector3 = [0, 0, 0];
                    hittable.bounds.centroid(boundsCentroid);
                    hittable.bounds.size(boundsSize);
                    this.hittables.push(new Core.HittableBoxFrameSdf({
                        center: boundsCentroid,
                        size: boundsSize,
                        // TODO: Add debug thickness to renderer
                        thickness: Math.min(size[0], size[1], size[2]) * 0.01, // Default to 1% of min size dimension if not specified
                        material: this._debugMaterial,
                        segmentColor: segment,
                        rounding: 0,
                    }));
                }
            }
            console.log(`buffervisual update ${buffer.length} rows ${Core.Time.formatDuration(performance.now() - start)}`);
            if (this.hasChangedCallback) {
                this.hasChangedCallback();
            }
        }
    }
}

export class TransitionBufferVisual extends Core.TransitionBufferVisual implements Core.ITransitionBufferVisual {
    public hittables: Core.Hittable[];

    public update() {
        const hasChanged = this._hasChanged;
        super.update();
        if (hasChanged) {
            if (this.hasChangedCallback) {
                this.hasChangedCallback();
            }
        }
    }
}