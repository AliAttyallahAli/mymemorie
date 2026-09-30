// frontend/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
    ],
    resolve: {
        alias: {
            '@': path.resolve(import.meta.dirname, './src'),
            '@components': path.resolve(import.meta.dirname, './src/components'),
            '@pages': path.resolve(import.meta.dirname, './src/pages'),
            '@utils': path.resolve(import.meta.dirname, './src/utils'),
            '@hooks': path.resolve(import.meta.dirname, './src/hooks'),
            '@context': path.resolve(import.meta.dirname, './src/context'),
            '@services': path.resolve(import.meta.dirname, './src/services'),
        },
    },
    server: {
        port: 5173,
        host: true,
        proxy: {
            '/api': {
                target: 'http://localhost:5000',  // ✅ Corrigé (http:// + pas de ||)
                changeOrigin: true,
                secure: false,
            },
            '/socket.io': {
                target: 'http://localhost:5000',
                changeOrigin: true,
                ws: true,
            },
        },
    },
    build: {
        outDir: 'dist',
        sourcemap: true,
        rollupOptions: {
            output: {
                manualChunks: (id) => {
                    if (id.includes('node_modules')) {
                        if (id.includes('react') && (id.includes('react-dom') || id.includes('react-router-dom'))) {
                            return 'react-vendor'
                        }
                        if (id.includes('react-icons')) {
                            return 'icons-vendor'
                        }
                        if (id.includes('chart.js') || id.includes('react-chartjs-2')) {
                            return 'chart-vendor'
                        }
                        return 'vendor'
                    }
                },
            },
        },
    },
    optimizeDeps: {
        include: ['react', 'react-dom', 'react-router-dom', 'axios', 'socket.io-client', 'react-hot-toast'],
    },
    css: {
        modules: {
            localsConvention: 'camelCase',
        },
    },
})