/* Prints the driver sheet (cv.html) to the PDF that teams download, and
   saves the picture of it shown on the For teams page:

     assets/z0mb1xcat-driver-sheet.pdf
     assets/img/driver-sheet-preview.jpg
     assets/img/qr-site.svg            (the QR code on the sheet)

   Run it after changing results, seats or anything else on the sheet:

     npm run sheet

   It serves the site itself, so nothing else needs to be running. Run the
   build first if you've edited src/ (npm run publish does both). */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import QRCode from 'qrcode';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://z0mb1xcat.github.io/Z0MB1XCAT-Profile/';
const pdfOut = path.join(root, 'assets', 'z0mb1xcat-driver-sheet.pdf');
const jpgOut = path.join(root, 'assets', 'img', 'driver-sheet-preview.jpg');
const qrOut = path.join(root, 'assets', 'img', 'qr-site.svg');

// the QR code, in the site's plum
fs.writeFileSync(qrOut, await QRCode.toString(SITE, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#1e1228', light: '#0000' } }));

// a tiny static server for the site folder
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.pdf': 'application/pdf' };
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
  const file = path.join(root, rel);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;

const browser = await puppeteer.launch({ headless: 'new' });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1000, height: 1400, deviceScaleFactor: 900 / (210 / 25.4 * 96) });
  page.on('pageerror', e => console.log('page error:', e.message));
  await page.goto(base + 'cv.html', { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForFunction('window.Z0_CV_READY === true', { timeout: 20000 });

  // does everything fit on the one page?
  const over = await page.evaluate(() => {
    const s = document.querySelector('.sheet').getBoundingClientRect();
    const worst = [...document.querySelectorAll('.sheet *')].reduce((m, el) => Math.max(m, el.getBoundingClientRect().bottom), 0);
    return Math.round(worst - s.bottom);
  });
  if (over > 0) console.log(`note: the sheet runs ${over}px past the bottom of the page; trim something in src/cv.html`);

  const box = await (await page.$('.sheet')).boundingBox();
  await page.screenshot({ path: jpgOut, type: 'jpeg', quality: 84, clip: box });

  await page.emulateMediaType('print');
  await page.pdf({ path: pdfOut, printBackground: true, preferCSSPageSize: true });
  console.log('wrote', path.relative(root, pdfOut));
  console.log('wrote', path.relative(root, jpgOut));
  console.log('wrote', path.relative(root, qrOut));
} finally {
  await browser.close();
  server.close();
}
