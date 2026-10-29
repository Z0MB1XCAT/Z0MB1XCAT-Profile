/* Prints the driver sheet on the For teams page to a one-page A4 PDF at
   assets/z0mb1xcat-driver-sheet.pdf (the page's download button).

   Run it whenever results or seats change, with the local server running:

     node serve.mjs            (in another terminal)
     node tools/make-sheet.mjs */
import puppeteer from 'puppeteer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'assets', 'z0mb1xcat-driver-sheet.pdf');

const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
await page.goto('http://localhost:3000/teams.html', { waitUntil: 'networkidle0', timeout: 45000 });
await page.evaluate(() => document.fonts.ready);
await page.emulateMediaType('print');
await page.pdf({ path: out, format: 'A4', printBackground: true, preferCSSPageSize: true });
const pages = await page.evaluate(() => Math.ceil(document.documentElement.scrollHeight / (297 * 96 / 25.4)));
await browser.close();
console.log('wrote', out);
if (pages > 1) console.log('note: the sheet may run past one page; check the PDF');
