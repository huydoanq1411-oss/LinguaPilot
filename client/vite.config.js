import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', 'VITE_')
  const config = JSON.stringify({ apiUrl: env.VITE_API_URL || 'http://localhost:3000/api' })
  return {
    plugins: [react(), {
      name: 'lesson-api-config',
      configureServer(server) {
        server.middlewares.use('/app-config.json', (_req, res) => {
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Cache-Control', 'no-store')
          res.end(config)
        })
      },
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'app-config.json', source: config })
      },
    }],
  }
})
