import path from 'path'
import { defineConfig } from '@lark-apaas/coding-preset-vite-react'

export default defineConfig({
  base: '/ct16_test/',
  server: {
    proxy: {
      '/node-red': {
        target: process.env.NODE_GREEN_PROXY_TARGET || 'http://127.0.0.1:1880',
        changeOrigin: true,
        ws: true,
        timeout: 120000,
        proxyTimeout: 120000,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@shared': path.resolve(__dirname, 'shared'),
    },
  },
})
