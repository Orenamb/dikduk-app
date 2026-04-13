import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/nakdan': {
        target: 'https://nakdan-u1-0.loadbalancer.dicta.org.il',
        changeOrigin: true,
        rewrite: () => '/api',
      },
    },
  },
})
