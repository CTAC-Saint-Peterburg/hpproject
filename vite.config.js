import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: mode === 'android' ? './' : '/',
  build: { outDir: mode === 'android' ? 'dist-android' : 'dist', ...(mode === 'android' ? { emptyOutDir: true } : {}) },
  plugins: [react(), ...(mode === 'android' ? [{
    name: 'android-local-fonts',
    enforce: 'pre',
    transform(code, id) {
      if (id.replaceAll('\\', '/').endsWith('/src/main.jsx')) {
        return { code: "import '../mobile/web/bootstrap.js';\n" + code, map: null };
      }
    },
    generateBundle() {
      for (const name of ['OFL-NotoSansSC.txt', 'OFL-NotoSansSymbols2.txt']) {
        this.emitFile({ type: 'asset', fileName: 'licenses/' + name,
          source: readFileSync(new URL('./mobile/web/fonts/' + name, import.meta.url), 'utf8') });
      }
    },
  }] : [])],
  server: {
    // Native change notifications can miss edits made by external tools on Windows.
    watch: { usePolling: true, interval: 300 },
  },
}))
