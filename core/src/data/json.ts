// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

export class Json {

    /**
     * Read a JSON dataset from a string
     * @param text JSON string
     * @returns string arrays representing rows and columns
     **/
    public read(text: string): string[][] {
        try {
            const json = JSON.parse(text);
            const rows: string[][] = [];

            // Is it an array of objects?
            if (Array.isArray(json) && json.length > 0) {
                // Iterate all rows to build a complete set of columns
                const columns = new Set<string>();
                for (const item of json) {
                    if (typeof item === "object" && item !== null) {
                        Object.keys(item).forEach(key => columns.add(key));
                    }
                }

                // Header row
                rows.push(Array.from(columns));

                // Get rows
                // Fill in missing values with empty string
                for (const item of json) {
                    rows.push(Array.from(columns).map(col => (col in item ? String(item[col]) : "")));
                }

                return rows;
            }
            throw new Error("JSON is not an array of objects");
        }
        catch (error) {
            throw new Error("Invalid JSON");
        }
    }
}