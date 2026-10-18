import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const src = fileURLToPath(new URL('./src', import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    // `@/<module>` resolves to that module's index.ts only. Deep imports do not resolve.
    alias: [{ find: /^@\/([\w-]+)$/, replacement: `${src}/$1/index.ts` }],
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    // The manifest lets .size-limit.js measure exactly what the shell loads up front.
    manifest: true,
    rollupOptions: {
      output: { entryFileNames: 'assets/shell-[hash].js', chunkFileNames: 'assets/chunk-[name]-[hash].js' },
    },
  },
});
