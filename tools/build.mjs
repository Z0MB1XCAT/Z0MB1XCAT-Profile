/* Builds the site's pages from src/.

   Every page shares one head, nav, menu and footer, written once below.
   Each file in src/ holds only what is different about its page:

     <!--@page { "title": "...", "description": "...", ... } -->
     <!--@before-->   optional: markup placed before the nav (the home intro)
     <!--@main-->     the page content, placed inside <main>

   Run it after editing anything in src/ or the shared chrome below:

     node tools/build.mjs

   It writes index.html, story.html and the rest to the site root, which is
   what GitHub Pages serves. Never edit those root files by hand: the next
   build overwrites them. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://z0mb1xcat.github.io/';
const EMAIL = 'businessdexterrees@gmail.com';

const LINKS = [
  ['index.html', 'Home', 'The circuit, the driver, the rig'],
  ['story.html', 'The lap', 'My story, told around the Red Bull Ring'],
  ['driver.html', 'Driver', 'Results, leagues and how I drive'],
  ['rig.html', 'The rig', 'Every part in 3D, and my settings'],
  ['live.html', 'Live', 'Stream schedule and race calendar'],
  ['teams.html', 'For teams', 'Seats, sponsors and collabs: get in touch'],
];
const SOCIALS = [
  ['https://www.twitch.tv/z0mb1xcat', 'Twitch'],
  ['https://www.youtube.com/@Z0MB1XCAT', 'YouTube'],
  ['https://www.tiktok.com/@z0mb1xcat', 'TikTok'],
  ['https://discord.gg/ycYuqF2Wdp', 'Discord'],
];
const WORDMARK = 'Z<span class="z0">0</span>MB1XCAT';
const IMPORTMAP = `  <script type="importmap">
    { "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js",
      "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/"
    } }
  </script>
`;

const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function parse(file) {
  const src = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const m = /<!--@page([\s\S]*?)-->/.exec(src);
  if (!m) throw new Error(`${file}: missing <!--@page {...} -->`);
  const page = JSON.parse(m[1]);
  const rest = src.slice(m.index + m[0].length);
  const mainAt = rest.indexOf('<!--@main-->');
  if (mainAt < 0) throw new Error(`${file}: missing <!--@main-->`);
  const beforeAt = rest.indexOf('<!--@before-->');
  page.before = beforeAt >= 0 ? rest.slice(beforeAt + 14, mainAt).trim() : '';
  page.main = rest.slice(mainAt + 12).trim();
  return page;
}

function render(name, p) {
  const out = name + '.html';
  const url = SITE + (name === 'index' || name === '404' ? '' : out);
  const scripts = (p.scripts || []).map(s => `  <script defer src="${s}"></script>\n`).join('');
  const modules = (p.modules || []).map(s => `  <script type="module" src="${s}"></script>\n`).join('');
  const jsClass = p.gate
    ? `  <script>
    document.documentElement.classList.add('js');
    try {
      if (sessionStorage.getItem('z0-gate') === '1' || location.hash) document.documentElement.classList.add('gate-seen');
    } catch (e) {}
  </script>\n`
    : `  <script>document.documentElement.classList.add('js');</script>\n`;
  const menu = LINKS.map(([href, t, d]) => `      <li><a href="${href}"${href === out ? ' aria-current="page"' : ''}><span class="t">${t}</span><span class="d">${d}</span></a></li>`).join('\n');
  const socials = SOCIALS.map(([href, t]) => `        <li><a href="${href}">${t}</a></li>`).join('\n');
  const footPages = LINKS.map(([href, t]) => `            <li><a href="${href}">${t}</a></li>`).join('\n');
  const footFollow = SOCIALS.map(([href, t]) => `            <li><a href="${href}">${t}</a></li>`).join('\n');
  const indent = (s, n) => s.split('\n').map(l => (l ? ' '.repeat(n) + l : l)).join('\n');

  return `<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
${p.base ? `  <!-- GitHub Pages serves this file for any missing path, at any depth, so
       every link resolves from the site root. Change to your repo path if the
       site is ever published as a project site (e.g. "/repo-name/"). -->
  <base href="${p.base}">
` : ''}  <title>${esc(p.title)}</title>
  <meta name="description" content="${esc(p.description)}">
  <meta name="theme-color" content="#edebf0">
  <link rel="icon" href="assets/img/logo.png">
  <meta property="og:type" content="${p.ogType || 'website'}">
  <meta property="og:title" content="${esc(p.ogTitle || p.title)}">
  <meta property="og:description" content="${esc(p.ogDescription || p.description)}">
  <meta property="og:image" content="${SITE}assets/img/og.jpg">
  <meta property="og:url" content="${url}">
  <meta name="twitter:card" content="summary_large_image">

${jsClass}  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Sofia+Sans+Extra+Condensed:ital,wght@0,600..900;1,800..900&family=Schibsted+Grotesk:ital,wght@0,400..700;1,400..700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="assets/css/site.css">
  <link rel="stylesheet" href="assets/css/pages.css">
${p.modules && p.modules.length ? IMPORTMAP : ''}  <script defer src="https://unpkg.com/lenis@1.1.13/dist/lenis.min.js"></script>
  <script defer src="assets/js/audio.js"></script>
  <script defer src="assets/js/site.js"></script>
  <script defer src="assets/js/motion.js"></script>
${scripts}${modules}</head>
<body${p.bodyAttrs ? ' ' + p.bodyAttrs : ''}>
  <a class="skip" href="#main">Skip to content</a>

${p.before ? indent(p.before, 2) + '\n\n' : ''}  <header class="nav" data-nav>
    <a class="brand" href="index.html" aria-label="Z0MB1XCAT, home"><img src="assets/img/logo.png" alt="" width="40" height="40"><span>${WORDMARK}</span></a>
    <div class="nav-actions">
      <a class="btn btn--accent" href="live.html" data-live-btn><span class="live-dot"></span><span class="nav-live-label">Watch live</span></a>
      <button class="nav-sound" type="button" data-sound-toggle aria-pressed="false" aria-label="Turn sound on">
        <svg class="off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 9.5l5 5M22 9.5l-5 5"/></svg>
        <svg class="on" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19.5 5.5a9 9 0 0 1 0 13"/></svg>
      </button>
      <button class="nav-menu" type="button" data-menu-open aria-expanded="false" aria-controls="menu" aria-label="Open menu">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 8h16M4 16h10"/></svg>
      </button>
    </div>
  </header>

  <div class="menu" id="menu" data-menu aria-label="Menu">
    <div class="menu-top">
      <a class="brand" href="index.html"><img src="assets/img/logo.png" alt="" width="40" height="40"><span>${WORDMARK}</span></a>
      <button class="menu-close" type="button" data-menu-close>Close <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
    </div>
    <ul class="menu-links">
${menu}
    </ul>
    <div class="menu-foot">
      <ul class="socials">
${socials}
      </ul>
      <button class="menu-sound" type="button" data-sound-toggle aria-pressed="false" aria-label="Turn sound on">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/></svg><span data-sound-label>Sound off</span>
      </button>
      <p class="meta" data-next-line>Swansea, Wales</p>
    </div>
  </div>

  <main id="main" tabindex="-1">
${indent(p.main, 4)}
  </main>

  <footer class="foot contours sec--plum">
    <div class="container">
      <p class="foot-big" aria-label="Cymru am byth">Cymru am byth</p>
      <div class="foot-row">
        <div>
          <h2>Z0MB1XCAT</h2>
          <p class="foot-small">Independent sim racer from Swansea, Wales. For seats, sponsorship, league invites and collabs:</p>
          <p class="foot-mail"><a href="mailto:${EMAIL}">${EMAIL}</a></p>
          <img class="flag mt-5" src="assets/img/wales-flag.svg" alt="Flag of Wales" width="36" height="22">
        </div>
        <div>
          <h2>Pages</h2>
          <ul class="foot-links">
${footPages}
          </ul>
        </div>
        <div>
          <h2>Follow</h2>
          <ul class="foot-links">
${footFollow}
          </ul>
        </div>
        <div>
          <h2>Credits</h2>
          <p class="foot-small">Circuit from <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors. Terrain from Copernicus DEM via <a href="https://open-meteo.com/">Open-Meteo</a>. Lap speeds are simulated. Alpine, McLaren and Williams are my league seats; I'm not connected to the real teams.</p>
        </div>
      </div>
      <div class="foot-base"><span>© <span data-year>2026</span> Z0MB1XCAT</span><span>All times UK</span></div>
    </div>
  </footer>
</body>
</html>
`;
}

const srcDir = path.join(root, 'src');
const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.html')).sort();
for (const f of files) {
  const name = f.replace(/\.html$/, '');
  const html = render(name, parse(path.join(srcDir, f)));
  fs.writeFileSync(path.join(root, name + '.html'), html);
  console.log('built', name + '.html');
}
