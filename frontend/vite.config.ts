import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import electron from 'vite-plugin-electron/simple';

export default defineConfig({
  plugins: [
    react(),
    basicSsl(),
    electron({
      main: {
        entry: 'electron/main.ts',
      },
      preload: {
        input: 'electron/preload.ts',
      },
      renderer: {}
    })
  ],

  // MUST be relative for Electron file:// loading to work
  base: './',

  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    chunkSizeWarningLimit: 1000,
    emptyOutDir: true,
  },

  server: {
    https: true,
    port: 5173,
    host: '0.0.0.0',
    strictPort: false,
  },
});