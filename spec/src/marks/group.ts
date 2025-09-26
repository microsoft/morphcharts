import * as Core from "core";
import { Axis } from "../axis.js";
import { Dataset } from "../dataset.js";
import { IScene, Plot } from "../plot.js";
import { Arc } from "./arc.js";
import { Area } from "./area.js";
import { MarkEncodings, MarkEncodingValue } from "./encoding.js";
import { Line } from "./line.js";
import { Bounds, Mark, MarkFrom } from "./mark.js";
import { Rect } from "./rect.js";
import { Text } from "./text.js";
import { Signal } from "../signal.js";
import { Color } from "../color.js";
import { Scale } from "../scales/scale.js";
import { Band } from "../scales/band.js";
import { Linear } from "../scales/linear.js";
import { Point } from "../scales/point.js";
import { Expression } from "../expression.js";
import { Ordinal } from "../scales/ordinal.js";
import { Rule } from "./rule.js";
import { Quantile } from "../scales/quantile.js";
import { Projection } from "../projections/projection.js";
import { Image } from "../image.js";
import { Config } from "../config.js";

export class Group extends Mark {
    public config: Config;
    public group: Group;
    public marks: Mark[];
    public axes: Axis[];
    public datasets: { [key: string]: Dataset };
    public scales: { [key: string]: Scale };
    public signals: { [key: string]: Signal };
    public projections: { [key: string]: Projection };
    public images: { [key: string]: Image };

    // Encodings
    public x: number;
    public x2: number;
    public xc: number;
    public width: number;
    public y: number;
    public y2: number;
    public yc: number;
    public height: number;
    public z: number;
    public zc: number;
    public z2: number;
    public depth: number;

    constructor(group: Group) {
        super();

        // Signals
        this.signals = {};

        // Parent
        this.group = group;
    }

    public parseSignalValue(signal: string): any {
        const s = this.getSignal(signal);
        if (s) { return s.value; }
        // Not found, try evaluating as an expression
        const value = new Expression().parseExpression(signal, this)();
        console.log(`signal value ${value}`);
        return value;
    }

    public colorValues(markEncodingValue: MarkEncodingValue, dataset: Dataset): Core.ColorRGB[] {
        const colorValues: Core.ColorRGB[] = new Array(dataset.length);
        for (let i = 0; i < colorValues.length; i++) { colorValues[i] = this.colorValue(markEncodingValue, dataset, i); }
        return colorValues;
    }

    public colorValue(markEncodingValue: MarkEncodingValue, dataset: Dataset, i: number): Core.ColorRGB {
        const value = markEncodingValue.value;
        const color = markEncodingValue.color;
        const scale = markEncodingValue.scale;
        let colorValue: Core.ColorRGB;
        if (color) {
            // RGB
            const r = color.r, g = color.g, b = color.b;
            if (r != undefined && g != undefined && b != undefined) {
                const rValue = this.value(r, dataset, i);
                const gValue = this.value(g, dataset, i);
                const bValue = this.value(b, dataset, i);
                colorValue = [rValue / 0xff, gValue / 0xff, bValue / 0xff];
            }
            else {
                // HSL
                const h = color.h, s = color.s, l = color.l;
                if (h != undefined && s != undefined && l != undefined) {
                    const hValue = this.value(h, dataset, i);
                    const sValue = this.value(s, dataset, i);
                    const lValue = this.value(l, dataset, i);
                    const rgb: Core.ColorRGB = [0, 0, 0];
                    Core.Color.hsvToRgb(hValue, sValue, lValue, rgb);
                    colorValue = rgb;
                }
            }
        }
        else if (scale) {
            const range = scale.range;
            if (range) {
                const scheme = range.scheme;
                if (scale.type == "ordinal" && range.colors) {
                    // Use colors array
                    const value = this.value(markEncodingValue, dataset, i);
                    colorValue = range.colors[value % range.colors.length];
                }
                else if (scheme) {
                    if (Array.isArray(scheme)) {
                        // Parse color values
                    }
                    else {
                        // Check for valid name
                        const palette = Core.Palettes[scheme.toLowerCase()];
                        if (palette) {
                            const value = this.value(markEncodingValue, dataset, i);
                            switch (scale.type) {
                                // Continuous scales
                                case "linear":
                                    colorValue = Core.Palette.sample(palette.colors, value, true);
                                    break;

                                // Discrete scales
                                case "ordinal":
                                    colorValue = palette.colors[value % palette.colors.length];
                                    break;

                                // Discretizing scales
                                case "quantile":
                                    colorValue = range.colors[value];
                                    break;

                                case "quantize":
                                    break;
                            }
                        }
                    }
                }
            }
        }
        else if (value) {
            colorValue = Color.parse(value);
        }
        return colorValue;
    }

