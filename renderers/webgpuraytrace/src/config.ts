// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import * as Core from "core";

export class Config extends Core.Config {
    // Rendering
    public static readonly maxSamplesPerPixel: number = 10000;
}