import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3000,
    hmr: true,
    open: true,
    proxy: {
      // '/api': {
      //   target: 'https://www.saxmy.com',
      //   changeOrigin: true,
      // },
      '/static/img': {
        target: 'https://www.saxmy.com',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://127.0.0.1:8080/api/v1',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, '')
      },
    },
  },
});
