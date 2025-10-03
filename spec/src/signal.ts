// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import { Expression } from "./expression.js";
import { Group } from "./marks/group.js";

export class Signal {
    public name: string;
    public value: any;
    public update: any;

    public static fromJSON(group: Group, json: any): Signal {
        const signal = new Signal();

        // Required fields
        if (!json.name) { throw new Error("signal must have a name"); }
        signal.name = json.name;

        // Value
        if (json.value != undefined) { signal.value = json?.value; }
        else { signal.value = 0; } // Default value

        // Update
        if (json.update) {
            // Parse as a string expression
            const expr = json.update;
            signal.update = new Expression().parseExpression(expr, group);

            // Evaluate the expression
            signal.value = signal.update();
        }
        else (signal.update = () => signal.value); // Default update function
        return signal;
    }
}