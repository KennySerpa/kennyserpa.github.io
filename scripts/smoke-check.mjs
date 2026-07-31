/**
 * Post-build smoke checks for a static-only resume site.
 * Exit 0 only if dist/ is self-contained and free of remote API coupling.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');

const FORBIDDEN = ['api.kserpa.com', 'api.kennyserpa.com', '__API_URL__', 'VITE_API_URL'];

const REQUIRED_HTML_SNIPPETS = [
  'Experience since Aug 2023',
  'data-action="download-pdf"',
  'Kenny Serpa',
];

let failed = 0;

function fail(msg) {
  console.error(`FAIL  ${msg}`);
  failed += 1;
}

function pass(msg) {
  console.log(`PASS  ${msg}`);
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

function main() {
  if (!fs.existsSync(distDir)) {
    fail('dist/ does not exist — run npm run build first');
    process.exit(1);
  }

  const indexPath = path.join(distDir, 'index.html');
  if (!fs.existsSync(indexPath)) {
    fail('dist/index.html missing');
  } else {
    pass('dist/index.html exists');
    const html = fs.readFileSync(indexPath, 'utf8');
    for (const snippet of REQUIRED_HTML_SNIPPETS) {
      if (html.includes(snippet)) pass(`index.html contains "${snippet}"`);
      else fail(`index.html missing "${snippet}"`);
    }
  }

  const pdfPath = path.join(distDir, 'resume.pdf');
  if (!fs.existsSync(pdfPath)) {
    fail('dist/resume.pdf missing — run npm run pdf after build');
  } else {
    const buf = fs.readFileSync(pdfPath);
    if (buf.slice(0, 5).toString() === '%PDF-') {
      pass(`dist/resume.pdf is a PDF (${buf.length} bytes)`);
    } else {
      fail('dist/resume.pdf does not start with %PDF-');
    }
    if (buf.length < 10_000) {
      fail(`dist/resume.pdf suspiciously small (${buf.length} bytes)`);
    }
  }

  const textLike = walk(distDir).filter(f => /\.(html|js|css|map|txt|xml|json)$/i.test(f));

  let forbiddenHits = 0;
  for (const file of textLike) {
    const content = fs.readFileSync(file, 'utf8');
    for (const needle of FORBIDDEN) {
      if (content.includes(needle)) {
        fail(`${path.relative(root, file)} contains forbidden "${needle}"`);
        forbiddenHits += 1;
      }
    }
  }
  if (forbiddenHits === 0) {
    pass('no forbidden API strings in dist text assets');
  }

  const jsFiles = textLike.filter(f => f.endsWith('.js') && !f.endsWith('.map'));
  const jsJoined = jsFiles.map(f => fs.readFileSync(f, 'utf8')).join('\n');
  if (jsJoined.includes('resume.pdf')) {
    pass('built JS references local resume.pdf');
  } else {
    fail('built JS does not reference resume.pdf');
  }

  if (failed > 0) {
    console.error(`\n${failed} smoke check(s) failed`);
    process.exit(1);
  }

  console.log('\nAll smoke checks passed');
}

main();
