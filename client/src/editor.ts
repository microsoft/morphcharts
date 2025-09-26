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

    constructor() {
        this._tabLength = 2;
        this._numbers = document.getElementById("lines") as HTMLDivElement;
        this._content = document.getElementById("content") as HTMLTextAreaElement;

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

        // Catch tabbing into textarea
        this._content.addEventListener("focus", () => {
            setTimeout(() => {
                this._updateLineNumbers(false);
            }, 0);
        });

        this._content.addEventListener("keydown", (e) => {
            // Prevent tab key from moving focus
            if (e.key === "Tab") {
                e.preventDefault();
            }

            // Track cursor position
            if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End", "PageUp", "PageDown"].includes(e.key)) {
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