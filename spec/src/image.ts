// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import * as Core from "core";
import { Group } from "./marks/group.js";
import { IScene } from "./plot.js";

export class Image {
    public name: string;
    public url: string;
    public dataURL: string;

    public process(group: Group, scene: IScene): void {
        const options: Core.IImageOptions = {
            url: this.url,
            dataURL: this.dataURL
        };
        const image = new Core.Image(options);
        scene.images.push(image)
    }

    public static fromJSON(group: Group, images: { [key: string]: string }, json: any): Image {
        const image = new Image();

        // Required fields
        if (!json.name) { throw new Error("image must have a name"); }
        image.name = json.name;

        // url
        if (json.url) { image.url = json.url; }

        // dataURL
        if (json.dataURL) { image.dataURL = json.dataURL; }

        // File
        if (json.file) {
            // Load dataURL from input file upload
            const start = performance.now();
            const text = images[json.file];
            if (text) {
                image.dataURL = text;
                console.log(`loaded data ${image.name} ${Core.Time.formatDuration(performance.now() - start)}`);
            }
        }

        return image;
    }
}