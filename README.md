# Kenny Serpa — Software Engineer

Personal resume site built with Vite. Fully static — no runtime API.

Served from the `gh-pages` branch via GitHub Pages.

## Local development

```bash
npm install
npm run dev
```

Dev server: **http://localhost:5173** (binds on all interfaces for VS Code Remote).

### VS Code Remote SSH (server has no browser)

If VS Code “detects” the site but the page won’t open:

1. On the remote terminal: `npm run dev` (or `npm run dev:remote`).
2. Open the **Ports** panel (`Ctrl+Shift+P` → “Ports: Focus on Ports View”).
3. Confirm port **5173** is listed and status is **Forwarded** (not just “Detected”).
   - If missing: **Forward a Port** → `5173`.
   - Set visibility to **Local** / Private (default is fine).
4. Open the **Local Address** (e.g. `localhost:5173`) via:
   - Click the local address in the Ports panel, or
   - Command Palette → **Simple Browser: Show** → `http://localhost:5173`
5. Use your **local** machine’s browser, not a browser on the server.

Production-like preview (after build):

```bash
npm run build
npm run preview          # http://localhost:4173
# or
npm run preview:remote
```

Do **not** rely on opening `http://127.0.0.1:5173` _only_ on the SSH host —
that address is the server’s loopback. VS Code must tunnel it to your laptop.

## Build, PDF, and validate

```bash
npm run validate      # lint + format check
npm run build         # Vite → dist/
npm run pdf           # Puppeteer print styles → public/ + dist/resume.pdf
npm run smoke         # assert static-only dist (no API coupling)
npm run gui           # headless Chromium screenshots + interaction checks
npm run build:full    # build + pdf + smoke
npm run verify        # build:full + gui (full local gate)
```

GUI verification uses **Puppeteer headless Chrome** (no display required).
Screenshots and a report are written to `artifacts/gui-verify/` for visual review.
PDF pages are also rasterized with `pdftoppm` when available.

The PDF uses the same print CSS path as before (Letter, print media, fonts).
It is generated at **build time**, so visitors never need `api.kserpa.com`.

Tenure in the header is static: **Experience since Aug 2023**.

## Deployment

Pushes to `main` run `.github/workflows/deploy.yml`:

1. `npm run validate`
2. `npm run build:full` (site + PDF + smoke)
3. Publish `dist/` to the `gh-pages` branch

GitHub Pages: **Deploy from a branch** → `gh-pages` → `/ (root)`.

## Live site

<https://kennyserpa.github.io/>
