import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(root, 'temporary screenshots');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

function nextIndex() {
  const files = fs.existsSync(outDir) ? fs.readdirSync(outDir) : [];
  const nums = files.map(f => {
    const m = f.match(/^screenshot-(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  });
  return (nums.length ? Math.max(...nums) : 0) + 1;
}

const url = process.argv[2] || 'http://localhost:3000';
const label = process.argv[3];
const width = parseInt(process.argv[4] || '1600', 10);
const height = parseInt(process.argv[5] || '1000', 10);
const fullPage = process.argv[6] !== 'viewport';

const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width, height });
// 'load' not 'networkidle0': live embeds (Twitch, Discord) hold
// connections open, so the network never goes idle.
await page.goto(url, { waitUntil: 'load', timeout: 45000 });
await new Promise(r => setTimeout(r, 3200));

const idx = nextIndex();
const name = `screenshot-${idx}${label ? '-' + label : ''}.png`;
const outPath = path.join(outDir, name);
await page.screenshot({ path: outPath, fullPage });
await browser.close();

console.log(outPath);
