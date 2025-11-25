import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3004,  // Frontend dev server
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',  // Backend API
        changeOrigin: true,
      },
      '/sse': {
        target: 'http://localhost:3001',  // Backend long-polling
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
