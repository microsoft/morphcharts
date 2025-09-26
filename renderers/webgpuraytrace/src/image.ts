import * as Core from "core";

export class ImageVisual extends Core.ImageVisual implements Core.IImageVisual {
    private _imageData: ImageData;

    protected async _drawAsync(): Promise<void> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                const context = canvas.getContext("2d");
                this._width = canvas.width = img.width;
                this._height = canvas.height = img.height;
                context.drawImage(img, 0, 0);
                this._imageData = context.getImageData(0, 0, img.width, img.height);
                this._buffer = this._imageData.data;
                // Inverse gamma-correct
                for (let i = 0; i < this._buffer.length; i += 4) {
                    this._buffer[i + 0] = Math.pow(this._buffer[i + 0] / 0xff, 2.2) * 0xff; // R
                    this._buffer[i + 1] = Math.pow(this._buffer[i + 1] / 0xff, 2.2) * 0xff; // G
                    this._buffer[i + 2] = Math.pow(this._buffer[i + 2] / 0xff, 2.2) * 0xff; // B
                    // Alpha remains unchanged
                }
                resolve();
            };
            img.onerror = (error) => {
                console.log("error loading image", error);
                reject(error);
            };
            if (this._image.dataURL) { img.src = this._image.dataURL; }
            else if (this._image.url) { img.src = this._image.url; }
            else {
                console.log("no image source provided.");
                reject("no image source provided");
            }
        });
    }

    protected _getDataURL(): string {
        if (this._imageData) {
            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");
            canvas.width = this._width;
            canvas.height = this._height;
            context.putImageData(this._imageData, 0, 0);
            return canvas.toDataURL("image/png");
        }
        else {
            console.log("no image data");
            // TODO: Return empty image?
            return null;
        }
    }
}