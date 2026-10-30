import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Port backend untuk proxy saat development. Ubah via API_PORT bila PORT backend diganti.
const apiPort = process.env.API_PORT ?? '3001';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: `http://localhost:${apiPort}`,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
