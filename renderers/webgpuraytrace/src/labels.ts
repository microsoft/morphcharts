import * as Core from "core";

export class LabelSetVisual extends Core.LabelSetVisual implements Core.ILabelSetVisual {
    public hittables: Core.Hittable[];

    /**
     * Update the label set visual and create renderer-specific hittables
     * TODO: Keep this in sync with the node cpu raytrace version
     */
    public update() {
        const hasChanged = this._hasChanged;
        super.update();
        if (hasChanged && this._isVisible) {
            const start = performance.now();

            // Create hittables
            let glyphs = 0;
            const labels = this.labelSet.labels;
            const maxGlyphs = this.labelSet.maxGlyphs;
            const dataView = this.labelSet.dataView;
            this.hittables = [];
            for (let i = 0; i < this.labelSet.labels.length; i++) {
                // Label lines
                const labelLines = this.labelSet.labels[i];
                for (let j = 0; j < labelLines.length; j++) {
                    // Prevent overflow
                    const label = Core.Text.truncate(labelLines[j], maxGlyphs - glyphs);

                    // Segment color
                    const segmentColor: Core.ColorRGBA = [0, 0, 0, 0];
                    Core.UnitVertex.getSegColor(dataView, glyphs, segmentColor);

                    // Material
                    const material = new Core.Material();
                    Core.UnitVertex.getMaterial(dataView, glyphs, material);

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

                    // Glyphs
                    const glyphCount = label.length;
                    const size: Core.Vector3 = [0, 0, 0];
                    const rotation: Core.Quaternion = [0, 0, 0, 1];
                    for (let k = 0; k < glyphCount; k++) {
                        // Position
                        const position: Core.Vector3 = [0, 0, 0];
                        Core.UnitVertex.getTranslation(dataView, glyphs, position);

                        // Size
                        Core.UnitVertex.getScale(dataView, glyphs, size);

                        // Texture coordinates
                        const texCoords: Core.Vector4 = [0, 0, 0, 0];
                        Core.UnitVertex.getTexCoords(dataView, glyphs, texCoords);

                        // SDF
                        const sdfBuffer = Core.UnitVertex.getSdfBuffer(dataView, glyphs);
                        const sdfHalo = Core.UnitVertex.getSdfHalo(dataView, glyphs);

                        // Rotation
                        Core.UnitVertex.getRotation(dataView, glyphs, rotation);

                        // Hittable
                        const hittableGlyphOptions: Core.IHittableGlyphOptions = {
                            center: position,
                            size: [size[0], size[1]],
                            texCoords: texCoords,
                            material: material,
                            segmentColor: segmentColor,
                            sdfBuffer: sdfBuffer,
                            sdfHalo: sdfHalo,
                            textureType: Core.TextureType.sdf,
                            rotation: rotation,
                        };
                        const hittable = new Core.HittableXyGlyph(hittableGlyphOptions);

                        // Add
                        this.hittables.push(hittable);
                        glyphs++;
                    }
                }
            }
            console.log(`labelsetvisual update ${labels.length} labels ${glyphs} glyphs ${Core.Time.formatDuration(performance.now() - start)}`);
        }
    }
}