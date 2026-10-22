import { defineConfig, type Plugin, type PreviewServer, type ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import brandApi from './api/brand.ts';

const src = fileURLToPath(new URL('./src', import.meta.url));

/**
 * Serves api/brand.ts at /api/brand in `vite dev` and `vite preview`, as Vercel does in production, so local
 * runs, the verify skill and e2e all go through the same handler. (e2e stubs the route; see e2e/helpers.ts.)
 */
function brandApiPlugin(): Plugin {
  const mount = (server: ViteDevServer | PreviewServer) => {
    server.middlewares.use('/api/brand', (req, res) => {
      const url = new URL(req.originalUrl ?? req.url ?? '/', 'http://localhost');
      void brandApi.fetch(new Request(url, { method: req.method ?? 'GET' })).then(async (response) => {
        res.statusCode = response.status;
        response.headers.forEach((value, key) => {
          res.setHeader(key, value);
        });
        res.end(Buffer.from(await response.arrayBuffer()));
      });
    });
  };
  return { name: 'brand-api', configureServer: mount, configurePreviewServer: mount };
}

export default defineConfig({
  plugins: [react(), brandApiPlugin()],
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
