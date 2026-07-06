import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'workers/**/*.test.ts'],
    exclude: ['e2e/**/*'],
    setupFiles: [],
    fileParallelism: false,
    maxWorkers: 1,
  },
});
