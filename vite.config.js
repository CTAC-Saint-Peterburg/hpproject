import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Native change notifications can miss edits made by external tools on Windows.
    watch: { usePolling: true, interval: 300 },
  },
})
