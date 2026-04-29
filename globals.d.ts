// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

// Ambient declarations for globals available in both Node.js and browsers.

declare var console: Console;

interface Console {
    log(...data: any[]): void;
    warn(...data: any[]): void;
    error(...data: any[]): void;
}

interface Performance {
    now(): number;
}

declare var performance: Performance;

declare function fetch(input: string, init?: any): Promise<Response>;

interface Response {
    readonly ok: boolean;
    readonly statusText: string;
    text(): Promise<string>;
    json(): Promise<any>;
    arrayBuffer(): Promise<ArrayBuffer>;
}
