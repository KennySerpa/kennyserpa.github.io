import { defineConfig } from 'vite';

/**
 * Vite configuration for a GitHub Pages user site.
 * User sites are served from the repository root; base './' keeps asset
 * paths relative so the build works on both Pages and local preview.
 *
 * The site is fully static — no runtime API URL is injected.
 */
export default defineConfig({
  root: 'src',
  base: './',
  publicDir: '../public',
  // Friendly for VS Code Remote SSH: listen on all interfaces so port
  // forwarding and "Open in Browser" can reach the process reliably.
  server: {
    host: true, // 0.0.0.0 + ::
    port: 5173,
    strictPort: true,
    // Do not try to open a browser on the server (no display over SSH).
    open: false,
  },
  preview: {
    host: true,
    port: 4173,
    strictPort: true,
    open: false,
  },
  build: {
    outDir: '../dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    minify: true,
    sourcemap: true,
  },
});
