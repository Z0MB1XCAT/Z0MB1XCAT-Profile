/* Builds the site's pages from src/.

   Every page shares one head, nav, menu and footer, written once below.
   Each file in src/ holds only what is different about its page:

     <!--@page { "title": "...", "description": "...", ... } -->
     <!--@before-->   optional: markup placed before the nav
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
// where GitHub Pages serves the site (the repo is Z0MB1XCAT/Z0MB1XCAT-Profile)
const SITE = 'https://z0mb1xcat.github.io/Z0MB1XCAT-Profile/';
const EMAIL = 'businessdexterrees@gmail.com';

const LINKS = [
  ['index.html', 'Home', 'The circuit, the driver, the rig'],
  ['story.html', 'The lap', 'My story, told around the Red Bull Ring'],
  ['driver.html', 'Driver', 'Results, leagues and how I drive'],
  ['rig.html', 'The rig', 'Every part in 3D, and my settings'],
  ['live.html', 'Live', 'Stream schedule and race calendar'],
  ['news.html', 'News', 'Race reports and updates'],
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
  const current = p.current || out;
  const scripts = (p.scripts || []).map(s => `  <script defer src="${s}"></script>\n`).join('');
  const modules = (p.modules || []).map(s => `  <script type="module" src="${s}"></script>\n`).join('');
  const jsClass = `  <script>document.documentElement.classList.add('js');</script>\n`;
  const menu = LINKS.map(([href, t, d]) => `      <li><a href="${href}"${href === current ? ' aria-current="page"' : ''}><span class="t">${t}</span><span class="d">${d}</span></a></li>`).join('\n');
  const socials = SOCIALS.map(([href, t]) => `        <li><a href="${href}">${t}</a></li>`).join('\n');
  const footPages = LINKS.map(([href, t]) => `            <li><a href="${href}">${t}</a></li>`).join('\n');
  const footFollow = SOCIALS.map(([href, t]) => `            <li><a href="${href}">${t}</a></li>`).join('\n');
  const indent = (s, n) => s.split('\n').map(l => (l ? ' '.repeat(n) + l : l)).join('\n');

  return `<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
${p.base ? `  <!-- every link on this page resolves from the site root -->
  <base href="${p.base}">
` : ''}  <title>${esc(p.title)}</title>
  <meta name="description" content="${esc(p.description)}">
  <meta name="theme-color" content="#edebf0">
  <link rel="icon" href="assets/img/logo.png">
  <meta property="og:type" content="${p.ogType || 'website'}">
  <meta property="og:title" content="${esc(p.ogTitle || p.title)}">
  <meta property="og:description" content="${esc(p.ogDescription || p.description)}">
  <meta property="og:image" content="${SITE}${p.ogImage || 'assets/img/og.jpg'}">
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

/* A page with none of the site chrome, for print: the driver sheet. */
function renderBare(name, p) {
  const scripts = (p.scripts || []).map(s => `  <script defer src="${s}"></script>\n`).join('');
  const styles = (p.styles || []).map(s => `  <link rel="stylesheet" href="${s}">\n`).join('');
  return `<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(p.title)}</title>
  <meta name="description" content="${esc(p.description)}">
  <meta name="robots" content="noindex">
  <link rel="icon" href="assets/img/logo.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Sofia+Sans+Extra+Condensed:ital,wght@0,600..900;1,800..900&family=Schibsted+Grotesk:ital,wght@0,400..700;1,400..700&display=swap" rel="stylesheet">
${styles}${scripts}</head>
<body${p.bodyAttrs ? ' ' + p.bodyAttrs : ''}>
${p.main}
</body>
</html>
`;
}

/* ==========================================================================
   News: every file in posts/ is one post, written in Markdown.

     ---
     title: Pole at Montréal
     date: 2026-10-18
     summary: One or two lines for the news list and link previews.
     image: assets/img/news/montreal.jpg      (optional)
     ---
     The post itself. ## for a heading, **bold**, *italic*,
     [a link](https://...), - for a list, > for a quote,
     ![what's in the picture](assets/img/news/pic.jpg "A caption")
     and a YouTube link on a line of its own becomes the video.

   Start one with  npm run post -- "Title of the post". Files whose names
   start with _ , and posts with  draft: true , are left out.
   ========================================================================== */
