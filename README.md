# Z0MB1XCAT

Personal site for Z0MB1XCAT, an open-wheel sim racer from Swansea, Wales.

Static HTML, CSS and JavaScript. GitHub Pages serves the files in the repo
as they are; Three.js, Lenis and the fonts load from CDNs.

## Pages

| File          | What it is                                                              |
|---------------|-------------------------------------------------------------------------|
| `index.html`  | 3D circuit hero, results, 3D rig, start game, week, next race           |
| `story.html`  | The story as a scroll-driven 3D lap of the Red Bull Ring                |
| `driver.html` | Results, leagues and teams, driving style, favourites, goals            |
| `rig.html`    | The rig in 3D with exploded view, full spec, settings, wishlist         |
| `live.html`   | Live status, Twitch and Discord, the week's schedule, race calendar     |
| `teams.html`  | For teams: what I'm open to, the driver sheet, contact                  |
| `404.html`    | Served by GitHub Pages for any missing path                             |

## How the pages are made

Every page shares one head, nav, menu and footer. They are written once, in
`tools/build.mjs`, and each page's own content lives in `src/`:

```
src/index.html  src/story.html  src/driver.html  src/rig.html
src/live.html   src/teams.html  src/404.html
```

**Edit `src/`, never the `.html` files in the root.** After any change, run:

```bash
node tools/build.mjs
```

That rewrites the root pages. To add a page, add `src/<name>.html` with the
same `<!--@page {...} -->` header the others use, and add it to `LINKS` in
`tools/build.mjs` if it belongs in the menu.

## Things you'll update

- **Race calendar**: `assets/data/calendar.js`. Each league round has a date,
  an optional UK start time, a track and a flag code; add `result: 'P3'` after
  each race. The Live page shows the next round with a countdown, the rest by
  month, and the results so far; the home page shows the next round. Rounds
  without a time show "Time TBC" until you add one.
- **Settings**: `assets/data/settings.js`. One set per tab (F1 25, pedals,
  ACC, Assetto Corsa, iRacing), each with a short note and grouped rows, shown
  at `rig.html#settings` with a "Copy for Discord" button. The `common` block
  (equaliser and base curve) is added to every wheelbase tab. Change
  `updated` when you edit it.
- **Results**: the `results` table in `src/index.html` and `src/driver.html`,
  the podium chapter in `src/story.html`, and the driver sheet in
  `src/teams.html`. Then rebuild, and regenerate the PDF (below).
- **Stream schedule**: edit it on Twitch. The site reads your Twitch
  schedule each time a page loads, so it follows automatically. The copy at
  the top of `assets/js/site.js` is only shown if Twitch can't be reached;
  update it now and then so the two don't drift far apart.
- **Your reaction time**: `REF` near the top of the game in `assets/js/home.js`
  (milliseconds), and the matching sentences in the pages that mention 0.183.
- **Contact email**: `EMAIL` in `tools/build.mjs` (footer) and in
  `src/teams.html`.

### The driver sheet PDF

`assets/z0mb1xcat-driver-sheet.pdf` is the For teams page's driver sheet,
printed to one A4 page. After changing the sheet, regenerate it with the
local server running:

```bash
node tools/make-sheet.mjs
```

## Live status

"Live now" comes from Twitch itself (through the free decapi.me uptime
service, checked every two minutes), not from the schedule, so the site only
says live when the stream is actually up. If that service is down, the site
just shows the next scheduled stream.

## Layout

