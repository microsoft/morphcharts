import * as Core from "core";
import { IScene, Plot } from "../plot.js";
import { MarkEncodings } from "./encoding.js";
import { Facet } from "./facet.js";

export class Bounds {
    public width: number;
    public stroke: Core.ColorRGB;
}

export abstract class Mark {
    public type: string;
    public name: string;
    public from: MarkFrom;
    public encode: MarkEncodings;
    public bounds: Bounds;
    public geometry: string;
    public material: string;
    public texture: string;
    public interactive: boolean;

    public abstract process(plot: Plot, scene: IScene): void;

    protected async _fromJSONAsync(markJSON: any): Promise<void> {
        this.name = markJSON.name;
        this.geometry = markJSON.geometry;
        this.material = markJSON.material;
        this.texture = markJSON.texture;
        this.interactive = markJSON.interactive ?? true;

        // From
        if (markJSON.from) { this.from = MarkFrom.fromJSON(markJSON.from); }
    }
}

export class MarkFrom {
    public data: string;
    public facet: Facet;

    public static fromJSON(json: any): MarkFrom {
        const markFrom = new MarkFrom();
        markFrom.data = json?.data;
        if (json?.facet) { markFrom.facet = Facet.fromJSON(json.facet); }
        return markFrom;
    }
}