const postsDir = path.join(root, 'posts');
const newsDir = path.join(root, 'news');
const longDate = d => new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
const shortMonth = d => new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', month: 'short' }).format(d);
const escText = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function inline(t) {
  const codes = [];
  t = escText(t).replace(/`([^`]+)`/g, (_, c) => `\u0000${codes.push(c) - 1}\u0000`);
  t = t
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, txt, href) => `<a class="textlink" href="${href.replace(/"/g, '%22')}">${txt}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g, '$1<em>$2</em>')
    .replace(/(^|[^_\w])_([^_\s][^_]*?)_(?!\w)/g, '$1<em>$2</em>');
  return t.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[i]}</code>`);
}

function youtubeId(line) {
  const m = /^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|live\/)|youtu\.be\/)([\w-]{11})\S*$/.exec(line.trim());
  return m ? m[1] : null;
}

function markdown(md) {
  const lines = md.replace(/<!--[\s\S]*?-->/g, '').split('\n');
  const out = [];
  let para = [], list = null, quote = [];
  const flushPara = () => { if (para.length) out.push(`<p>${inline(para.join(' '))}</p>`); para = []; };
  const flushList = () => { if (list) out.push(`<${list.tag}>${list.items.map(i => `<li>${inline(i)}</li>`).join('')}</${list.tag}>`); list = null; };
  const flushQuote = () => { if (quote.length) out.push(`<blockquote><p>${inline(quote.join(' '))}</p></blockquote>`); quote = []; };
  const flush = () => { flushPara(); flushList(); flushQuote(); };
  for (const raw of lines) {
    const line = raw.trimEnd();
    const t = line.trim();
    let m;
    if (!t) { flush(); continue; }
    if ((m = /^(#{1,3})\s+(.*)$/.exec(t))) { flush(); out.push(m[1].length < 3 ? `<h2>${inline(m[2])}</h2>` : `<h3>${inline(m[2])}</h3>`); continue; }
    if (/^(-{3,}|\*{3,})$/.test(t)) { flush(); out.push('<hr>'); continue; }
    if ((m = /^>\s?(.*)$/.exec(t))) { flushPara(); flushList(); quote.push(m[1]); continue; }
    if ((m = /^[-*]\s+(.*)$/.exec(t)) || (m = /^\d+[.)]\s+(.*)$/.exec(t))) {
      flushPara(); flushQuote();
      const tag = /^\d/.test(t) ? 'ol' : 'ul';
      if (list && list.tag !== tag) flushList();
      if (!list) list = { tag, items: [] };
      list.items.push(m[1]);
      continue;
    }
    if ((m = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)$/.exec(t))) {
      flush();
      out.push(`<figure class="post-fig"><img src="${esc(m[2])}" alt="${esc(m[1])}" loading="lazy">${m[3] ? `<figcaption>${inline(m[3])}</figcaption>` : ''}</figure>`);
      continue;
    }
    const yt = youtubeId(t);
    if (yt) {
      flush();
      out.push(`<figure class="yt"><button type="button" data-yt="${yt}" aria-label="Play the video"><img src="https://i.ytimg.com/vi/${yt}/hqdefault.jpg" alt="" loading="lazy"><span class="yt-play" aria-hidden="true"></span></button></figure>`);
      continue;
    }
    if (/^<[a-z!/]/i.test(t) && !para.length) { flush(); out.push(t); continue; }
    if (list) flushList();
    if (quote.length) flushQuote();
    para.push(t);
  }
  flush();
  return out.join('\n');
}

function loadPosts() {
  if (!fs.existsSync(postsDir)) return [];
  return fs.readdirSync(postsDir)
    .filter(f => f.endsWith('.md') && !f.startsWith('_'))
    .map(f => {
      const src = fs.readFileSync(path.join(postsDir, f), 'utf8').replace(/\r\n/g, '\n').replace(/^﻿/, '');
      const m = /^---\n([\s\S]*?)\n---\n?/.exec(src);
      if (!m) throw new Error(`posts/${f}: start the file with a --- block (title, date, summary)`);
      const meta = {};
      m[1].split('\n').forEach(l => {
        const kv = /^(\w+)\s*:\s*(.*)$/.exec(l.trim());
        if (kv) meta[kv[1].toLowerCase()] = kv[2].replace(/^(["'])(.*)\1$/, '$2').trim();
      });
      const datePart = (meta.date || (/^(\d{4}-\d{2}-\d{2})/.exec(f) || [])[1] || '');
      const date = new Date(datePart + 'T12:00:00Z');
      if (!meta.title) throw new Error(`posts/${f}: needs a title`);
      if (isNaN(date)) throw new Error(`posts/${f}: needs a date like 2026-10-18`);
      const body = src.slice(m[0].length);
      const words = body.replace(/<!--[\s\S]*?-->/g, '').split(/\s+/).filter(Boolean).length;
      return {
        file: f,
        slug: f.replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, '').toLowerCase(),
        title: meta.title, summary: meta.summary || '', image: meta.image || '', draft: /^(true|yes)$/i.test(meta.draft || ''),
        date, iso: datePart, html: markdown(body), minutes: Math.max(1, Math.round(words / 220)),
      };
    })
    .filter(p => !p.draft)
    .sort((a, b) => b.date - a.date || a.slug.localeCompare(b.slug));
}

// a post as a card, for the news page and the home page
function card(p) {
  const pic = p.image
    ? `<span class="nc-img"><img src="${esc(p.image)}" alt="" loading="lazy"></span>`
    : `<span class="nc-img nc-img--date" aria-hidden="true"><b class="display">${p.date.getUTCDate()}</b><span>${shortMonth(p.date)}</span></span>`;
  return `<li><a class="news-card" href="news/${p.slug}.html">${pic}<span class="nc-body"><time datetime="${p.iso}">${longDate(p.date)}</time><span class="nc-t display">${escText(p.title)}</span>${p.summary ? `<span class="nc-s">${escText(p.summary)}</span>` : ''}</span></a></li>`;
}
const cards = (list, cls) => list.length ? `<ol class="news-list${cls ? ' ' + cls : ''}">\n${list.map(p => '  ' + card(p)).join('\n')}\n</ol>` : '<p class="lead muted">Nothing here yet.</p>';

function postPage(p, i, all) {
  const newer = all[i - 1], older = all[i + 1];
  const nav = (q, k) => q ? `<a class="post-nav-a" href="news/${q.slug}.html"><span>${k}</span><b class="display">${escText(q.title)}</b></a>` : '<span></span>';
  return {
    title: `${p.title} | Z0MB1XCAT`,
    description: p.summary || p.title,
    ogType: 'article',
    ogImage: p.image || '',
    base: '../',
    current: 'news.html',
    main: `<article class="post">
  <header class="pagehead post-head contours">
    <div class="container">
      <p class="post-k"><a class="textlink" href="news.html">News</a><time datetime="${p.iso}">${longDate(p.date)}</time><span>${p.minutes} min read</span></p>
      <h1 class="display post-title" data-reveal>${escText(p.title)}</h1>
      ${p.summary ? `<p class="lead muted post-lead">${escText(p.summary)}</p>` : ''}
    </div>
  </header>
  ${p.image ? `<figure class="container post-hero"><img src="${esc(p.image)}" alt=""></figure>` : ''}
  <div class="container">
    <div class="prose">
