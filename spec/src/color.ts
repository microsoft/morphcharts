// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import * as Core from "@microsoft/morphcharts-core";
import { MarkEncodingValue } from "./marks/encoding.js";

export class Color {
    // RGB
    public r: MarkEncodingValue; // [0,255]
    public g: MarkEncodingValue; // [0,255]
    public b: MarkEncodingValue; // [0,255]

    // HSL
    public h: MarkEncodingValue; // [0,360]
    public s: MarkEncodingValue; // [0,1]
    public l: MarkEncodingValue; // [0,1]

    public static parse(value: any): Core.ColorRGB {
        return Core.Color.parseColorRGB(value);
    }
}