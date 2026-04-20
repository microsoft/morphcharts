// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import { Group } from "../marks/group.js";
import { Pow } from "./pow.js";

export class Sqrt extends Pow {
    constructor() {
        super();
        this.type = "sqrt";
        this.exponent = 0.5;
    }

    public static fromJSON(group: Group, scaleJSON: any): Sqrt {
        const sqrt = Pow.fromJSON(group, scaleJSON) as Sqrt;
        sqrt.type = "sqrt";
        sqrt.exponent = 0.5;
        return sqrt;
    }
}
