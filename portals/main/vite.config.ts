import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
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
    port: 3000,
    strictPort: true,  // 强制使用指定端口
    proxy: {
      '/api/log': {
        target: 'http://localhost:55555',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/log/, ''),
      },
      '/api/profile': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/profile/, '/api'),
      },
    },
  },
})
