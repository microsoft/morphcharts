import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            formats: ['es'],
            fileName: () => 'morphcharts-core.js',
        },
        outDir: resolve(__dirname, '../dist'),
        emptyOutDir: false,
    },
});
