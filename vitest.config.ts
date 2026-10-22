import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      globals: true,
      include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts', 'api/**/*.test.ts'],
      setupFiles: ['./src/testing/setup.ts'],
      restoreMocks: true,
      // Process CSS imported with ?raw so contract tests can read a stylesheet (primitives/themeVars.test.ts).
      css: { include: [/\.css\?raw$/] },
    },
  }),
);
