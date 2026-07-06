import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
  envPrefix: ['VITE_', 'SAKURA_'],
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) return 'react-vendor';
            if (id.includes('lucide-react')) return 'lucide-vendor';
            if (id.includes('@monaco-editor')) return 'monaco-vendor';
            if (id.includes('react-markdown') || id.includes('remark-gfm')) return 'markdown-vendor';
            return 'vendor';
          }
        },
      },
    },
  },
});
