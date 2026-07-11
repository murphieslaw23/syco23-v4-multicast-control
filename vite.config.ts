import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  build: {
    // hls.js is an optional lazy-loaded runtime and forms one self-contained
    // vendor chunk; keep the warning threshold just above its minified size.
    chunkSizeWarningLimit: 550,
    rollupOptions: {
      output: {
        manualChunks(id) {
          return id.includes('hls.js') ? 'hls-runtime' : undefined
        },
      },
    },
  },
  resolve: {
    alias: {
      '~': '/',
    },
  },
})
