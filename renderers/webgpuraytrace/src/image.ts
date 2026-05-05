// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import * as Core from "@microsoft/morphcharts-core";

export class ImageVisual extends Core.ImageVisual implements Core.IImageVisual {
    private _imageData: ImageData;

    protected async _drawAsync(): Promise<void> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                const context = canvas.getContext("2d");
                if (!context) { reject("2D canvas context not available"); return; }
                this._width = canvas.width = img.width;
                this._height = canvas.height = img.height;
                context.drawImage(img, 0, 0);
                this._imageData = context.getImageData(0, 0, img.width, img.height);
                this._buffer = this._imageData.data;
                // sRGB → linear conversion handled by GPU via rgba8unorm-srgb texture format
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
            if (!context) { return null; }
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