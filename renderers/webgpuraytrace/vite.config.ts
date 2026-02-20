import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            formats: ['es'],
            fileName: () => 'morphcharts-webgpuraytrace.js',
        },
        outDir: resolve(__dirname, '../../dist/lib'),
        emptyOutDir: false,
        sourcemap: true,
        rollupOptions: {
            external: ['core'],
        },
    },
});
