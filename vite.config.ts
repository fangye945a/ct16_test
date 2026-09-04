import path from 'path'
import { defineConfig } from '@lark-apaas/coding-preset-vite-react'

/**
 * 调试阶段统一改这里的 IP（或设环境变量 CT16_DEV_PROXY_HOST）。
 * 端口固定：Node-RED 1880 / zhos-claw 18800 / CT16 后端 8080。
 *
 * 生产（dist 由 Go 托管）对应代理见 backend/api/upstream_proxy.go，
 * 新增/调整前缀时请两边保持一致。
 */
const DEV_PROXY_HOST = process.env.CT16_DEV_PROXY_HOST || 'localhost'
const nodeGreenTarget =
  process.env.NODE_GREEN_PROXY_TARGET || `http://${DEV_PROXY_HOST}:1880`
const zhosClawTarget =
  process.env.ZHOS_CLAW_PROXY_TARGET || `http://${DEV_PROXY_HOST}:18800`
const ct16ApiTarget =
  process.env.CT16_API_PROXY_TARGET || `http://localhost:8080`

export default defineConfig({
  base: process.env.CT16_WEB_BASE || '/',
  server: {
    proxy: {
      // node-green 可视化流程编辑器（可视化编程 · 流式编程）
      '/node-red': {
        target: nodeGreenTarget,
        changeOrigin: true,
        ws: true,
        timeout: 120000,
        proxyTimeout: 120000,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            const from = `http://localhost:${process.env.CLIENT_DEV_PORT || 8001}${req.url}`
            const to = `${options.target}${req.url}`
            console.log(`[vite-proxy] ${req.method} ${from}  ->  ${to}`)
          })
          proxy.on('proxyRes', (proxyRes, req) => {
            console.log(`[vite-proxy] ${req.url}  <=  ${proxyRes.statusCode}`)
          })
          proxy.on('error', (err, req) => {
            console.error(`[vite-proxy] ${req.url}  ERROR`, err.message)
          })
        },
      },
      // zhos-claw 节点管理 / 智能体网关（可视化编程 · 节点创建 & AI 助手）
      // 必须放在通用 /api 规则之前，避免被 CT16 后端吃掉
      '/api/nodes': {
        target: zhosClawTarget,
        changeOrigin: true,
        timeout: 120000,
        proxyTimeout: 120000,
      },
      '/api/simulate': {
        target: zhosClawTarget,
        changeOrigin: true,
        timeout: 120000,
        proxyTimeout: 120000,
      },
      '/api/gateway': {
        target: zhosClawTarget,
        changeOrigin: true,
        timeout: 120000,
        proxyTimeout: 120000,
      },
      '/api/node-manager': {
        target: zhosClawTarget,
        changeOrigin: true,
        timeout: 120000,
        proxyTimeout: 120000,
      },
      // zhos-claw 模型 / 技能 / 配置（智能体配置）
      '/api/models': {
        target: zhosClawTarget,
        changeOrigin: true,
        timeout: 120000,
        proxyTimeout: 120000,
      },
      '/api/skills': {
        target: zhosClawTarget,
        changeOrigin: true,
        timeout: 120000,
        proxyTimeout: 120000,
      },
      '/api/config': {
        target: zhosClawTarget,
        changeOrigin: true,
        timeout: 120000,
        proxyTimeout: 120000,
      },
      '/pico': {
        target: zhosClawTarget,
        changeOrigin: true,
        ws: true,
        timeout: 120000,
        proxyTimeout: 120000,
      },
      '/api': {
        target: ct16ApiTarget,
        changeOrigin: true,
      },
      '/healthz': {
        target: ct16ApiTarget,
        changeOrigin: true,
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
