/**
 * Build-time resume PDF generator.
 *
 * Serves the Vite `dist/` output locally, renders it with Puppeteer using
 * print media (same process as the former API backend), and writes:
 *   - public/resume.pdf  (source asset for future builds)
 *   - dist/resume.pdf    (deployed artifact)
 *
 * Prerequisites: run `npm run build` first so dist/ exists.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');
const publicPdf = path.join(root, 'public', 'resume.pdf');
const distPdf = path.join(distDir, 'resume.pdf');
const HOST = '127.0.0.1';
const PORT = Number(process.env.PDF_PREVIEW_PORT || 4173);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.map': 'application/json',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
};

function assertDistReady() {
  const indexPath = path.join(distDir, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.error('[pdf] dist/index.html not found. Run `npm run build` first.');
    process.exit(1);
  }
}

function startStaticServer() {
  const server = http.createServer((req, res) => {
    try {
      const url = new URL(req.url || '/', `http://${HOST}:${PORT}`);
      let pathname = decodeURIComponent(url.pathname);
      if (pathname.endsWith('/')) pathname += 'index.html';
      if (pathname === '/') pathname = '/index.html';

      const filePath = path.normalize(path.join(distDir, pathname));
      if (!filePath.startsWith(distDir)) {
        res.writeHead(403).end('Forbidden');
        return;
      }

      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.writeHead(404).end('Not found');
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    } catch (err) {
      res.writeHead(500).end(String(err.message || err));
    }
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(PORT, HOST, () => resolve(server));
  });
}

async function loadPuppeteer() {
  const require = createRequire(import.meta.url);
  try {
    return require('puppeteer');
  } catch {
    console.error('[pdf] puppeteer is not installed. Run `npm install`.');
    process.exit(1);
  }
}

async function renderPdf(url) {
  const puppeteer = await loadPuppeteer();
  const launchOptions = {
    headless: 'shell',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--font-render-hinting=none',
    ],
  };

  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  const browser = await puppeteer.launch(launchOptions);
  try {
    const page = await browser.newPage();
    await page.setCacheEnabled(false);

    const printUrl = new URL(url);
    printUrl.searchParams.set('print', '1');
    printUrl.searchParams.set('_pdf', `${Date.now()}`);

    await page.goto(printUrl.toString(), {
      waitUntil: 'load',
      timeout: 30000,
    });

    await page.emulateMediaType('print');
    await page.evaluate(() => document.fonts.ready);

    // Confirm static tenure is present (Option A accuracy guard).
    const tenureOk = await page.evaluate(() => {
      const el = document.querySelector('.recruiter-tenure');
      return Boolean(el && /Experience since Aug 2023/i.test(el.textContent || ''));
    });
    if (!tenureOk) {
      throw new Error('Expected static tenure "Experience since Aug 2023" in print view');
    }

    const pdfBuffer = await page.pdf({
      format: 'Letter',
      printBackground: true,
      preferCSSPageSize: true,
      scale: 1,
      waitForFonts: true,
    });

    await page.close();
    return pdfBuffer;
  } finally {
    await browser.close();
  }
}

async function main() {
  assertDistReady();

  console.log(`[pdf] Serving ${distDir} at http://${HOST}:${PORT}`);
  const server = await startStaticServer();

  try {
    const url = `http://${HOST}:${PORT}/`;
    console.log(`[pdf] Rendering ${url}`);
    const pdfBuffer = await renderPdf(url);

    fs.mkdirSync(path.dirname(publicPdf), { recursive: true });
    fs.writeFileSync(publicPdf, pdfBuffer);
    fs.writeFileSync(distPdf, pdfBuffer);

    console.log(`[pdf] Wrote ${publicPdf} (${pdfBuffer.length} bytes)`);
    console.log(`[pdf] Wrote ${distPdf} (${pdfBuffer.length} bytes)`);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(err => {
  console.error('[pdf] Failed:', err.message || err);
  process.exit(1);
});
