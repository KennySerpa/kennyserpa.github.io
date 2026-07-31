/**
 * GUI verification via headless Chromium screenshots + interaction checks.
 *
 * This host has no interactive display. Puppeteer headless is the GUI tool:
 * it drives a real browser, captures PNGs, and asserts interactive behavior.
 * Screenshots land in artifacts/gui-verify/ for human or multimodal review.
 *
 * Prerequisites: `npm run build` (and ideally `npm run pdf`) so dist/ is ready.
 *
 * Usage:
 *   npm run gui
 *   GUI_BASE_URL=http://127.0.0.1:4173 npm run gui   # against running preview
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');
const outDir = path.join(root, 'artifacts', 'gui-verify');
const HOST = '127.0.0.1';
const PORT = Number(process.env.GUI_PREVIEW_PORT || 4175);

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.map': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
};

let failed = 0;
const findings = [];

function pass(msg) {
  console.log(`PASS  ${msg}`);
  findings.push({ ok: true, msg });
}

function fail(msg) {
  console.error(`FAIL  ${msg}`);
  findings.push({ ok: false, msg });
  failed += 1;
}

function assertDist() {
  if (!fs.existsSync(path.join(distDir, 'index.html'))) {
    console.error('[gui] dist/index.html missing. Run `npm run build` first.');
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
  return require('puppeteer');
}

async function screenshot(page, name) {
  const file = path.join(outDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  pass(`screenshot ${path.relative(root, file)}`);
  return file;
}

async function runBrowserChecks(baseUrl) {
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
  const blockedHosts = [];
  const networkHits = [];

  try {
    // --- Desktop full-page + content assertions ---
    const page = await browser.newPage();
    await page.setViewport(VIEWPORTS[0]);

    page.on('request', req => {
      const url = req.url();
      networkHits.push(url);
      try {
        const host = new URL(url).hostname;
        if (host.includes('kserpa.com') && host !== 'kennyserpa.github.io') {
          blockedHosts.push(url);
        }
      } catch {
        /* ignore invalid */
      }
    });

    await page.goto(baseUrl, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.evaluate(() => document.fonts.ready);

    // Content / layout presence
    const ui = await page.evaluate(() => {
      const text = el => (el ? el.textContent.trim() : '');
      return {
        title: document.title,
        h1: text(document.querySelector('h1')),
        tenure: text(document.querySelector('.recruiter-tenure')),
        downloadBtn: Boolean(document.querySelector('[data-action="download-pdf"]')),
        highlightCount: document.querySelectorAll('.highlight-card').length,
        navLinks: document.querySelectorAll('.nav-links a').length,
        experience: Boolean(document.querySelector('#experience')),
        footer: Boolean(document.querySelector('footer')),
        bodyWidth: document.body.scrollWidth,
        viewportWidth: window.innerWidth,
      };
    });

    if (ui.h1 === 'Kenny Serpa') pass(`h1 = ${ui.h1}`);
    else fail(`unexpected h1: ${ui.h1}`);

    if (ui.tenure === 'Experience since Aug 2023') pass(`tenure = ${ui.tenure}`);
    else fail(`unexpected tenure: ${ui.tenure}`);

    if (ui.downloadBtn) pass('Download PDF button present');
    else fail('Download PDF button missing');

    if (ui.highlightCount === 10) pass(`highlight cards = ${ui.highlightCount}`);
    else fail(`expected 10 highlight cards, got ${ui.highlightCount}`);

    if (ui.navLinks >= 4) pass(`nav links = ${ui.navLinks}`);
    else fail(`too few nav links: ${ui.navLinks}`);

    if (ui.experience) pass('#experience section present');
    else fail('#experience section missing');

    // Horizontal overflow check (common mobile/desktop layout bug)
    if (ui.bodyWidth <= ui.viewportWidth + 1) pass('no horizontal overflow (desktop)');
    else fail(`horizontal overflow desktop: body ${ui.bodyWidth} > viewport ${ui.viewportWidth}`);

    await screenshot(page, '01-desktop-full');

    // Header / hero crop
    const header = await page.$('.resume-header');
    if (header) {
      await header.screenshot({ path: path.join(outDir, '02-desktop-header.png') });
      pass('screenshot artifacts/gui-verify/02-desktop-header.png');
    } else {
      fail('resume-header not found for crop');
    }

    // Highlights section crop
    const highlights = await page.$('#highlights');
    if (highlights) {
      await highlights.screenshot({ path: path.join(outDir, '03-desktop-highlights.png') });
      pass('screenshot artifacts/gui-verify/03-desktop-highlights.png');
    }

    // Flip card interaction
    const firstCard = await page.$('.highlight-card');
    if (firstCard) {
      const before = await page.$eval('.highlight-card', el => el.classList.contains('flipped'));
      await firstCard.click();
      await new Promise(r => setTimeout(r, 600));
      const after = await page.$eval('.highlight-card', el => el.classList.contains('flipped'));
      if (!before && after) pass('highlight card flips on click');
      else fail(`highlight flip failed (before=${before}, after=${after})`);
      await screenshot(page, '04-desktop-card-flipped');
      // flip back
      await firstCard.click();
    } else {
      fail('no highlight card to flip');
    }

    // Static PDF must be same-origin and valid (avoid page.goto — Chrome aborts PDF nav)
    const pdfCheck = await page.evaluate(async () => {
      const res = await fetch('./resume.pdf');
      const buf = new Uint8Array(await res.arrayBuffer());
      const magic = String.fromCharCode(...buf.slice(0, 5));
      return {
        ok: res.ok,
        status: res.status,
        contentType: res.headers.get('content-type') || '',
        magic,
        bytes: buf.byteLength,
      };
    });
    if (pdfCheck.ok && pdfCheck.magic === '%PDF-' && pdfCheck.bytes > 10_000) {
      pass(
        `static resume.pdf fetchable (${pdfCheck.bytes} bytes, ${pdfCheck.contentType || 'no ct'})`
      );
    } else {
      fail(`static resume.pdf check failed: ${JSON.stringify(pdfCheck)}`);
    }

    // Click handler opens local PDF in a new window (stub window.open)
    const openUrl = await page.evaluate(() => {
      let opened = null;
      const original = window.open;
      window.open = url => {
        opened = String(url);
        return null;
      };
      document.querySelector('[data-action="download-pdf"]').click();
      window.open = original;
      return opened;
    });
    if (
      openUrl === './resume.pdf' ||
      openUrl === 'resume.pdf' ||
      (openUrl && openUrl.endsWith('resume.pdf'))
    ) {
      pass(`Download PDF opens local URL: ${openUrl}`);
    } else {
      fail(`Download PDF opened unexpected URL: ${openUrl}`);
    }

    // Network: no calls to api.kserpa.com / VPS APIs
    if (blockedHosts.length === 0) {
      pass('no requests to kserpa.com API hosts during load/interact');
    } else {
      fail(`unexpected API host requests:\n  ${blockedHosts.join('\n  ')}`);
    }

    // Mobile viewport + hamburger
    await page.setViewport(VIEWPORTS[2]);
    await page.goto(baseUrl, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.evaluate(() => document.fonts.ready);

    const mobile = await page.evaluate(() => {
      const toggle = document.querySelector('.nav-toggle');
      const menu = document.querySelector('.nav-links');
      const bodyWidth = document.body.scrollWidth;
      const viewportWidth = window.innerWidth;
      return {
        hasToggle: Boolean(toggle),
        toggleVisible: toggle
          ? getComputedStyle(toggle).display !== 'none' &&
            getComputedStyle(toggle).visibility !== 'hidden'
          : false,
        menuOpen: menu ? menu.classList.contains('is-open') : false,
        bodyWidth,
        viewportWidth,
      };
    });

    if (mobile.hasToggle) pass('mobile nav toggle present');
    else fail('mobile nav toggle missing');

    if (mobile.bodyWidth <= mobile.viewportWidth + 2) pass('no horizontal overflow (mobile)');
    else
      fail(
        `horizontal overflow mobile: body ${mobile.bodyWidth} > viewport ${mobile.viewportWidth}`
      );

    await screenshot(page, '05-mobile-full');

    if (mobile.hasToggle) {
      await page.click('.nav-toggle');
      await new Promise(r => setTimeout(r, 300));
      const open = await page.$eval('.nav-links', el => el.classList.contains('is-open'));
      if (open) pass('mobile menu opens on toggle');
      else fail('mobile menu did not open');
      await screenshot(page, '06-mobile-nav-open');
    }

    // Tablet
    await page.setViewport(VIEWPORTS[1]);
    await page.goto(baseUrl, { waitUntil: 'networkidle0', timeout: 30000 });
    await screenshot(page, '07-tablet-full');

    // Print media (what PDF generation sees)
    await page.setViewport(VIEWPORTS[0]);
    await page.goto(`${baseUrl}?print=1`, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.emulateMediaType('print');
    await page.evaluate(() => document.fonts.ready);
    await screenshot(page, '08-print-media');

    const printUi = await page.evaluate(() => {
      const header = document.querySelector('.site-header');
      const tenure = document.querySelector('.recruiter-tenure');
      return {
        siteHeaderDisplay: header ? getComputedStyle(header).display : 'missing',
        tenure: tenure ? tenure.textContent.trim() : '',
      };
    });
    if (printUi.siteHeaderDisplay === 'none') pass('print media hides site chrome (.site-header)');
    else fail(`print media site-header display=${printUi.siteHeaderDisplay}`);
    if (printUi.tenure === 'Experience since Aug 2023') pass('print media tenure correct');
    else fail(`print media tenure wrong: ${printUi.tenure}`);

    await page.close();
  } finally {
    await browser.close();
  }

  return networkHits.length;
}

function renderPdfPages() {
  const pdfPath = path.join(distDir, 'resume.pdf');
  if (!fs.existsSync(pdfPath)) {
    fail('dist/resume.pdf missing — skip PDF page images (run npm run pdf)');
    return;
  }

  const pdftoppm = spawnSync(
    'pdftoppm',
    ['-png', '-r', '144', pdfPath, path.join(outDir, 'pdf-page')],
    { encoding: 'utf8' }
  );
  if (pdftoppm.status !== 0) {
    fail(`pdftoppm failed: ${pdftoppm.stderr || pdftoppm.stdout || 'unknown'}`);
    return;
  }

  const pages = fs
    .readdirSync(outDir)
    .filter(f => f.startsWith('pdf-page') && f.endsWith('.png'))
    .sort();
  if (pages.length > 0) pass(`PDF rendered to ${pages.length} page image(s): ${pages.join(', ')}`);
  else fail('pdftoppm produced no PNG pages');
}

function writeReport() {
  const report = {
    generatedAt: new Date().toISOString(),
    failed,
    findings,
    artifacts: fs.existsSync(outDir)
      ? fs.readdirSync(outDir).filter(f => !f.endsWith('.json'))
      : [],
  };
  fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`\nReport: ${path.relative(root, path.join(outDir, 'report.json'))}`);
}

async function main() {
  assertDist();
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  let server = null;
  let baseUrl = process.env.GUI_BASE_URL;

  try {
    if (!baseUrl) {
      server = await startStaticServer();
      baseUrl = `http://${HOST}:${PORT}/`;
      console.log(`[gui] Serving dist at ${baseUrl}`);
    } else {
      console.log(`[gui] Using GUI_BASE_URL=${baseUrl}`);
    }

    await runBrowserChecks(baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
    renderPdfPages();
  } finally {
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
  }

  writeReport();

  if (failed > 0) {
    console.error(`\n${failed} GUI check(s) failed`);
    process.exit(1);
  }
  console.log('\nAll GUI checks passed');
  console.log(`Screenshots: ${path.relative(root, outDir)}/`);
}

main().catch(err => {
  console.error('[gui] Failed:', err.message || err);
  process.exit(1);
});
