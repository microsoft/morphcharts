// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

export class MouseWheel {
    private _previousTotal: number;
    public total: number;
    public delta: number;

    constructor() {
        this.reset();
    }

    public initialize(element: HTMLElement) {
        element.addEventListener("wheel", e => {
            e.preventDefault();
            const wheelEvent = e as WheelEvent;
            this.total += wheelEvent.deltaY;
        }, { passive: false });
    }

    public update(elapsedTime: number) {
        const total = this.total;
        this.delta = total - this._previousTotal;
        this._previousTotal = total;
    }

    public reset() {
        this._previousTotal = 0;
        this.total = 0;
        this.delta = 0;
    }
}