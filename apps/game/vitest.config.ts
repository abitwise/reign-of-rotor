import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    inspect: false
  },
  define: {
    'import.meta.env.VITE_ENABLE_DEBUG': '"false"'
  }
});