    public values(markEncodingValue: MarkEncodingValue, dataset: Dataset): Float32Array {
        // TODO: Allow scale dataset to override mark dataset
        const values = new Float32Array(dataset.length);
        for (let i = 0; i < values.length; i++) { values[i] = this.value(markEncodingValue, dataset, i); }
        return values;
    }

    /**
     * Base value (can be null) preference order is signal: String, color: ColorValue, field: FieldValue, value: Any
     * Once base value is established a scale lookup can be performed using scale: String | FieldValue, band: number
     * If the base value is defined, the multiplied band width is added to the output of the scale transform
     * Value modifiers can then be applied using exponent: Number | Value, mult: Number | Value, offset: Number | Value, round: Boolean
     * pow(scale(baseValue), exponent) * mult + offset
     * @param markEncodingValue 
     * @param scales 
     * @param dataset 
     * @param i 
     * @returns 
     */
    public value(markEncodingValue: MarkEncodingValue, dataset: Dataset, i: number): number {
        const scale = markEncodingValue.scale;
        const band = markEncodingValue.band;
        const field = markEncodingValue.field;
        const value = markEncodingValue.value;
        const mult = markEncodingValue.mult;
        const offset = markEncodingValue.offset;
        const round = markEncodingValue.round;
        const signal = markEncodingValue.signal;

        // Base value
        let baseValue: number | string;
        if (signal) {
            baseValue = signal.update(this, dataset, i);
        }
        else if (field) {
            let baseDataset: Dataset;
            let baseColumnIndex: number;
            // Is this a datum reference?
            if (field.startsWith("datum") && dataset.datum) {
                baseDataset = dataset.datum;
                let datumField;
                // datum reference can be either "datum['field']" or "datum.field"
                if (field.startsWith("datum['")) { datumField = field.substring(7, field.length - 2); }
                else { datumField = field.substring(6); }
                baseColumnIndex = baseDataset.getColumnIndex(datumField);
            }
            else {
                // If the field is a string, it is a column name
                baseDataset = dataset;
                baseColumnIndex = dataset.getColumnIndex(field);
            }
            if (baseColumnIndex == -1) {
                console.log(`mark encoding field ${field} not found`);
                throw new Error(`mark encoding field ${field} not found`);
            }
            switch (baseDataset.getColumnType(baseColumnIndex)) {
                case Core.Data.ColumnType.float:
                case Core.Data.ColumnType.integer:
                case Core.Data.ColumnType.date:
                    // Numeric value
                    baseValue = baseDataset.all.columnValues(baseColumnIndex, false)[i];
                    break;
                case Core.Data.ColumnType.string:
                    // String value
                    baseValue = baseDataset.all.distinctStrings(baseColumnIndex)[baseDataset.all.columnValues(baseColumnIndex, true)[i]];
                    break;
            }
        }
        else if (value != undefined) {
            // Number or string value
            baseValue = value;
        }

        // Perform a scale lookup on base value (doing ordered lookup if scale domain is ordered, reversing if scale is reversed)
        let scaledValue: number;
        if (scale) {
            // Only map baseValue if it is defined
            scaledValue = baseValue != undefined ? scale.map(baseValue) : 0;

            // Band
            if (band) {
                let bandValue = 0;
                if (typeof band == "number") { bandValue = band; }
                else { bandValue = this.value(band, dataset, i); } // Object
                scaledValue += (scale as Band).bandwidth() * bandValue;
            }
        }
        else {
            // If baseValue is numeric, use it as is, otherwise use 0
            if (typeof baseValue == "number") {
                scaledValue = baseValue;
            }
            else {
                scaledValue = 0; // Default
            }
        }

        // Mult modifier
        if (mult != undefined) {
            if (typeof mult == "number") {
                scaledValue *= mult;
            }
            else {
                // Object
                const multValue = this.value(mult, dataset, i);
                scaledValue *= multValue;
            }
        }

        // Offset modifier
        if (offset) {
            if (typeof offset == "number") {
                scaledValue += offset;
            }
            else {
                const offsetValue = this.value(offset, dataset, i);
                scaledValue += offsetValue;
            }
        }

        // Round modifier
        if (round) {
            // Round to nearest integer
            scaledValue = Math.round(scaledValue);
        }

        // Final value
        return scaledValue;
    }

