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
        // Parse rbg [0,255] from #rrggbb
        let color: Core.ColorRGB;
        if (value[0] == "#") {
            // 3 or 6 digit hex color?
            if (value.length == 4) {
                // 3-digit hex: #rgb
                const r = parseInt(value[1], 16) * 0x11;
                const g = parseInt(value[2], 16) * 0x11;
                const b = parseInt(value[3], 16) * 0x11;
                color = [r / 0xff, g / 0xff, b / 0xff];
            }
            else if (value.length == 7) {
                // 6-digit hex: #rrggbb
                const r = parseInt(value.substring(1, 3), 16);
                const g = parseInt(value.substring(3, 5), 16);
                const b = parseInt(value.substring(5, 7), 16);
                color = [r / 0xff, g / 0xff, b / 0xff];
            }
            else { console.log(`invalid hex color ${value}`); }
        }
        else { color = Core.Colors[value.toLowerCase()]; }
        return color || [0, 0, 0]; // Default to black if not found
    }
}