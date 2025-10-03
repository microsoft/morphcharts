// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import * as Core from "core";

export class AtlasVisual extends Core.AtlasVisual implements Core.IAtlasVisual {
    private _imageData: ImageData;

    constructor(atlas: Core.Atlas) {
        super(atlas);
        this._createBuffer();
    }

    protected _createBuffer() {
        const canvas = document.createElement("canvas");
        canvas.width = this.atlas.width;
        canvas.height = this.atlas.height;
        const context = canvas.getContext("2d");
        this._imageData = context.createImageData(this.atlas.width, this.atlas.height);
        this._buffer = this._imageData.data;
    }

    protected _getDataURL(): string {
        const canvas = document.createElement("canvas");
        canvas.width = this.atlas.width;
        canvas.height = this.atlas.height;
        const context = canvas.getContext("2d");
        context.putImageData(this._imageData, 0, 0);
        return canvas.toDataURL("image/png");
    }
}