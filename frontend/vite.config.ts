import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'

function applyHeaders(server: ViteDevServer, csp: string) {
  server.middlewares.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
    res.setHeader('Content-Security-Policy', csp)
    next()
  })
}

function securityHeaders(devCsp: string, previewCsp: string): Plugin {
  return {
    name: 'security-headers',
    configureServer(server) {
      applyHeaders(server, devCsp)
    },
    configurePreviewServer(server) {
      applyHeaders(server, previewCsp)
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const api = env.VITE_API_BASE_URL || 'http://localhost:8000'
  const shared = [
    "default-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ]
  const previewCsp = [
    ...shared,
    "script-src 'self'",
    `connect-src 'self' ${api} https://api.open-meteo.com`,
  ].join('; ')
  const devCsp = [
    ...shared,
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    `connect-src 'self' ${api} ws: wss: http://127.0.0.1:* http://localhost:* https://api.open-meteo.com`,
  ].join('; ')

  return {
    plugins: [react(), securityHeaders(devCsp, previewCsp)],
  }
})
