// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import assert from "node:assert/strict";
import { test } from "node:test";
import { Common } from "../wwwroot/js/common.js";

const invalidSamples = [
    "javascript:alert(1)",
    "data:application/json,{}",
    "file:///payload",
    "ftp://example.com/payload",
    "../payload",
    "/payload",
    "samples/../payload",
    "gallery/../../payload",
    "other/payload",
    "samples/specs/payload",
    "samples\\payload",
    "\\\\attacker.example\\payload",
    "%2e%2e%2fpayload",
    "%252e%252e%252fpayload",
    "samples%2fpayload",
    "samples/payload?redirect=https://attacker.example",
    "samples/payload#fragment",
    "samples/",
    ".json",
    " payload",
    "payload ",
    "payload\n",
    "payload.json\n",
    "payload\r\n",
    "payload\u0000",
];

test("sample identifiers resolve to bundled spec directories", () => {
    for (const [sample, expected] of [
        ["bar1", "samples/specs/bar1.json"],
        ["bar1.json", "samples/specs/bar1.json"],
        ["bar1.JSON", "samples/specs/bar1.json"],
        ["samples/bar1", "samples/specs/bar1.json"],
        ["samples/bar1.json", "samples/specs/bar1.json"],
        ["gallery/earthquakes1", "gallery/specs/earthquakes1.json"],
        ["gallery/earthquakes1.json", "gallery/specs/earthquakes1.json"],
        ["docs/primitives1", "docs/specs/primitives1.json"],
        ["docs/primitives1.json", "docs/specs/primitives1.json"],
        ["Example_1-2", "samples/specs/Example_1-2.json"],
    ]) {
        assert.equal(Common.initialSamplePath(sample), expected);
    }
    for (const sample of invalidSamples) {
        assert.throws(() => Common.initialSamplePath(sample), /invalid sample identifier/, sample);
    }
});

test("external HTTP(S) URLs retain the existing specs directory mapping", () => {
    for (const [sample, expected] of [
        ["https://example.com/payload", "https://example.com/specs/payload.json"],
        ["http://example.com/payload.json", "http://example.com/specs/payload.json"],
        ["//example.com/payload", "//example.com/specs/payload.json"],
        ["https://example.com/charts/payload.json", "https://example.com/charts/specs/payload.json"],
        ["https://example.com/payload.JSON", "https://example.com/specs/payload.JSON"],
        ["https://example.com/payload.json?version=2", "https://example.com/specs/payload.json?version=2"],
    ]) {
        assert.equal(Common.initialSamplePath(sample), expected);
    }
});

test("initial loading rejects invalid selections before fetch and keeps the empty spec fallback", async t => {
    globalThis.window = {};
    const { Main } = await import("../wwwroot/js/client.js");
    delete globalThis.window;

    const fetchMock = t.mock.method(globalThis, "fetch", async () => {
        assert.fail("invalid selections must not be fetched");
    });
    const logMock = t.mock.method(console, "log", () => {});
    const loaded = [];
    const client = { _sampleLoaded: text => loaded.push(text) };
    for (const sample of invalidSamples) {
        await Main.prototype._loadInitialSampleAsync.call(client, sample);
    }
    assert.equal(fetchMock.mock.callCount(), 0);
    assert.deepEqual(loaded, invalidSamples.map(() => "{}"));
    assert.equal(logMock.mock.callCount(), invalidSamples.length);

    loaded.length = 0;
    for (const sample of [null, ""]) {
        await Main.prototype._loadInitialSampleAsync.call(client, sample);
    }
    assert.equal(fetchMock.mock.callCount(), 0);
    assert.deepEqual(loaded, ["{}", "{}"]);
});

test("initial loading fetches a valid bundled spec and installs its text", async t => {
    const { Main } = await import("../wwwroot/js/client.js");
    const spec = '{"signals":[]}';
    const fetchMock = t.mock.method(globalThis, "fetch", async () => ({ text: async () => spec }));
    let loaded;
    const client = { _sampleLoaded: text => { loaded = text; } };
    await Main.prototype._loadInitialSampleAsync.call(client, "gallery/earthquakes1");
    assert.equal(fetchMock.mock.calls[0].arguments[0], "gallery/specs/earthquakes1.json");
    assert.equal(fetchMock.mock.callCount(), 1);
    assert.equal(loaded, spec);
});

test("initial loading accepts external specs without bypassing expression validation", async t => {
    const { Main } = await import("../wwwroot/js/client.js");
    const { Signal } = await import("../../spec/dist/signal.js");
    const spec = JSON.stringify({
        signals: [{
            name: "unsafe",
            update: "('a')['constructor']['constructor']('alert(document.domain)')()",
        }],
    });
    const fetchMock = t.mock.method(globalThis, "fetch", async () => ({ text: async () => spec }));
    let loaded;
    const client = { _sampleLoaded: text => { loaded = text; } };
    await Main.prototype._loadInitialSampleAsync.call(client, "https://example.com/payload");
    assert.equal(fetchMock.mock.calls[0].arguments[0], "https://example.com/specs/payload.json");
    assert.equal(loaded, spec);
    assert.throws(() => Signal.fromJSON(undefined, JSON.parse(loaded).signals[0]), /expression/);
});
