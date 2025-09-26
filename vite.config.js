import { defineConfig } from 'vite'

export default defineConfig({
    base: './', // Relative paths
    root: './client/wwwroot',
    server: {
        hmr: false,
    },
    build: {
        emptyOutDir: true,
        rollupOptions: {
            input: './client/wwwroot/client.html'
        }
    },
    preview: {
        port: 8080,
        open: 'client.html'
    }
})