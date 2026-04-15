// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

// Generate test configurations from the samples directory
// Usage: node scripts/generate-test-config.js

const fs = require('fs');
const path = require('path');

const samplesDir = path.resolve(__dirname, '../client/wwwroot/public/samples');
const testsDir = path.resolve(__dirname, '../client/wwwroot/public/tests');

// Get all JSON sample files, excluding non-spec files
const excludeFiles = ['index.json'];
const files = fs.readdirSync(samplesDir)
    .filter(f => f.endsWith('.json') && !excludeFiles.includes(f))
    .sort();

const tests = files.map(f => ({ plot: f }));

const configs = [
    // Smoke test (quick validation)
    { file: 'smoke_raytrace.json', frames: 10, width: 640, height: 360, renderMode: 'raytrace', saveImage: false },
    // Render tests (high quality, save images)
    { file: 'render_raytrace_720p.json', frames: 500, width: 1280, height: 720, renderMode: 'raytrace', saveImage: true },
    { file: 'render_raytrace_4k.json', frames: 500, width: 3840, height: 2160, renderMode: 'raytrace', saveImage: true },
    // Performance tests (with warmup)
    { file: 'perf_raytrace_720p.json', frames: 500, warmupFrames: 10, width: 1280, height: 720, renderMode: 'raytrace' },
    { file: 'perf_raytrace_4k.json', frames: 100, warmupFrames: 10, width: 3840, height: 2160, renderMode: 'raytrace' },
    { file: 'perf_color_720p.json', frames: 500, warmupFrames: 10, width: 1280, height: 720, renderMode: 'color' },
    { file: 'perf_color_4k.json', frames: 100, warmupFrames: 10, width: 3840, height: 2160, renderMode: 'color' },
];

for (const config of configs) {
    const { file, ...settings } = config;
    // Format with compact test entries (one per line)
    const testLines = tests.map(t => `        ${JSON.stringify(t)}`).join(',\n');
    const settingsLines = Object.entries(settings).map(([k, v]) => `    "${k}": ${JSON.stringify(v)}`).join(',\n');
    const output = `{\n${settingsLines},\n    "tests": [\n${testLines}\n    ]\n}`;
    fs.writeFileSync(path.join(testsDir, file), output);
}

console.log(`Generated ${configs.length} test configs with ${tests.length} samples`);
