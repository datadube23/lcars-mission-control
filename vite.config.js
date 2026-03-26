import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// This config is used when running vite from the client/ directory.
// The build script in package.json cd's into client/ first.
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