${p.html.split('\n').map(l => '      ' + l).join('\n')}
    </div>
  </div>
  <nav class="container post-nav" aria-label="More news">
    ${nav(older, 'Before this')}
    ${nav(newer, 'After this')}
  </nav>
  <div class="container post-all"><a class="btn btn--line" href="news.html">All news</a></div>
</article>`,
  };
}

/* ---------- write everything ---------- */
const posts = loadPosts();
const withNews = main => main.replace(/<!--@news(?:\s+(\d+))?\s*-->/g, (_, n) => cards(n ? posts.slice(0, +n) : posts, n ? 'news-list--short' : 'news-list--all'));

const srcDir = path.join(root, 'src');
const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.html')).sort();
for (const f of files) {
  const name = f.replace(/\.html$/, '');
  const page = parse(path.join(srcDir, f));
  page.main = withNews(page.main);
  const html = page.bare ? renderBare(name, page) : render(name, page);
  fs.writeFileSync(path.join(root, name + '.html'), html);
  console.log('built', name + '.html');
}

fs.mkdirSync(newsDir, { recursive: true });
const keep = new Set();
posts.forEach((p, i) => {
  const out = p.slug + '.html';
  if (keep.has(out)) throw new Error(`two posts would both be news/${out}: rename one of them`);
  keep.add(out);
  fs.writeFileSync(path.join(newsDir, out), render('news/' + p.slug, postPage(p, i, posts)));
  console.log('built', 'news/' + out);
});
// a post that was renamed or deleted leaves its old page behind: remove it
for (const f of fs.readdirSync(newsDir)) {
  if (f.endsWith('.html') && !keep.has(f)) { fs.unlinkSync(path.join(newsDir, f)); console.log('removed', 'news/' + f); }
}
