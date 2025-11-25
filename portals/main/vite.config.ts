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
      // 日志查看器的 API 请求（当从主门户访问时）
      '/api/logs': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/sse': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      // 日志查看器的页面和资源
      '/api/log': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/log/, ''),
      },
      // 个人画像系统
      '/api/profile': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/profile/, ''),
      },
      // 个人画像系统的子页面和资源
      '/user-profile': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      // Pip-Boy 主题资源（被多个服务共享）
      '/pip-boy-theme': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      // 服务控制 API
      '/api/services': {
        target: 'http://localhost:3003',
        changeOrigin: true,
      },
    },
  },
})
