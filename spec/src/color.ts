// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import * as Core from "core";
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
        // Parse rgb [0,255] from #rrggbb
        if (value[0] == "#") {
            // 3 or 6 digit hex color?
            if (value.length == 4) {
                // 3-digit hex: #rgb
                const r = parseInt(value[1], 16) * 0x11;
                const g = parseInt(value[2], 16) * 0x11;
                const b = parseInt(value[3], 16) * 0x11;
                return [r / 0xff, g / 0xff, b / 0xff];
            }
            else if (value.length == 7) {
                // 6-digit hex: #rrggbb
                const r = parseInt(value.substring(1, 3), 16);
                const g = parseInt(value.substring(3, 5), 16);
                const b = parseInt(value.substring(5, 7), 16);
                return [r / 0xff, g / 0xff, b / 0xff];
            }
            else { throw new Error(`invalid hex color ${value}`); }
        }
        else {
            const color = Core.Colors[value.toLowerCase()];
            if (color) { return [color[0], color[1], color[2]]; }
        }
        throw new Error(`invalid color ${value}`);
    }
}