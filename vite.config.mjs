import { defineConfig } from 'vite'
import { resolve } from 'node:path'

export default defineConfig({
    base: './', // Relative paths
    root: './client/wwwroot',
    server: {
        hmr: false,
        open: 'client.html',
    },
    build: {
        outDir: resolve(__dirname, 'dist/client'),
        emptyOutDir: true,
        rollupOptions: {
            input: {
                client: './client/wwwroot/client.html',
                gallery: './client/wwwroot/gallery.html'
            }
        }
    },
    preview: {
        port: 8080,
        open: 'client.html'
    }
})