    public process(plot: Plot, scene: IScene) {
        // Axes
        if (this.axes) {
            for (let i = 0; i < this.axes.length; i++) {
                const axis = this.axes[i];
                axis.process(this, plot, scene);
            }
        }

        // Images
        if (this.images) {
            for (const name in this.images) {
                const image = this.images[name];
                image.process(this, scene);
            }
        }

        // Show bounds
        if (this.bounds) {
            // RH coordinates (+z from screen to eye, -z from eye to screen)
            //    +y
            //     |
            //     |____ +x
            //    / 
            //  +z 
            //      4---------------5 
            //     /|              /| 
            //    / |             / | 
            //   /  |            /  | 
            //  0---------------1   | 
            //  |   |           |   | 
            //  |   7-----------|---6 
            //  |  /            |  /  
            //  | /             | /   
            //  |/              |/    
            //  3---------------2     
            //     
            const positions = [
                0, 1, 1, // 0
                1, 1, 1, // 1
                1, 0, 1, // 2
                0, 0, 1, // 3
                0, 1, 0, // 4
                1, 1, 0, // 5
                1, 0, 0, // 6
                0, 0, 0, // 7
            ];
            // Dimensions
            // Scaling from pixels to model size
            // TODO: This will always be the same, so move to plot/scene and store a scaling value there.
            const maxDimension = Math.max(plot.width, plot.height, plot.depth);
            const scaling = plot.size / maxDimension;
            const width = this.width || 1;
            const height = this.height || 1;
            const depth = this.depth || 1;
            for (let i = 0; i < positions.length / 3; i++) {
                positions[i * 3] *= width;
                positions[i * 3 + 1] *= height;
                positions[i * 3 + 2] *= depth;
            }
            const lineIds = [0, 1, 1, 2, 2, 3, 3, 0, 4, 5, 5, 6, 6, 7, 7, 4, 0, 4, 1, 5, 2, 6, 3, 7];
            const ids = new Uint32Array(lineIds.length * 0.5);
            for (let i = 0; i < ids.length; i++) { ids[i] = i; }
            const bufferOptions: Core.IBufferOptions = {
                ids: ids,
                isInteractive: this.interactive,
            }
            const buffer = new Core.Buffer(bufferOptions);
            buffer.unitType = "box";
            const rotations = new Float32Array(ids.length * 4);
            const positionsX = new Float32Array(ids.length);
            const positionsY = new Float32Array(ids.length);
            const positionsZ = new Float32Array(ids.length);
            const lengths = new Float32Array(ids.length);
            let toPosition: number, fromPosition: number;
            const direction: Core.Vector3 = [0, 0, 0];
            const identity: Core.Vector3 = [0, 1, 0];
            const rotation = Core.quaternion.createIdentity();
            for (let i = 0; i < lineIds.length * 0.5; i++) {
                const fromId = lineIds[i * 2];
                const toId = lineIds[i * 2 + 1];
                toPosition = positions[toId * 3];
                fromPosition = positions[fromId * 3];
                positionsX[i] = (fromPosition + toPosition) / 2;
                direction[0] = toPosition - fromPosition;
                toPosition = positions[toId * 3 + 1];
                fromPosition = positions[fromId * 3 + 1];
                positionsY[i] = (fromPosition + toPosition) / 2;
                direction[1] = toPosition - fromPosition;
                toPosition = positions[toId * 3 + 2];
                fromPosition = positions[fromId * 3 + 2];
                positionsZ[i] = (fromPosition + toPosition) / 2;
                direction[2] = toPosition - fromPosition;
                let length = Core.vector3.length(direction);
                lengths[i] = length;
                direction[0] /= length;
                direction[1] /= length;
                direction[2] /= length;
                Core.quaternion.rotationTo(identity, direction, rotation);
                rotations[i * 4] = rotation[0];
                rotations[i * 4 + 1] = rotation[1];
                rotations[i * 4 + 2] = rotation[2];
                rotations[i * 4 + 3] = rotation[3];
            }
            const scatter = new Core.Layouts.Scatter();
            const layoutOptions: Core.Layouts.IScatterLayoutOptions = {
                positionsX: positionsX,
                positionsY: positionsY,
                positionsZ: positionsZ,
                positionScalingX: scaling,
                positionScalingY: scaling,
                positionScalingZ: scaling,
                sizesY: lengths,
                sizeScalingY: scaling,
                sizeScalingX: this.bounds.width * scaling,
                sizeScalingZ: this.bounds.width * scaling,
                rotations: rotations,
            }
            scatter.layout(buffer, ids, layoutOptions);
            // Material
            const material = new Core.Material();
            material.fill = this.bounds.stroke;
            const vertexOptions: Core.Layouts.IScatterVertexOptions = {
                // Shift by group offset
                minBoundsX: -scaling * this.x,
                maxBoundsX: scaling * (plot.width - this.x),
                minBoundsY: -scaling * this.y,
                maxBoundsY: scaling * (plot.height - this.y),
                minBoundsZ: -scaling * this.z,
                maxBoundsZ: scaling * (plot.depth - this.z),
                material: material,
            }
            scatter.update(buffer, ids, vertexOptions);
            scene.buffers.push(buffer);
        }

        // Child marks
        const marks = this.marks;
        if (marks) {
            for (let i = 0; i < marks.length; i++) {
                const mark = marks[i];
                mark.process(plot, scene);
            }
        }
    }

