import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Client-level vite config for when running from client/ directory
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
      '/events': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
