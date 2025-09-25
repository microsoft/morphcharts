export class Csv {
    public QUOTE = '"';
    public DELIMETER = ',';
    public LINE_BREAKS = ['\n', '\r'];

    /**
     * Read a single row from a csv file
     * @param text csv
     * @param row 0-based row number
     */
    public readline(text: string, row: number): string[] {
        return this.read(text, row, 1)[0];
    }

    /**
     * Read a set of rows from a csv file
     * @param text csv
     * @param firstRow starting row, 0-based
     * @param maxRows maximum number of rows to read
     * @returns an array of rows, each containing an array of columns
     */
    public read(text: string, firstRow = 0, maxRows = Number.MAX_VALUE): string[][] {
        const rows = [];
        let rowBuffer = [];
        let row = 0;
        let columnBuffer = "";
        let quoted = false;
        for (let i = 0; i < text.length; i++) {
            const char = text.charAt(i);

            // Quote
            if (char == this.QUOTE) {
                // Escaped?
                if (text.charAt(i + 1) == this.QUOTE) {
                    // Append
                    i++;
                    columnBuffer += this.QUOTE;
                }
                else {
                    quoted = !quoted;
                }
            }
            else {
                if (quoted) {
                    // Append
                    columnBuffer += char;
                }
                else {
                    // Delimeter
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
                // Add quotes if the column contains a delimeter or quote
                const quotes = column.indexOf(this.DELIMETER) > -1 || column.indexOf(this.QUOTE) > -1;

                // Replace quotes with double quotes
                column = column.replace(/"/g, '""');

                if (quotes) {
                    column = `${this.QUOTE}${column}${this.QUOTE}`;
                }
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