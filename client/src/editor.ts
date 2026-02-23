// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

export class Editor {
    private _content: HTMLTextAreaElement;
    private _numbers: HTMLDivElement;

    public changedCallback: () => void;

    private _tabLength: number;
    public get tabLength(): number { return this._tabLength; }
    public set tabLength(value: number) { this._tabLength = value; }

    private _previousLine: number;
    private _currentLine: number;
    public get currentLine(): number { return this._currentLine; }

    private _previousLines: number;
    private _currentLines: number;
    public get currentLines(): number { return this._currentLines; }

    public set content(value: string) {
        this._currentLines = 0;
        this._currentLine = 0;
        this._previousLines = 0;
        this._previousLine = 0;
        this._content.value = value;
        this._updateLineNumbers(false);
        if (this.changedCallback) { this.changedCallback(); }
    }
    public get content(): string { return this._content.value; }

    constructor(lines: HTMLDivElement, content: HTMLTextAreaElement) {
        this._tabLength = 2;
        this._numbers = lines;
        this._content = content;

        // Event listeners
        this._content.addEventListener("input", () => {
            this._updateLineNumbers(false);
            if (this.changedCallback) { this.changedCallback(); }
        });

        this._content.addEventListener("scroll", () => {
            this._numbers.scrollTop = this._content.scrollTop;
        });

        this._content.addEventListener("click", () => {
            setTimeout(() => {
                this._updateLineNumbers(false);
            }, 0);
        });

        // Allow drag & drop of text files
        this._content.addEventListener("dragover", (e) => {
            e.preventDefault();
            e.dataTransfer!.dropEffect = "copy";
        });
        this._content.addEventListener("drop", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const files = e.dataTransfer!.files;
            if (files.length > 0) {
                const validTypes = [".txt", ".json"];
                const file = files[0];
                const fileType = file.name.substring(file.name.lastIndexOf("."));
                if (!validTypes.includes(fileType)) {
                    console.log("only .txt and .json files are supported");
                    return;
                }
                const reader = new FileReader();
                reader.onload = (e) => {
                    const text = e.target!.result as string;
                    this.content = text;
                }
                reader.readAsText(file);
            }
        });

        // Catch tabbing into textarea
        this._content.addEventListener("focus", () => {
            setTimeout(() => {
                this._updateLineNumbers(false);
            }, 0);
        });

        const NAVIGATION_KEYS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End", "PageUp", "PageDown"];
        this._content.addEventListener("keydown", (e) => {
            // Track cursor position
            if (NAVIGATION_KEYS.includes(e.key)) {
                setTimeout(() => {
                    this._updateLineNumbers(false);
                }, 0);
            }
        });
    }

    private _updateLineNumbers(force: boolean): void {
        // Current line
        const text = this._content.value;
        const selectionStart = this._content.selectionStart;
        this._currentLine = text.substring(0, selectionStart).split("\n").length;

        // Total lines
        this._currentLines = text.split("\n").length;
        if (this._currentLines != this._previousLines || force) {
            this._previousLines = this._currentLines;
            let lineNumbers = "";

            // Add additional line to pad numbers when content horizontal scrollbar is present
            for (let i = 1; i <= this._currentLines + 1; i++) {
                if (i == this._currentLine) {
                    lineNumbers += `<div class="lineCurrent">${i}</div>`;
                } else {
                    lineNumbers += `<div>${i}</div>`;
                }
            }
            this._numbers.innerHTML = lineNumbers;
            this._previousLine = this._currentLine;
        }
        else if (this._currentLine != this._previousLine) {
            // If the number of lines hasn't changed, we still need to update the highlight for the current line
            const lineElements = this._numbers.children;
            if (lineElements[this._previousLine - 1]) {
                // Remove "lineCurrrent" from className, leaving any other classes intact
                lineElements[this._previousLine - 1].classList.remove("lineCurrent");
            }
            if (lineElements[this._currentLine - 1]) {
                // Add "lineCurrent" to className, leaving any other classes intact
                lineElements[this._currentLine - 1].classList.add("lineCurrent");
            }
            this._previousLine = this._currentLine;
        }
    }

    public parseJSON(): any {
        try {
            const json = JSON.parse(this._content.value);
            console.log("parsed successfully");

            // Remove any previous error highlighting
            this._updateLineNumbers(true);
            return json;
        } catch (error) {
            // Attempt to extract line and column (if available in the message)
            const match = error.message.match(/line (\d+) column (\d+)/i);
            if (match) {
                const line = match[1];
                const column = match[2];
                console.log(`error at line ${line}, column ${column}`);

                // Highlight error
                const lineElements = this._numbers.children;
                if (lineElements[this._previousLine - 1]) {
                    lineElements[this._previousLine - 1].className = "";
                }
                if (lineElements[line - 1]) {
                    lineElements[line - 1].className = "lineError";
                }
            }

            // Re-throw error for client
            throw error;
        }
    }
}