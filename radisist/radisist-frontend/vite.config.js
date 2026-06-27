import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 7005,
    host: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:7400",
        changeOrigin: true,
      },
      "/static": {
        target: "http://127.0.0.1:7400",
        changeOrigin: true,
      },
    },
  }
})
