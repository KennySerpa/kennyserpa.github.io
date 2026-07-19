import { defineConfig, loadEnv } from 'vite';

/**
 * Vite configuration for a GitHub Pages user site.
 * User sites are served from the repository root, so base is '/'.
 * If this ever becomes a project site under a subpath, update `base` accordingly.
 *
 * Environment variables prefixed with VITE_ are exposed to the client bundle.
 * VITE_API_URL lets contributors point the frontend at a local backend for
 * end-to-end testing without editing source code.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    root: 'src',
    base: './',
    publicDir: '../public',
    define: {
      __API_URL__: JSON.stringify(env.VITE_API_URL || 'https://api.kserpa.com'),
    },
    build: {
      outDir: '../dist',
      assetsDir: 'assets',
      emptyOutDir: true,
      minify: true,
      sourcemap: true,
    },
  };
});
