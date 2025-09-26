import { Manipulator } from "./manipulator.js";

export class Pointers {
    private _element: HTMLElement;
    private _manipulators: { [key: string]: Manipulator };
    private _hoverX: number;
    private _hoverY: number;
    private _hoverId: number;
    private _devicePixelRatio: number;
    public get hoverX() { return this._hoverX }; // Hover x position, css pixels
    public get hoverY() { return this._hoverY }; // Hover y position, css pixels
    public get hoverId() { return this._hoverId };

    constructor(manipulators: { [key: string]: Manipulator }) {
        this._manipulators = manipulators;
        this._devicePixelRatio = 1;
    }

    public initialize(element: HTMLElement) {
        this._element = element;
        element.addEventListener("pointerdown", (e: PointerEvent) => this._handlePointerDown(e), { passive: true });
        element.addEventListener("pointermove", (e: PointerEvent) => this._handlePointerMove(e), { passive: true });
        element.addEventListener("pointerup", (e: PointerEvent) => this._handlePointerUp(e), { passive: true });
        element.addEventListener("pointercancel", (e: PointerEvent) => this._handlePointerCancel(e), { passive: true });
        element.addEventListener("pointerleave", (e: PointerEvent) => this._handlePointerLeave(e), { passive: true });
        element.addEventListener("pointerout", (e: PointerEvent) => this._handlePointerOut(e), { passive: true });
    }

    private _handlePointerDown(e: PointerEvent) {
        this._element.focus();
        const manipulator = new Manipulator();
        const id = e.pointerId;
        const x = e.offsetX * this._devicePixelRatio;
        const y = e.offsetY * this._devicePixelRatio;
        manipulator.id = id;
        manipulator.position[0] = x;
        manipulator.position[1] = y;
        manipulator.type = e.pointerType;
        manipulator.button = e.button;
        manipulator.shiftKey = e.shiftKey;
        manipulator.ctrlKey = e.ctrlKey;
        manipulator.altKey = e.altKey;
        manipulator.event = e;
        this._manipulators[id] = manipulator;

        // Hover
        this._hoverId = id;
        this._hoverX = x;
        this._hoverY = y;
    }

    private _handlePointerMove(e: PointerEvent) {
        const x = e.offsetX * this._devicePixelRatio;
        const y = e.offsetY * this._devicePixelRatio;
        const id = e.pointerId;
        const manipulator = this._manipulators[id];
        if (manipulator) {
            manipulator.position[0] = x;
            manipulator.position[1] = y;
            manipulator.event = e;
        }

        // Hover
        switch (e.pointerType) {
            case "mouse":
                this._hoverId = id;
                this._hoverX = x;
                this._hoverY = y;
                break;
            case "pen":
                this._hoverId = id;
                this._hoverX = x;
                this._hoverY = y;
                break;
        }
    }

    private _handlePointerUp(e: PointerEvent) {
        const manipulator = this._manipulators[e.pointerId];
        if (manipulator) {
            manipulator.event = e;
        }
        this._remove(e.pointerId);
    }

    private _handlePointerCancel(e: PointerEvent) {
        this._remove(e.pointerId);
    }

    private _handlePointerLeave(e: PointerEvent) {
        this._resetHover();
        this._remove(e.pointerId);
    }

    private _handlePointerOut(e: PointerEvent) {
        this._resetHover();
        this._remove(e.pointerId);
    }

    private _resetHover() {
        this._hoverId = null;
        this._hoverX = null;
        this._hoverY = null;
    }

    private _remove(pointerId: number) {
        const manipulator = this._manipulators[pointerId];
        if (manipulator) {
            delete this._manipulators[pointerId];
        }
    }
}