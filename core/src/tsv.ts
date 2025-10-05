// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

export class Tsv {
    public DELIMETER = '\t'
    public LINE_BREAKS = ['\n', '\r'];

    // Escape characters
    public BACKSLASH = '\\';
    public LINE_FEED = 'n';
    public TAB = 't';
    public CARRIAGE_RETURN = 'r';

    /**
     * Read a single row from a tsv file
     * @param text tsv
     * @param row 0-based row number
     * @returns an array of columns
     **/
    public readline(text: string, row: number): string[] {
        return this.read(text, row, 1)[0];
    }

    /**
     * Read a set of rows from a tsv file
     * @param text tsv
     * @param firstRow starting row, 0-based
     * @param maxRows maximum number of rows to read
     * @returns an array of rows, each containing an array of columns
     **/
    public read(text: string, firstRow = 0, maxRows = Number.MAX_VALUE): string[][] {
        const rows = [];
        let rowBuffer = [];
        let row = 0;
        let columnBuffer = "";
        for (let i = 0; i < text.length; i++) {
            const char = text.charAt(i);

            // If at least two characters remaining, check for escape sequences
            if (char == this.BACKSLASH) {
                if (i < text.length - 1) {
                    const nextChar = text.charAt(i + 1);
                    if (nextChar == this.LINE_FEED) {
                        columnBuffer += this.LINE_FEED;
                        i++;
                    }
                    else if (nextChar == this.TAB) {
                        columnBuffer += this.TAB;
                        i++;
                    }
                    else if (nextChar == this.CARRIAGE_RETURN) {
                        columnBuffer += this.CARRIAGE_RETURN;
                        i++;
                    }
                    else if (nextChar == this.BACKSLASH) {
                        columnBuffer += this.BACKSLASH;
                        i++;
                    }
                }
            }
            else {
                // Delimiter
                if (char == this.DELIMETER) {
                    // Next column
                    rowBuffer.push(columnBuffer);
                    columnBuffer = "";
                }
                // Linebreak
                else if (this.LINE_BREAKS.indexOf(char) > -1) {
                    // Last column
                    rowBuffer.push(columnBuffer);
                    columnBuffer = "";

                    // Match all linebreak characters
                    while (this.LINE_BREAKS.indexOf(text.charAt(i + 1)) > -1) {
                        i++;
                    }

                    // Next row
                    if (row++ >= firstRow) {
                        rows.push(rowBuffer);
                    }
                    rowBuffer = [];
                    if (rows.length == maxRows) {
                        break;
                    }
                }
                else {
                    // Append
                    columnBuffer += char;
                }
            }
        }
        // Last row
        if (columnBuffer != "") {
            rowBuffer.push(columnBuffer);
        }
        if (rowBuffer.length > 0) {
            rows.push(rowBuffer);
        }
        return rows;
    }

    public write(headings: string[], rows: string[][]) {
        let text = this.writeLine(headings);
        for (let i = 0; i < rows.length; i++) {
            text += this.writeLine(rows[i]);
        }
        return text;
    }

    public writeLine(row: string[]): string {
        let text = "";
        for (let i = 0; i < row.length; i++) {
            let column = row[i];
            if (column) {
                // Replace escaped characters
                column = column.replace(/\\/g, '\\\\');
                column = column.replace(/\n/g, '\\n');
                column = column.replace(/\t/g, '\\t');
                column = column.replace(/\r/g, '\\r');
            }
            text += column;
            if (i < row.length - 1) {
                text += this.DELIMETER;
            }
        }
        text += this.LINE_BREAKS[0];
        return text;
    }
}