    // Recursively find a scale in this or parent group, stopping at the root group
    public getDataset(name: string): Dataset {
        if (this.datasets) {
            const dataset = this.datasets[name];
            if (dataset) { return dataset; }
        }
        if (this.group) { return this.group.getDataset(name); }
        // Not found
        return null;
    }

    // Recursively find a scale in this or parent group, stopping at the root group
    public getScale(name: string): Scale {
        if (this.scales) {
            const scale = this.scales[name];
            if (scale) { return scale; }
        }
        if (this.group) { return this.group.getScale(name); }
        // Not found
        return null;
    }

    // Recursively find a signal in this or parent group, stopping at the root group
    public getSignal(string: string): Signal {
        const name = string;
        if (this.signals) {
            const signal = this.signals[name];
            if (signal) { return signal; }
        }
        if (this.group) { return this.group.getSignal(name); }
        // Not found
        return null;
    }

    // Recursively find an image in this or parent group, stopping at the root group
    public getImage(string: string): Image {
        const name = string;
        if (this.images) {
            const image = this.images[name];
            if (image) { return image; }
        }
        if (this.group) { return this.group.getImage(name); }
        // Not found
        return null;
    }

    // Recursively find a projection in this or parent group, stopping at the root group
    public getProjection(string: string): Projection {
        const name = string;
        if (this.projections) {
            const projection = this.projections[name];
            if (projection) { return projection; }
        }
        if (this.group) { return this.group.getProjection(name); }
        // Not found
        return null;
    }

