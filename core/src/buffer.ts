import { Color, ColorRGBA } from "./color.js";
import { Pick } from "./pick.js";
import { UnitVertex } from "./vertex.js";

export interface IBufferOptions {
    ids: ArrayLike<number>;
    isInteractive?: boolean;
}

export interface IBuffer {
    ids: ArrayLike<number>;
    length: number;
    unitType: string;
    idColors: ArrayLike<number>;
    dataView: DataView;
    vertices: ArrayBuffer;
    lookup: { [index: number]: number };
    update(): void;
    hasChangedCallback: () => void;
}

export interface IBufferVisual {
    buffer: IBuffer;
    isVisible: boolean;
    update(): void;
}

export interface ITransitionBufferOptions {
    ids: ArrayLike<number>;
    time: number;
    duration: number;
    stagger: number;
    unitType: string;
    isInteractive?: boolean;
}

export interface ITransitionBuffer {
    unitType: string;
    idColors: ArrayLike<number>;
    time: number;
    duration: number;
    stagger: number;
    swap(): void;
    hasChangedCallback: () => void;
}

export interface ITransitionBufferVisual {
    transitionBuffer: ITransitionBuffer;
    isVisible: boolean;
    update(): void;
}

export class Buffer implements IBuffer {
    protected _hasChanged: boolean;
    protected _ids: ArrayLike<number>;
    protected _length: number;
    protected _unitType: string; // TODO: Compute shader would support per-unit types
    protected _idColors: Float32Array;
    protected _vertices: ArrayBuffer;
    protected _dataView: DataView;
    protected _lookup: { [index: number]: number };
    public get lookup() { return this._lookup; } // Index from id
    public get ids() { return this._ids; }
    public get length() { return this._length; }
    public get idColors() { return this._idColors; }
    public get unitType() { return this._unitType; }
    public set unitType(value: string) { if (this._unitType != value) { this._hasChanged = true; this._unitType = value; } }
    public get dataView() { return this._dataView; }
    public get vertices() { return this._vertices; }
    public hasChangedCallback: () => void;

    public constructor(options: IBufferOptions) {
        this._ids = options.ids;
        this._length = options.ids.length;
        this._unitType = "box";
        this._idColors = new Float32Array(this._length * 4);
        this._vertices = new ArrayBuffer(this._length * UnitVertex.SIZE_BYTES);
        this._dataView = new DataView(this._vertices);
        this._lookup = {};
        for (let i = 0; i < this._length; i++) {
            const id = options.ids[i];
            this._lookup[id] = i;

            // Id colors
            const pickId = Pick.nextPickId;
            const rgba: ColorRGBA = [0, 0, 0, 0];
            Color.numberToColorRGBA(pickId, rgba);
            this._idColors[i * 4] = rgba[0];
            this._idColors[i * 4 + 1] = rgba[1];
            this._idColors[i * 4 + 2] = rgba[2];
            this._idColors[i * 4 + 3] = rgba[3];
        }
        this._hasChanged = true;
    }
    public update(): void {
        if (this._hasChanged) {
            this._hasChanged = false;

            if (this.hasChangedCallback) {
                this.hasChangedCallback();
            }
        }
    }
}

export class BufferVisual implements IBufferVisual {
    protected _hasChanged: boolean;
    protected _buffer: IBuffer;
    public get buffer() { return this._buffer; }
    public get isVisible() { return this._isVisible; }
    public set isVisible(value: boolean) { this._isVisible = value; }
    protected _isVisible: boolean;
    public hasChangedCallback: () => void;

    public constructor(buffer: IBuffer) {
        this._buffer = buffer;
        this._isVisible = true;
        this._hasChanged = true;
        buffer.hasChangedCallback = () => { this._hasChanged = true; };
    }
    public update(): void {
        if (this._hasChanged) {
            this._hasChanged = false;

            if (this.hasChangedCallback) {
                this.hasChangedCallback();
            }
        }
    }
}

export class TransitionBuffer implements ITransitionBuffer {
    protected _hasChanged: boolean;
    protected _buffer1: IBuffer;
    protected _buffer2: IBuffer;
    protected _isBuffer1Current: boolean;
    protected _pickIdLookup: { [index: number]: number };
    protected _time: number;
    protected _duration: number;
    protected _stagger: number;
    protected _unitType: string;
    public get time() { return this._time; }
    public set time(value: number) { if (this._time != value) { this._hasChanged = true; this._time = value; } }
    public get duration() { return this._duration; }
    public set duration(value: number) { if (this._duration != value) { this._hasChanged = true; } }
    public get stagger() { return this._stagger; }
    public set stagger(value: number) { if (this._stagger != value) { this._hasChanged = true; } }
    public get length() { return this._buffer1.length; }
    public get unitType() { return this._unitType; }
    public set unitType(value: string) { if (this._unitType != value) { this._hasChanged = true; this._unitType = value; } }
    public get currentBuffer() { return this._isBuffer1Current ? this._buffer1 : this._buffer2; }
    public get previousBuffer() { return this._isBuffer1Current ? this._buffer2 : this._buffer1; }
    public get pickIdLookup() { return this._pickIdLookup; } // Id from pickId
    public get idColors() { return this._buffer1.idColors; }
    public swap(): void { this._isBuffer1Current = !this._isBuffer1Current; }
    public hasChangedCallback: () => void;

    public constructor(options: ITransitionBufferOptions) {
        this._time = options.time;
        this._duration = options.duration;
        this._stagger = options.stagger;
        this._buffer1 = new Buffer({ ids: options.ids, isInteractive: options.isInteractive, });
        this._buffer2 = new Buffer({ ids: options.ids, isInteractive: options.isInteractive, });
        this._isBuffer1Current = true;
        this._hasChanged = true;
    }
    public update(): void {
        if (this._hasChanged) {
            this._hasChanged = false;

            if (this.hasChangedCallback) {
                this.hasChangedCallback();
            }
        }
    }
}

export class TransitionBufferVisual implements ITransitionBufferVisual {
    protected _hasChanged: boolean;
    protected _transitionBuffer: ITransitionBuffer;
    public get transitionBuffer() { return this._transitionBuffer; }
    protected _isVisible: boolean;
    public get isVisible() { return this._isVisible; }
    public set isVisible(value: boolean) { this._isVisible = value; }
    public hasChangedCallback: () => void;

    public constructor(transitionBuffer: ITransitionBuffer) {
        this._transitionBuffer = transitionBuffer;
        this._isVisible = true;
        this._hasChanged = true;
        transitionBuffer.hasChangedCallback = () => { this._hasChanged = true; };
    }

    public update(): void {
        if (this._hasChanged) {
            this._hasChanged = false;

            if (this.hasChangedCallback) {
                this.hasChangedCallback();
            }
        }
    }
}