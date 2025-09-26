export interface IImageOptions {
    url?: string;
    dataURL?: string;
    width?: number;
    height?: number;
}

export class Image {
    protected _hasChanged: boolean;
    public hasChangedCallback: () => void;
    protected _url: string;
    protected _dataURL: string;
    public get url(): string { return this._url; }
    public get dataURL(): string { return this._dataURL; }

    constructor(options: IImageOptions) {
        if (options.url) { this._url = options.url; }
        if (options.dataURL) { this._dataURL = options.dataURL; }

        // Changed
        this._hasChanged = true;
    }

    public update() {
        if (this._hasChanged) {
            this._hasChanged = false;

            if (this.hasChangedCallback) {
                this.hasChangedCallback();
            }
        }
    }
}

export interface IImageVisual {
    image: Image;
    width: number;
    height: number;
    buffer: Uint8ClampedArray<ArrayBufferLike>;
    updateAsync(): Promise<void>;
    debugImage(): string;
}

export abstract class ImageVisual implements IImageVisual {
    protected _hasChanged: boolean;
    protected _image: Image;
    protected _buffer: Uint8ClampedArray<ArrayBufferLike>;
    protected _width: number;
    protected _height: number;
    public get buffer(): Uint8ClampedArray<ArrayBufferLike> { return this._buffer; }
    public get image(): Image { return this._image; }
    public get width(): number { return this._width; }
    public get height(): number { return this._height; }
    public hasChangedCallback: () => void;

    constructor(image: Image) {
        this._image = image;
        image.hasChangedCallback = () => { this._hasChanged = true; };
        this._hasChanged = true;
    }

    protected abstract _getDataURL(): string;

    public debugImage(): string {
        return this._getDataURL();
    }

    protected abstract _drawAsync(): Promise<void>;

    public async updateAsync(): Promise<void> {
        if (this._hasChanged) {
            this._hasChanged = false;
            try {
                await this._drawAsync();
            } catch (error) {
                console.log("error updating image visual", error);
            }
            if (this.hasChangedCallback) {
                this.hasChangedCallback();
            }
        }
    }
}