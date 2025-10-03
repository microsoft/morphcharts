// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

export class PseudoRandom {
    private _seed: number;

    constructor(seed: number) {
        this._seed = seed % 2147483647;
        if (this._seed <= 0) this._seed += 2147483646;
    }

    /**
     * Next pseudo-random number
     * @returns [1,2147483646]
     */
    public next() {
        return this._seed = this._seed * 16807 % 2147483647;
    };

    /**
     * Next pseudo-random number
     * @returns [0,1]
     */
    public nextFloat() {
        // We know that result of next() will be 1 to 2147483646 (inclusive).
        return (this.next() - 1) / 2147483646;
    };

    /**
     * Returns pseudo-random integer
     * @param min 
     * @param max 
     * @returns [min,max]
     */
    public nextInteger(min: number, max: number) {
        return Math.floor(this.nextFloat() * (max - min + 1) + min)
    }
}