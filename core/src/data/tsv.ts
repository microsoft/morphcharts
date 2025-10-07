// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

export class Tsv {
    public DELIMETER = '\t'
    public LINE_BREAKS = ['\n', '\r'];

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
        // Last row
        if (columnBuffer != "") {
            rowBuffer.push(columnBuffer);
        }
        if (rowBuffer.length > 0) {
            rows.push(rowBuffer);
        }
        return rows;
    }
}