    public static async fromJSONAsync(plot: Plot, group: Group, datasets: { [key: string]: string }, markJSON: any): Promise<Group> {
        return new Promise<Group>(async (resolve, reject) => {
            try {
                const mark = new Group(group);
                await mark._fromJSONAsync(markJSON);

                // Datasets
                mark.datasets = {};

                // Facets
                if (markJSON.from && markJSON.from.facet) {
                    mark.from = MarkFrom.fromJSON(markJSON.from);
                    const facet = mark.from.facet;
                    // Data-driven facets
                    if (facet.groupby) {
                        // Create an array of ids for each group
                        const dataset = mark.getDataset(facet.data);
                        if (!dataset) { throw new Error(`facet data ${facet.data} not found`); }

                        // Group by columns
                        const groupbyColumnIndices = [];
                        const groupbyColumnValues = [];
                        const groupbyMultipliers = []; // Spatial index multiplier
                        let multiplier = 1;
                        let groupbyArray = Array.isArray(facet.groupby) ? facet.groupby : [facet.groupby];
                        for (let i = 0; i < groupbyArray.length; i++) {
                            const columnIndex = dataset.getColumnIndex(groupbyArray[i]);
                            if (columnIndex == -1) { throw new Error(`facet groupby column ${groupbyArray[i]} not found`); }
                            groupbyColumnIndices.push(columnIndex);
                            // Force discrete to get count of unique values to allow creation of spatial index
                            groupbyColumnValues.push(dataset.all.columnValues(columnIndex, true));
                            const distinctValues = dataset.all.distinctStrings(columnIndex).length;
                            groupbyMultipliers.push(multiplier);
                            multiplier *= distinctValues;
                        }

                        // Generate spatial indices and generate groupby rows
                        const spatialIndices = new Array(dataset.length);
                        const spatialIndexSet = new Set<number>();
                        const facetIdsLookup: { [key: number]: number[] } = {};
                        for (let i = 0; i < dataset.length; i++) {
                            // Calculate spatial index
                            let spatialIndex = 0;
                            for (let j = 0; j < groupbyArray.length; j++) {
                                const value = groupbyColumnValues[j][i];
                                spatialIndex += groupbyMultipliers[j] * value;
                            }
                            spatialIndices[i] = spatialIndex;

                            // Generate groupby row for new indices
                            if (!spatialIndexSet.has(spatialIndex)) {
                                // Create a new array for the group
                                facetIdsLookup[spatialIndex] = [];
                                spatialIndexSet.add(spatialIndex);
                            }
                            facetIdsLookup[spatialIndex].push(i);
                        }

                        // TODO: Create a new dataset if required
                        mark.datasets = { [facet.name]: dataset };

                        // Create a new group for each facet
                        mark.marks = [];
                        for (const spatialIndex of spatialIndexSet) {
                            const facetGroup = new Group(mark);
                            facetGroup.from = new MarkFrom();
                            facetGroup.from.data = facet.name;

                            // Create a new dataset for each group
                            const facetIds = facetIdsLookup[spatialIndex];
                            const facetRows: string[][] = [];
                            for (let i = 0; i < facetIds.length; i++) {
                                facetRows.push(dataset.rows[facetIds[i]].slice());
                            }
                            const facetDataset = new Dataset(dataset.headings.slice(), facetRows, dataset.columnTypes.slice());
                            facetGroup.datasets = { [facet.name]: facetDataset };

                            await this._fromJSONAsync(facetGroup, plot, group, datasets, markJSON);
                            mark.marks.push(facetGroup);
                        }
                    }
                }
                else {
                    // No facets, just a single group mark
                    await this._fromJSONAsync(mark, plot, group, datasets, markJSON);
                }
                resolve(mark);
            }
            catch (error) {
                console.log("error parsing group mark JSON", error);
                reject(error);
            }
        });
    }