```
src/                       each page's own content (see above)
tools/build.mjs            builds the pages: shared head, nav, menu, footer
tools/make-sheet.mjs       prints the driver sheet PDF
assets/css/site.css        reset, tokens, type, nav, menu, buttons, footer, motion
assets/css/pages.css       every page section, and the print layout of the sheet
assets/data/               calendar.js and settings.js, the files you edit
assets/js/site.js          schedule and live status, nav, menu, sound toggle, embeds
assets/js/motion.js        headline and list reveals, photo wipes, marquee, magnetic buttons
assets/js/audio.js         engine sound from the onboard recording
assets/js/home.js          statement fill, photo parallax, start game
assets/js/live.js          live page status and countdown
assets/js/calendar.js      race calendar on the live page
assets/js/settings.js      settings tabs on the rig page
assets/js/track.js         lap timing helpers and the 2D mini map
assets/js/track-rbr.js     circuit outline, corners and simulated speed trace
assets/js/rbr-3d.js        terrain heights and 3D circuit points
assets/js/three/           the 3D scenes (Three.js modules)
  track-scene.js           the circuit on its terrain, hero and lap cameras
  car.js                   the car, built in code in Z0MB1XCAT colours
  rig-scene.js             the rig, built part by part
  rig-boot.js              hooks the rig up to its page controls
  home-3d.js, lap-3d.js    start the scenes on the home and story pages
assets/img/                logo, flags, rig cutouts, Simrace1 photos, contours
assets/audio/              engine audio from the onboard lap (loudness normalised)
assets/video/              the onboard lap: AV1 (.webm, 5 MB) and H.264 (.mp4, 6.5 MB)
```

## Video

The onboard is encoded twice. Browsers that play AV1 (Chrome, Edge, Firefox,
Android, recent Safari) get the 5 MB `.webm`; the rest get the 6.5 MB `.mp4`.
Both are 1152 × 648 at 30 fps with the engine audio. The source recording is
in the V1 project (`MyWebsite/videos/_source/onboard-original.mp4`).

## Sound

All engine sound is from my own onboard lap of the Red Bull Ring in Assetto
Corsa, so it is real and it is mine to use. The onboard video on the home
page carries its own sound. On the lap page the recording is scrubbed in step
with the car: the `AUDIO` list in `assets/js/three/lap-3d.js` holds the moment
(in seconds) the real car passed the start line, each corner and the finish,
and everything in between is interpolated. The sound toggles and the start
game play the short slices listed in `SEG` at the top of `assets/js/audio.js`.
Nothing is synthesised: if the recording can't load, the site is silent.

Browsers only allow sound after a click, tap or key press on each page
(scrolling doesn't count). When sound is on but a page hasn't had that tap
yet, the sound buttons pulse and read "Tap to start sound".

## 3D models

The car and the rig are built in code, not downloaded: `car.js` lofts the
bodywork through cross-sections and uses real airfoil sections for the wings;
`rig-scene.js` models each part from product photos (Moza R9 V3, GS V2P, CRP2,
GT Omega Prime Lite and Inertia). There are no model files to load.

## Motion

`motion.js` adds the reveals, the marquee and the magnetic buttons. Pages
crossfade between each other with the browser's View Transitions, set up in
`site.css`. All of it switches off when a visitor asks for reduced motion,
and none of it hides content if JavaScript doesn't run.

## Where the data comes from

- Circuit outline: OpenStreetMap, © OpenStreetMap contributors (ODbL).
- Terrain: Copernicus DEM GLO-90 via the Open-Meteo elevation API. The 3D
  scenes exaggerate height 1.6 times so the hills read. The contour lines used
  as background texture are traced from the same grid.
- Lap speeds: a simple lap simulation for an F1-style car. Not recorded
  telemetry, and the site says so.
- Flags: flagcdn.com (public domain).

Credits are in every page footer. Keep them if you change the design.

## Publishing on GitHub Pages

The site is the repository `Z0MB1XCAT/Z0MB1XCAT-Profile`, published by GitHub
Pages from the `main` branch at:

**https://z0mb1xcat.github.io/Z0MB1XCAT-Profile/**

To publish a change: rebuild if you edited `src/`, then commit and push.

```bash
node tools/build.mjs
git add -A
git commit -m "Describe the change"
git push
```

Pages updates within a minute or two. The share links (`SITE` in
`tools/build.mjs`) and the 404 page (`base` in `src/404.html`) both use the
`/Z0MB1XCAT-Profile/` path. If the site ever moves (a renamed repo, a
`Z0MB1XCAT.github.io` repo, or a custom domain), change those two and rebuild.

## Running it locally

```bash
npm install
node serve.mjs
```

Then open `http://localhost:3000`. Use the server rather than opening the files
directly: the Twitch embed and the 3D modules both need http.

`node screenshot.mjs http://localhost:3000 label` saves a full-page capture to
`temporary screenshots/` for checking layout. None of the tools are needed to
deploy, and `node_modules/` and `temporary screenshots/` are gitignored.
