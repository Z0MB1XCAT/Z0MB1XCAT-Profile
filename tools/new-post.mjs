/* Starts a news post.

     npm run post -- "Pole at Montréal"

   Makes posts/<today>-pole-at-montreal.md with the details filled in and a
   short guide to the formatting. Write the post, then run  npm run build
   (or  npm run publish  to build and push it live). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const title = process.argv.slice(2).join(' ').trim();
if (!title) {
  console.log('Give the post a title:  npm run post -- "Pole at Montréal"');
  process.exit(1);
}

const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(new Date());
const slug = title.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'post';
const dir = path.join(root, 'posts');
fs.mkdirSync(dir, { recursive: true });
const file = path.join(dir, `${today}-${slug}.md`);
if (fs.existsSync(file)) {
  console.log(`posts/${path.basename(file)} already exists`);
  process.exit(1);
}

fs.writeFileSync(file, `---
title: ${title}
date: ${today}
summary: One or two lines for the news list and link previews.
image:
---
<!--
  Write the post below this box (the box itself never shows on the site).

  A blank line starts a new paragraph.
  ## A heading
  **bold** and *italic*
  [link text](https://www.twitch.tv/z0mb1xcat)
  - a list item
  > a quote

  Pictures: put them in assets/img/news/, then
  ![what's in the picture](assets/img/news/monza.jpg "Optional caption")
  For the picture at the top of the post and on its card, fill in
  image: above, e.g.  image: assets/img/news/monza.jpg

  A YouTube link on a line of its own becomes the video.

  Not ready yet? Add  draft: true  above and it stays off the site.
-->

`);
console.log(`Made posts/${path.basename(file)}`);
