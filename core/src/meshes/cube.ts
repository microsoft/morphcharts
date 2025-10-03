// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

export class Cube {
    // RH coordinates (+z from screen to eye, -z from eye to screen)
    //    +y
    //     |
    //     |____ +x
    //    /
    //  +z
    //      4---------------5
    //     /|              /|
    //    / |             / |
    //   /  |            /  |
    //  0---------------1   |
    //  |   |           |   |
    //  |   7-----------|---6
    //  |  /            |  /
    //  | /             | /
    //  |/              |/
    //  3---------------2
    public static readonly POSITIONS = [
        -0.5,  0.5,  0.5, // 0
         0.5,  0.5,  0.5, // 1
         0.5, -0.5,  0.5, // 2
        -0.5, -0.5,  0.5, // 3
        -0.5,  0.5, -0.5, // 4
         0.5,  0.5, -0.5, // 5
         0.5, -0.5, -0.5, // 6
        -0.5, -0.5, -0.5, // 7
    ];
}