import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    inspect: false,
    include: ['src/**/*.test.{ts,tsx}', 'src/**/*.spec.{ts,tsx}'],
    exclude: ['e2e/**', '**/e2e/**', 'node_modules/**', '**/node_modules/**']
  },
  define: {
    'import.meta.env.VITE_ENABLE_DEBUG': '"false"'
  }
});
