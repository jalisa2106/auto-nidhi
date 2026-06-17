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
  optimizeDeps: {
    include: ['recharts'],
  },
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
          // Antd is the biggest — isolate it
          if (id.includes('/antd/') || id.includes('/@ant-design/')) return 'vendor-antd'
          // Charts
          if (id.includes('/recharts/') || id.includes('/d3') || id.includes('/victory')) return 'vendor-charts'
          // PDF / Excel
          if (id.includes('/jspdf') || id.includes('/jspdf-autotable') || id.includes('/xlsx') || id.includes('/jszip')) return 'vendor-export'
          // React ecosystem
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/react-router')) return 'vendor-react'
          // Icons
          if (id.includes('/lucide')) return 'vendor-icons'
          // Everything else
          return 'vendor-misc'
        }
      }
    }
  }
})