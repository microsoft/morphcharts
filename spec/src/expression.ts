// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import * as Core from "core";
import { Dataset } from "./dataset.js";
import { Group } from "./marks/group.js";
import { Band } from "./scales/band.js";

export class Expression {
    public parseExpression(expr: string, group: Group, dataset?: Dataset): any {
        return this._buildExpression(this._parseExpression(expr, group, dataset), group, dataset);
    }

    private _parseExpression(expr: string, group: Group, dataset: Dataset): string {
        let expression = "";
        let i = 0;
        while (i < expr.length) {
            // Skip spaces
            if (expr[i] == " ") {
                i++;
                continue;
            }

            // Data
            if (dataset) {
                // Fields
                // datum.fieldname
                if (expr.substring(i, i + 6) == "datum.") {
                    i += 6;
                    // Read all valid characters
                    let field = "";
                    while (i < expr.length && /[a-zA-Z0-9_]/.test(expr[i])) {
                        field += expr[i];
                        i++;
                    }
                    const columnIndex = dataset.getColumnIndex(field);
                    if (columnIndex == -1) {
                        throw new Error(`expression field "${field}" not found`);
                    }
                    // String columns need to be converted to string values
                    switch (dataset.getColumnType(columnIndex)) {
                        case Core.Data.ColumnType.float:
                        case Core.Data.ColumnType.integer:
                        case Core.Data.ColumnType.date:
                            expression += `dataset.all.columnValues(${columnIndex}, false)[i]`;
                            break;
                        case Core.Data.ColumnType.string:
                            expression += `dataset.all.distinctStrings(${columnIndex})[dataset.all.columnValues(${columnIndex}, true)[i]]`;
                    }
                    continue;
                }

                // datum['field name']
                if (expr.substring(i, i + 7) == "datum['") {
                    i += 7;
                    // Check for closing bracket
                    const closingBracket = expr.indexOf("']", i);
                    if (closingBracket == -1) {
                        throw new Error("expression invalid field name");
                    }
                    const field = expr.slice(i, closingBracket);
                    const columnIndex = dataset.getColumnIndex(field);
                    if (columnIndex == -1) {
                        throw new Error(`expression field "${field}" not found`);
                    }
                    // String columns need to be converted to string values
                    switch (dataset.getColumnType(columnIndex)) {
                        case Core.Data.ColumnType.float:
                        case Core.Data.ColumnType.integer:
                        case Core.Data.ColumnType.date:
                            expression += `dataset.all.columnValues(${columnIndex}, false)[i]`;
                            break;
                        case Core.Data.ColumnType.string:
                            expression += `dataset.all.distinctStrings(${columnIndex})[dataset.all.columnValues(${columnIndex}, true)[i]]`;
                    }
                    i = closingBracket + 2;
                    continue;
                }
            }

            // Ternary operator
            if (expr[i] == "?" || expr[i] == ":") {
                expression += expr[i];
                i++;
                continue;
            }

            // Double character operators (must be checked before single character operators)
            if (expr.substring(i, i + 2) == ">=" || expr.substring(i, i + 2) == "<=" || expr.substring(i, i + 2) == "==" || expr.substring(i, i + 2) == "!=") {
                expression += expr.substring(i, i + 2);
                i += 2;
                continue;
            }

            // Single character operators
            if (expr[i] == "+" || expr[i] == "-" || expr[i] == "*" || expr[i] == "/" || expr[i] == ">" || expr[i] == "<" || expr[i] == "%" || expr[i] == "^") {
                expression += expr[i];
                i++;
                continue;
            }

            // Double character logical operators
            if (expr.substring(i, i + 2) == "&&" || expr.substring(i, i + 2) == "||") {
                expression += expr.substring(i, i + 2);
                i += 2;
                continue;
            }

            // Single character logical operators
            if (expr[i] == "!") {
                expression += expr[i];
                i++;
                continue;
            }

            // String literals
            if (expr[i] == "'") {
                i++;
                // Find index of next single quote
                const closingQuote = expr.indexOf("'", i);
                if (closingQuote == -1) {
                    throw new Error("expression string not closed");
                }
                let string = "";
                while (i < closingQuote) {
                    // Alphanumeric characters, underscore, space, round brackets only
                    // Note that a query of field names with dates won't work, e.g. datum.date=='2023-03-23', instead use datum.date==1679529600000
                    if (!/[a-zA-Z0-9-_ ()]/.test(expr[i])) {
                        throw new Error("expression invalid string character");
                    }
                    string += expr[i];
                    i++;
                }
                expression += `'${string}'`;
                i++;
                continue;
            }

            // All valid number characters
            if (/[0-9.]/.test(expr[i])) {
                let number = "";
                while (i < expr.length && /[0-9.]/.test(expr[i])) {
                    number += expr[i];
                    i++;
                }
                expression += number;
                continue;
            }

            // Brackets
            if (expr[i] == "(" || expr[i] == ")" || expr[i] == "[" || expr[i] == "]") {
                expression += expr[i];
                i++;
                continue;
            }

            // Conditional operator
            if (expr[i] == "?" || expr[i] == ":") {
                expression += expr[i];
                i++;
                continue;
            }

            // Comma (e.g. min(a,b), max(a,b) etc.)
            if (expr[i] == ",") {
                expression += expr[i];
                i++;
                continue;
            }

            // Signals
            if (group?.signals) {
                const iterateSignals = (group: Group): boolean => {
                    let found = false;
                    for (const key in group.signals) {
                        if (expr.substring(i, i + key.length) == key) {
                            const signal = group.signals[key];
                            // const result = signal.update().toString()
                            // Maintain brackets for arrays
                            const result = JSON.stringify(signal.update());
                            expression += result;
                            i += key.length;
                            found = true;
                            break;
                        }
                    }
                    if (found) { return true; }

                    // Check parent groups
                    if (group.group) { return iterateSignals(group.group); }
                    else { return false; }
                };
                const found = iterateSignals(group);
                if (found) {
                    continue;
                }
            }

            // Functions
            // Math
            if (expr.substring(i, i + 3) == "abs") {
                expression += "Math.abs";
                i += 3;
                continue;
            }
            if (expr.substring(i, i + 4) == "ceil") {
                expression += "Math.ceil";
                i += 4;
                continue;
            }
            if (expr.substring(i, i + 5) == "floor") {
                expression += "Math.floor";
                i += 5;
                continue;
            }
            if (expr.substring(i, i + 3) == "max") {
                expression += "Math.max";
                i += 3;
                continue;
            }
            if (expr.substring(i, i + 3) == "min") {
                expression += "Math.min";
                i += 3;
                continue;
            }
            if (expr.substring(i, i + 4) == "sqrt") {
                expression += "Math.sqrt";
                i += 4;
                continue;
            }
            if (expr.substring(i, i + 3) == "pow") {
                expression += "Math.pow";
                i += 3;
                continue;
            }
            if (expr.substring(i, i + 3) == "log") {
                expression += "Math.log";
                i += 3;
                continue;
            }

            // Random
            if (expr.substring(i, i + 6) == "random") {
                expression += "Math.random";
                i += 6;
                continue;
            }

            // Trigonometric
            if (expr.substring(i, i + 4) == "acos") {
                expression += "Math.acos";
                i += 4;
                continue;
            }
            if (expr.substring(i, i + 4) == "asin") {
                expression += "Math.asin";
                i += 4;
                continue;
            }
            if (expr.substring(i, i + 3) == "cos") {
                expression += "Math.cos";
                i += 3;
                continue;
            }
            if (expr.substring(i, i + 3) == "sin") {
                expression += "Math.sin";
                i += 3;
                continue;
            }

            // Math constants
            if (expr.substring(i, i + 2) == "PI") {
                expression += "Math.PI";
                i += 2;
                continue;
            }

            // String functions
            if (expr.substring(i, i + 5) == "split") {
                expression += "split";
                i += 5;
                continue;
            }
            if (expr.substring(i, i + 4) == "trim") {
                expression += "String.prototype.trim.call";
                i += 4;
                continue;
            }
            if (expr.substring(i, i + 5) == "upper") {
                expression += "String.prototype.toUpperCase.call";
                i += 5;
                continue;
            }
            if (expr.substring(i, i + 6) == "length") {
                i += 6;
                // Parse sub-expression between brackets
                const subExpression = this._subExpression(expr, i, group, dataset);
                i += subExpression.length + 1;
                // Add to expression
                expression += `(${subExpression.expr}).length`;
                continue;
            }
            if (expr.substring(i, i + 8) == "toString") {
                i += 8;
                // Parse sub-expression between brackets
                const subExpression = this._subExpression(expr, i, group, dataset);
                i += subExpression.length + 1;
                // Add to expression
                expression += `(${subExpression.expr}).toString()`;
                continue;
            }
            if (expr.substring(i, i + 7) == "indexof") {
                expression += "String.prototype.indexOf.call";
                i += 7;
                continue;
            }
            if (expr.substring(i, i + 11) == "lastindexof") {
                expression += "String.prototype.lastIndexOf.call";
                i += 11;
                continue;
            }
            if (expr.substring(i, i + 5) == "slice") {
                expression += "String.prototype.slice.call";
                i += 5;
                continue;
            }
            if (expr.substring(i, i + 9) == "substring") {
                expression += "String.prototype.slice.call";
                i += 9;
                continue;
            }
            if (expr.substring(i, i + 10) == "replaceall") {
                expression += "String.prototype.replaceAll.call";
                i += 10;
                continue;
            }
            if (expr.substring(i, i + 7) == "replace") {
                expression += "String.prototype.replace.call";
                i += 7;
                continue;
            }

            // Date
            if (expr.substring(i, i + 3) == "now") {
                expression += "Date.now()";
                i += 3;
                continue;
            }
            // Datetime with timestamp in ticks, e.g. datetime(1679529600000)
            if (expr.substring(i, i + 8) == "datetime") {
                i += 8;
                // Parse sub-expression between brackets
                const subExpression = this._subExpression(expr, i, group, dataset);
                i += subExpression.length + 1;
                // Add to expression
                expression += `new Date(${subExpression.expr})`;
                continue;
            }
            if (expr.substring(i, i + 4) == "year") {
                i += 4;
                // Parse sub-expression between brackets
                const subExpression = this._subExpression(expr, i, group, dataset);
                i += subExpression.length + 1;
                // Add to expression
                expression += `new Date(${subExpression.expr}).getFullYear()`;
                continue;
            }
            if (expr.substring(i, i + 5) == "month") {
                i += 5;
                // Parse sub-expression between brackets
                const subExpression = this._subExpression(expr, i, group, dataset);
                i += subExpression.length + 1;
                // Add to expression
                expression += `new Date(${subExpression.expr}).getMonth()`;
                continue;
            }
            // Day of month
            if (expr.substring(i, i + 4) == "date") {
                i += 4;
                // Parse sub-expression between brackets
                const subExpression = this._subExpression(expr, i, group, dataset);
                i += subExpression.length + 1;
                // Add to expression
                expression += `new Date(${subExpression.expr}).getDate()`;
                continue;
            }
            if (expr.substring(i, i + 9) == "dayofyear") {
                i += 9;
                // Parse sub-expression between brackets
                const subExpression = this._subExpression(expr, i, group, dataset);
                i += subExpression.length + 1;
                // Add to expression
                expression += `Math.floor((new Date(${subExpression.expr}).getTime() - new Date(new Date(${subExpression.expr}).getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24))`;
                continue;
            }

            // Scales
            // bandwidth(name)
            if (expr.substring(i, i + 9) == "bandwidth") {
                i += 9;
                // Get name
                if (expr[i] != "(") { throw new Error("expression bandwidth requires name parameter"); }
                i++; // Skip opening bracket
                // Read name until closing bracket
                let name = "";
                while (i < expr.length && expr[i] != ")") {
                    if (expr[i] == "'") {
                        i++; // Skip opening quote
                        // Find index of next single quote
                        const closingQuote = expr.indexOf("'", i);
                        if (closingQuote == -1) { throw new Error("expression string not closed"); }
                        while (i < closingQuote) {
                            // Alphanumeric characters, space only
                            if (!/[a-zA-Z0-9_ ]/.test(expr[i])) { throw new Error("expression invalid string character"); }
                            name += expr[i];
                            i++;
                        }
                        i++; // Skip closing quote
                    }
                    else { throw new Error("expression bandwidth requires name parameter"); }
                }
                if (i >= expr.length || expr[i] != ")") {
                    throw new Error("expression bandwidth requires closing bracket");
                }
                i++; // Skip closing bracket
                // Get bandwidth from group
                const scale = group.getScale(name);
                if (!scale) { throw new Error(`expression scale "${name}" not found`); }
                if (scale.type != "band") { throw new Error(`expression scale "${name}" is not a band scale`); }
                expression += (scale as Band).bandwidth();
                continue;
            }
            // scale(name,value)
            if (expr.substring(i, i + 5) == "scale") {
                i += 5;
                // Get name
                if (expr[i] != "(") { throw new Error("expression scale requires name, value parameters"); }
                i++; // Skip opening bracket
                let name = "";
                if (expr[i] == "'") {
                    i++; // Skip opening quote
                    // Find index of next single quote
                    const closingQuote = expr.indexOf("'", i);
                    if (closingQuote == -1) { throw new Error("expression string not closed"); }
                    while (i < closingQuote) {
                        // Alphanumeric characters, space only
                        if (!/[a-zA-Z0-9_ ]/.test(expr[i])) { throw new Error("expression invalid string character"); }
                        name += expr[i];
                        i++;
                    }
                    i++; // Skip closing quote
                }
                else { throw new Error("expression scale requires name parameter"); }

                // Get scale from group
                const scale = group.getScale(name);
                if (!scale) { throw new Error(`expression scale "${name}" not found`); }

                // Skip spaces
                while (i < expr.length && expr[i] == " ") { i++; }

                // Find comma
                if (i >= expr.length || expr[i] != ",") { throw new Error("expression scale requires value parameter"); }
                i++; // Skip comma

                // Find index of final closing bracket
                const openBrackets = 1;
                const closingBracketIndex = this._finalClosingBracketIndex(expr, i, openBrackets);
                if (closingBracketIndex == -1) { throw new Error("expression scale requires closing bracket"); }

                // Parse the subexpression
                const subExpression = this._parseExpression(expr.slice(i, closingBracketIndex), group, dataset);

                // Skip the sub-expression and 
                i = closingBracketIndex + 1; // Skip sub-expression and closing bracket

                // Add to expression
                expression += `group.getScale('${name}').map(${subExpression})`;
                continue;
            }

            // Unknown token
            throw new Error(`unable to parse expression '${expr.slice(i, i + 8)}...'`);
        }

        // Return expression
        return expression;
    }

    private _buildExpression(expr: string, group: Group, dataset: Dataset): any {
        // Return evaluatable function
        return new Function("group", "dataset", "i", `return ${expr}`) as (group: Group, dataset: Dataset, i: number) => any;
    }

    private _finalClosingBracketIndex(expr: string, startIndex: number, openBrackets: number = 0): number {
        for (let i = startIndex; i < expr.length; i++) {
            if (expr[i] == "(") { openBrackets++; }
            else if (expr[i] == ")") { openBrackets--; }
            if (openBrackets == 0) { return i; }
        }
        return -1;
    }

    private _subExpression(expr: string, startIndex: number, group: Group, dataset: Dataset): { expr: string, length: number } {
        let subExpr = "";
        let i;
        let brackets = 0;
        for (i = startIndex; i < expr.length; i++) {
            if (expr[i] == "(") { brackets++; }
            else if (expr[i] == ")") { brackets--; }
            subExpr += expr[i];
            if (brackets == 0) { break; }
        }
        return { expr: this._parseExpression(subExpr.slice(1, -1), group, dataset), length: i - startIndex };
    }
}