import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: [
      'app/__tests__/**/*.test.ts',
      'app/**/*.test.ts',
    ],
    coverage: {
      reporter: ['text', 'json', 'html'],
      include: [
        'app/composables/**/*.ts',
        'app/types/**/*.ts',
        'app/server/**/*.ts',
      ],
      exclude: [
        'app/shims-vue.d.ts',
        'app/bootstrap.ts',
        'app/__tests__/**',
        'app/main.ts',
        'app/components/**',
      ],
      thresholds: {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100,
      },
    },
  },
})