    protected static async _fromJSONAsync(mark: Group, plot: Plot, group: Group, datasets: { [key: string]: string }, markJSON: any): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            try {
                // Create config
                if (group) {
                    // Share config with parent group
                    mark.config = group.config;
                }
                else {
                    // Create new config, overriding with any supplied config
                    mark.config = Config.fromJSON(markJSON.config);
                }

                // Encodings
                mark.x = markJSON.x || 0; // Default to 0
                mark.y = markJSON.y || 0; // Default to 0
                mark.z = markJSON.z || 0; // Default to 0
                mark.width = markJSON.width || (group ? group.width : 1); // Default to group width or 1 for root group
                mark.height = markJSON.height || (group ? group.height : 1); // Default to group height or 1 for root group
                mark.depth = markJSON.depth || (group ? group.depth : 1); // Default to group depth or 1 for root group

                // Custom signals
                const signalsJSON = markJSON.signals;
                if (signalsJSON) {
                    for (let i = 0; i < signalsJSON.length; i++) {
                        const signalJSON = signalsJSON[i];
                        const signal = Signal.fromJSON(mark, signalJSON);
                        mark.signals[signal.name] = signal;
                        console.log(`added signal ${signal.name} ${signal.value}`);

                        // Apply width, height, depth signals to mark
                        if (signal.name == "width") { mark.width = signal.value; }
                        else if (signal.name == "height") { mark.height = signal.value; }
                        else if (signal.name == "depth") { mark.depth = signal.value; }
                        else if (signal.name == "x") { mark.x = signal.value; }
                        else if (signal.name == "y") { mark.y = signal.value; }
                        else if (signal.name == "z") { mark.z = signal.value; }
                    }
                }

                // Create default signals if not defined
                // Width
                if (!mark.signals["width"]) {
                    let signal = new Signal();
                    signal.name = "width";
                    signal.update = () => mark.width;
                    signal.value = signal.update();
                    mark.signals[signal.name] = signal;
                    console.log(`added signal ${signal.name} ${signal.value}`);
                }

                // Height
                if (!mark.signals["height"]) {
                    let signal = new Signal();
                    signal = new Signal();
                    signal.name = "height";
                    signal.update = () => mark.height;
                    signal.value = signal.update();
                    mark.signals[signal.name] = signal;
                    console.log(`added signal ${signal.name} ${signal.value}`);
                }

                // Depth
                if (!mark.signals["depth"]) {
                    let signal = new Signal();
                    signal.name = "depth";
                    signal.update = () => mark.depth;
                    signal.value = signal.update();
                    mark.signals[signal.name] = signal;
                    console.log(`added signal ${signal.name} ${signal.value}`);
                }

                // Projections
                mark.projections = {};
                const projectionsJSON = markJSON.projections;
                if (projectionsJSON) {
                    for (let i = 0; i < projectionsJSON.length; i++) {
                        const projectionJSON = projectionsJSON[i];
                        const projection = Projection.fromJSON(mark, projectionJSON);
                        if (projection) {
                            mark.projections[projection.name] = projection;
                            console.log(`added projection ${projection.name}`);
                        }
                    }
                }

                // Images
                mark.images = {};
                const imagesJSON = markJSON.images;
                if (imagesJSON) {
                    for (let i = 0; i < imagesJSON.length; i++) {
                        const imageJSON = imagesJSON[i];
                        const image = Image.fromJSON(mark, imageJSON);
                        if (image) {
                            mark.images[image.name] = image;
                            console.log(`added image ${image.name}`);
                        }
                    }
                }

                // Data
                const datasetsJSON = markJSON.data;
                if (datasetsJSON) {
                    for (let i = 0; i < datasetsJSON.length; i++) {
                        const datasetJSON = datasetsJSON[i];
                        await Dataset.fromJSONAsync(plot, mark, datasets, datasetJSON);
                    }
                }

                // Scales
                // Ensure scales are defined before encodings
                mark.scales = {};
                const scalesJSON = markJSON.scales;
                if (scalesJSON) {
                    for (let i = 0; i < scalesJSON.length; i++) {
                        const scaleJSON = scalesJSON[i];
                        let scale: Scale;
                        switch (scaleJSON.type) {
                            case "linear":
                            default:
                                // Default to linear scale
                                scale = Linear.fromJSON(mark, scaleJSON);
                                break;
                            case "band":
                                scale = Band.fromJSON(mark, scaleJSON);
                                break;
                            case "point":
                                scale = Point.fromJSON(mark, scaleJSON);
                                break;
                            case "ordinal":
                                scale = Ordinal.fromJSON(mark, scaleJSON);
                                break;
                            case "quantile":
                                scale = Quantile.fromJSON(mark, scaleJSON);
                                break;
                        }
                        if (scale) {
                            mark.scales[scale.name] = scale;
                            console.log(`added ${scale.type} scale ${scale.name}`);
                        }
                        else { console.log(`unknown scale type ${scaleJSON.type}`); }
                    }
                }

                // Encodings
                // This is where data-driven encodings are defined, e.g. x, y, z, width, height, depth, color, stroke, fill etc
                mark.encode = new MarkEncodings();
                if (markJSON.encode) {
                    let dataset: Dataset;
                    if (mark.from && mark.from.data) {
                        dataset = mark.getDataset(mark.from.data);
                        if (!dataset) { throw new Error(`dataset ${mark.from.data} not found`); }
                    }
                    else {
                        // Create empty dataset
                        dataset = new Dataset([""], [[""]], [Core.Data.ColumnType.string]);
                    }

                    // Combine enter and update
                    const encodeJSON: any = {};
                    Object.assign(encodeJSON, markJSON.encode.enter, markJSON.encode.update);
                    if (encodeJSON) {
                        // Position, size
                        if (encodeJSON.x) {
                            mark.x = mark.value(MarkEncodingValue.fromJSON(mark, mark, encodeJSON.x), dataset, 0);
                            console.log(`group x ${mark.x}`);
                        }
                        if (encodeJSON.y) {
                            mark.y = mark.value(MarkEncodingValue.fromJSON(mark, mark, encodeJSON.y), dataset, 0);
                            console.log(`group y ${mark.y}`);
                        }
                        if (encodeJSON.z) {
                            mark.z = mark.value(MarkEncodingValue.fromJSON(mark, mark, encodeJSON.z), dataset, 0);
                            console.log(`group z ${mark.z}`);
                        }
                        if (encodeJSON.width) {
                            mark.width = mark.value(MarkEncodingValue.fromJSON(mark, mark, encodeJSON.width), dataset, 0);
                            console.log(`group width ${mark.width}`);
                        }
                        if (encodeJSON.height) {
                            mark.height = mark.value(MarkEncodingValue.fromJSON(mark, mark, encodeJSON.height), dataset, 0);
                            console.log(`group height ${mark.height}`);
                        }
                        if (encodeJSON.depth) {
                            mark.depth = mark.value(MarkEncodingValue.fromJSON(mark, mark, encodeJSON.depth), dataset, 0);
                            console.log(`group depth ${mark.depth}`);
                        }
                        
                        // Bounds
                        if (encodeJSON.strokeWidth) {
                            mark.bounds = new Bounds();
                            mark.bounds.width = mark.value(MarkEncodingValue.fromJSON(mark, mark, encodeJSON.strokeWidth), dataset, 0);
                            if (encodeJSON.stroke) {
                                const stroke = MarkEncodingValue.fromJSON(mark, mark, encodeJSON.stroke);
                                mark.bounds.stroke = mark.colorValue(stroke, dataset, 0);
                            }
                            else {
                                mark.bounds.stroke = Plot.STROKE_COLOR;
                            }
                        }
                    }
                }

                // Root group, set plot dimensions for common coordinate system
                if (!group) {
                    plot.width = mark.width;
                    plot.height = mark.height;
                    plot.depth = mark.depth;
                }
                else {
                    // Add parent offsets to child group
                    mark.x += group.x;
                    mark.y += group.y;
                    mark.z += group.z;
                }

                // Axes
                const axesJSON = markJSON.axes;
                if (axesJSON) {
                    mark.axes = [];
                    for (let i = 0; i < axesJSON.length; i++) {
                        const axisJSON = axesJSON[i];
                        const axis = Axis.fromJSON(mark, axisJSON);
                        mark.axes.push(axis);
                        console.log(`added axis ${axis.orient}, ${axis.orientZ}`);
                    }
                }

                // Child marks
                if (markJSON.marks) {
                    mark.marks = [];
                    for (let i = 0; i < markJSON.marks.length; i++) {
                        const child = markJSON.marks[i];
                        switch (child.type) {
                            case "group":
                                mark.marks.push(await Group.fromJSONAsync(plot, mark, datasets, child));
                                break;
                            case "arc":
                                mark.marks.push(await Arc.fromJSONAsync(mark, child));
                                break;
                            case "area":
                                mark.marks.push(await Area.fromJSONAsync(mark, child));
                                break;
                            case "line":
                                mark.marks.push(await Line.fromJSONAsync(mark, child));
                                break;
                            case "rect":
                                mark.marks.push(await Rect.fromJSONAsync(mark, child));
                                break;
                            case "rule":
                                mark.marks.push(await Rule.fromJSONAsync(mark, child));
                                break;
                            case "text":
                                mark.marks.push(await Text.fromJSONAsync(mark, child));
                                break;
                        }
                    }
                }
                console.log(`added group mark`);
                resolve();
            }
            catch (error) {
                console.log("error parsing group mark JSON", error);
                reject(error);
            }
        });
    }
}