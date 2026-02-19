import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
    base: './', // Relative paths
    root: './client/wwwroot',
    server: {
        hmr: false,
        open: 'client.html',
    },
    build: {
        outDir: resolve(__dirname, 'dist'),
        emptyOutDir: false,
        rollupOptions: {
            input: './client/wwwroot/client.html'
        }
    },
    preview: {
        port: 8080,
        open: 'client.html'
    }
})