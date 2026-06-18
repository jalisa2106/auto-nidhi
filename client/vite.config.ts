import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // REMOVE the optimizeDeps block entirely
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('/antd/') || id.includes('/@ant-design/')) return 'vendor-antd'
          if (id.includes('/recharts/') || id.includes('/d3') || id.includes('/victory')) return 'vendor-charts'
          if (id.includes('/jspdf') || id.includes('/jspdf-autotable') || id.includes('/xlsx') || id.includes('/jszip')) return 'vendor-export'
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/react-router')) return 'vendor-react'
          if (id.includes('/lucide')) return 'vendor-icons'
          return 'vendor-misc'
        }
      }
    }
  }
})