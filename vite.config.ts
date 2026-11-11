import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Tests that format times expect Vietnam time. Set before the test workers start so they inherit it, which makes a
// CI runner (UTC) and a developer machine (UTC+7) produce the same text.
process.env.TZ = 'Asia/Ho_Chi_Minh'

export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '~components': fileURLToPath(new URL('./src/components', import.meta.url)),
      '~features': fileURLToPath(new URL('./src/features', import.meta.url)),
      '~types': fileURLToPath(new URL('./src/types', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
