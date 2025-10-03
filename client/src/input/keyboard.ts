// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

export class Keyboard {
    private _pressedKeys: Set<string>;
    private _previousPressedKeys: Set<string>;
    
    constructor() {
        this._pressedKeys = new Set<string>();
        this._previousPressedKeys = new Set<string>();
    }

    public initialize(element: HTMLElement) {
        element.addEventListener("keydown", (e: KeyboardEvent) => { this._handleKeyDown(e) }, false);
        element.addEventListener("keyup", (e: KeyboardEvent) => { this._handleKeyUp(e) }, false);
    }

    public isKeyDown(key: string): boolean {
        return this._pressedKeys.has(key);
    }

    public wasKeyReleased(key: string): boolean {
        if (this._pressedKeys.has(key)) {
            if (!this._previousPressedKeys.has(key)) {
                this._previousPressedKeys.add(key);
                return true;
            }
        }
        else {
            this._previousPressedKeys.delete(key);
        }
        return false;
    }

    private _handleKeyDown(e: Event) {
        const keyboardEvent = e as KeyboardEvent;
        const key = keyboardEvent.key;
        if (!this._pressedKeys.has(key)) {
            this._pressedKeys.add(key);
        }
    }

    private _handleKeyUp(e: Event) {
        const keyboardEvent = e as KeyboardEvent;
        const key = keyboardEvent.key;
        if (this._pressedKeys.has(key)) {
            this._pressedKeys.delete(key);
        }
    }
}