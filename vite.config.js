import { defineConfig } from 'vite';

/**
 * Vite configuration for a GitHub Pages user site.
 * User sites are served from the repository root, so base is '/'.
 * If this ever becomes a project site under a subpath, update `base` accordingly.
 */
export default defineConfig({
  root: 'src',
  base: './',
  publicDir: '../public',
  build: {
    outDir: '../dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    minify: true,
    sourcemap: true,
  },
});
