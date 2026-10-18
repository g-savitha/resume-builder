import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      globals: true,
      include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
      setupFiles: ['./src/testing/setup.ts'],
      restoreMocks: true,
    },
  }),
);
