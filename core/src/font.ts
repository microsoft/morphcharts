// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

export interface IFontOptions {
    name: string; // Font family, e.g. "Arial", "Times New Roman"
    /**
     * Font weight
     * 100 Thin (Hairline)
     * 200 Extra Light (Ultra Light)
     * 300 Light
     * 400 Normal (Regular)
     * 500 Medium
     * 600 Semi Bold (Demi Bold)
     * 700 Bold
     * 800 Extra Bold (Ultra Bold)
     * 900 Black (Heavy)
     * 950 Extra Black (Ultra Black)
     */
    weight: number;
    style: string; // Font style, "normal" | "italic" | "oblique"
}

export class Font {
    public static key(font: IFontOptions): string {
        return `${font.style} ${font.weight} ${font.name}`;
    }
}