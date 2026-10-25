// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import assert from "node:assert/strict";
import { test } from "node:test";
import { Data } from "@microsoft/morphcharts-core";
import { Dataset } from "../dist/dataset.js";
import { Expression } from "../dist/expression.js";
import { Signal } from "../dist/signal.js";

test("signal loading rejects constructor escapes without executing their bodies", () => {
    const previousName = Object.getOwnPropertyDescriptor(globalThis, "name");
    let executed = false;
    globalThis.__morphExpressionInjected = () => { executed = true; };
    Object.defineProperty(globalThis, "name", {
        configurable: true,
        value: "__morphExpressionInjected()",
    });
    try {
        for (const update of [
            "(1)['constructor']['constructor']('eval(name)')()",
            "(1)['constructor']['constructor']('__morphExpressionInjected()')()",
            "(1)['con'+'structor']['con'+'structor']('__morphExpressionInjected()')()",
            "abs['constructor']('__morphExpressionInjected()')()",
            "(abs)('__morphExpressionInjected()')",
            "split('constructor',',')[0]('__morphExpressionInjected()')",
        ]) {
            assert.throws(() => Signal.fromJSON(undefined, { name: "unsafe", update }), /expression/);
            assert.equal(executed, false, update);
        }
    }
    finally {
        delete globalThis.__morphExpressionInjected;
        if (previousName) { Object.defineProperty(globalThis, "name", previousName); }
        else { delete globalThis.name; }
    }
});

test("computed access cannot retrieve prototype properties, including dynamic keys", () => {
    const group = { signals: { key: { update: () => "constructor" } } };
    for (const expr of [
        "(1)['constructor']",
        "(1)['con'+'structor']",
        "(1)[key]",
        "(1)[split('constructor',',')[0]]",
        "abs['constructor']",
        "['a']['length']",
        "['a'][[0]]",
        "['a'][0.5]",
        "['a'][-1]",
    ]) {
        const evaluate = new Expression().parseExpression(expr, group);
        assert.throws(() => evaluate(group), /expression index must be a non-negative integer/, expr);
    }
});

test("invalid syntax cannot escape index guards or introduce arbitrary calls", () => {
    for (const expr of [
        "[1][0)]",
        "[1][(0]",
        "/abs/['constructor']",
        "min(1,2)(3)",
        "[abs][0](1)",
        "1;random()",
    ]) {
        assert.throws(() => new Expression().parseExpression(expr), /expression/, expr);
    }
});

test("supported operators, helpers, arrays, and numeric indexing retain their behavior", () => {
    const group = {
        signals: {
            stacky: { update: () => [2, 5] },
            offset: { update: () => 1 },
        },
        getScale: () => ({ type: "band", bandwidth: () => 8, map: value => value * 2 }),
    };
    for (const [expr, expected] of [
        ["1+2*3", 7],
        ["!(2<1)&&3>=2?max(4,abs(-5)):0", 5],
        ["2^3", 1],
        ["stacky[offset]*2", 10],
        ["stacky[(0,1)]", 5],
        ["[[1,2],[3,4]][1][0]", 3],
        ["split('a,b',',')[1]", "b"],
        ["'abc'[1]", "b"],
        ["length(split('a,b',','))", 2],
        ["upper(trim(' hello '))", "HELLO"],
        ["replace('constructor','con','de')", "destructor"],
        ["year(datetime(1679529600000))", 2023],
        ["bandwidth('xscale')+scale('xscale',3)", 14],
    ]) {
        const evaluate = new Expression().parseExpression(expr, group);
        assert.deepEqual(evaluate(group), expected, expr);
    }
});

test("dataset fields remain data, including fields named constructor", () => {
    const dataset = new Dataset(
        ["amount", "field name", "constructor"],
        [["12", "first", "harmless"], ["25", "second", "also harmless"]],
        [Data.ColumnType.integer, Data.ColumnType.string, Data.ColumnType.string],
    );
    for (const [expr, expected] of [
        ["datum.amount*2", 50],
        ["datum['field name']", "second"],
        ["datum.constructor", "also harmless"],
        ["datum['constructor']", "also harmless"],
    ]) {
        const evaluate = new Expression().parseExpression(expr, undefined, dataset);
        assert.equal(evaluate(undefined, dataset, 1), expected, expr);
    }
});
