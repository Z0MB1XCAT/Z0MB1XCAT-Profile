/* The story lap in 3D. Scroll position picks a point between chapter
   anchors (the start line, each of the ten corners, the finish) and the car
   eases into every anchor, so each chapter gets a moment to be read. Between
   anchors, the simulated lap decides how far the car travels, so it flies
   down the straights and slows for corners. */
import { createTrackScene } from './track-scene.js';

const sec = document.querySelector('[data-lap]');
const Track = window.Track;

if (sec && Track && window.RBR3D) {
  const Z0 = window.Z0 || {};
  const reduced = !!Z0.reduced;
  const S = window.Sound;
  const T = Track.data;
  const anchors = [0, ...T.corners.map(c => c.t), T.lapTime];
  const N = anchors.length - 1;
  const SECTORS = [1350, 3110, T.length]; // metres where S1, S2, S3 end
  sec.style.setProperty('--segments', N);

  const $ = s => sec.querySelector(s);
  const $$ = s => Array.from(sec.querySelectorAll(s));
  const cards = $$('.ch');
  const dots = $$('[data-lap-dot]');
  const clockEl = $('[data-lap-clock]'), speedEl = $('[data-lap-speed]'), gearEl = $('[data-lap-gear]');
  const thrEl = $('[data-lap-throttle]'), brkEl = $('[data-lap-brake]'), bar = $('[data-lap-progress]');
  const leds = $$('.rev i');
  const sectorEls = $$('[data-sector]');

  let scene = null;
  try {
    scene = createTrackScene($('[data-lap-canvas]'), {
      mode: 'lap', reduced, labels: $('[data-lap-labels]'),
      fadeIn: 620, fadeOut: 940, farIn: 380, farOut: 1150, contourOpacity: .62,
      targetX: -200, targetZ: 60,
      // the chapter card sits on the right (desktop) or along the bottom (phones)
      shift: (w, h) => (w >= 1024 ? { x: .17, y: .08 } : { x: 0, y: .27 }),
    });
  } catch (e) {
    console.warn('3D lap unavailable:', e);
    sec.classList.add('no-3d');
  }
  const mini = Track.draw($('[data-lap-minimap]'), { width: 20, labels: false });

  const target = () => {
    const r = sec.getBoundingClientRect();
    const total = sec.offsetHeight - window.innerHeight;
    return Math.max(0, Math.min(1, -r.top / (total || 1)));
  };
  const ease = u => u * u * (3 - 2 * u);
  const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const timeAt = q => {
    if (q >= N) return T.lapTime;
    const i = Math.floor(q);
    return anchors[i] + (anchors[i + 1] - anchors[i]) * ease(q - i);
  };
  /* Where the car is in the onboard recording. The audio is a real lap at
     the same circuit, so each chapter anchor (start, corners, finish) is
     matched to the moment the real car passed it, found from the video and
     the engine's pitch, and everything between is interpolated. */
  const AUDIO = [0.2, 4.0, 13.4, 18.0, 32.6, 41.9, 44.5, 47.8, 49.4, 58.2, 61.8, 69.3];
  const audioAt = t => {
    if (t <= 0) return AUDIO[0];
    for (let i = 0; i < N; i++) {
      if (t <= anchors[i + 1]) return AUDIO[i] + (AUDIO[i + 1] - AUDIO[i]) * (t - anchors[i]) / (anchors[i + 1] - anchors[i]);
    }
    return AUDIO[N];
  };
  let lastA = AUDIO[0];

  const timeForDist = m => {
    if (m >= T.length) return T.lapTime;
    const i = Math.floor(m / 10);
    const a = T.time[i], b = T.time[i + 1] !== undefined ? T.time[i + 1] : T.lapTime;
    return a + (b - a) * (m / 10 - i);
  };

  function scrollToChapter(k) {
    const total = sec.offsetHeight - window.innerHeight;
    const y = sec.getBoundingClientRect().top + window.scrollY + total * (k / N) + 2;
    if (Z0.lenis) Z0.lenis.scrollTo(y, { duration: 1.4 });
    else window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
  }
  dots.forEach(d => d.addEventListener('click', () => scrollToChapter(+d.dataset.lapDot)));
  cards.forEach((c, i) => c.addEventListener('focusin', () => { if (active !== i) scrollToChapter(i); }));

  let active = -1;
  function setChapter(k) {
    if (k === active) return;
    active = k;
    cards.forEach((c, i) => { c.classList.toggle('is-active', i === k); c.classList.toggle('is-past', i < k); });
    dots.forEach((d, i) => { d.classList.toggle('is-active', i === k); if (i === k) d.setAttribute('aria-current', 'step'); else d.removeAttribute('aria-current'); });
  }

  let q = target() * N, lastQ = q, painted = -1, moving = 0, last = 0, lastChange = 0, sectorState = '';
  let visible = true;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(sec);

  function paint(now, dt) {
    const t = timeAt(q);
    const d = q >= N ? T.length - .01 : Track.distAtTime(t);
    const k = Math.max(0, Math.min(N, Math.round(q)));
    const blend = Math.min(1, (1 - smooth(0, .8, q)) + smooth(N - .8, N, q));
    if (scene) scene.setLap(t, blend, Math.cos(q * Math.PI) * .9, k >= 1 && k <= 10 ? k : 0, dt);
    mini.setDistance(d);

    const v = Track.speedAt(d);
    const dv = Track.speedAt(Math.min(T.length, d + 12)) - Track.speedAt(Math.max(0, d - 12));
    let brake = dv < -2 ? Math.min(1, -dv / 14) : 0;
    let throttle = brake ? 0 : (dv > .4 || v > 320 ? 1 : .55 + Math.max(0, dv) * .5);
    const parked = q <= .001;
    if (parked) { throttle = 0; brake = 0; }
    const rpm = parked ? 4200 : Track.rpmFor(v);

    clockEl.textContent = Track.fmt(t);
    speedEl.textContent = parked ? 0 : Math.round(v);
    gearEl.textContent = parked ? 'N' : Track.gearFor(v);
    thrEl.style.transform = `scaleY(${throttle.toFixed(3)})`;
    brkEl.style.transform = `scaleY(${brake.toFixed(3)})`;
    const lit = Math.round(Math.max(0, Math.min(1, (rpm - 9300) / 2500)) * leds.length);
    leds.forEach((l, i) => l.classList.toggle('on', i < lit));

    let state = '';
    sectorEls.forEach((el, i) => {
      const done = d >= SECTORS[i] - .5;
      const cur = !done && d >= (i ? SECTORS[i - 1] : 0);
      state += done ? 'd' : cur ? 'c' : 'p';
      el.classList.toggle('is-done', done);
      el.classList.toggle('is-current', cur);
    });
    if (state !== sectorState) {
      sectorState = state;
      sectorEls.forEach((el, i) => {
        el.querySelector('b').textContent = el.classList.contains('is-done')
          ? (timeForDist(SECTORS[i]) - (i ? timeForDist(SECTORS[i - 1]) : 0)).toFixed(3) : '';
      });
    }
    if (bar) bar.style.transform = `scaleX(${(q / N).toFixed(4)})`;
    setChapter(k);

    // the onboard recording plays in step with the car while you scroll
    const a = audioAt(t);
    if (Math.abs(q - lastQ) > .0008) moving = now;
    if (S && S.ready) S.scrub(a, q >= N || dt <= 0 ? 0 : (a - lastA) / dt);
    lastA = a;
    lastQ = q;
  }

  function frame(now) {
    const dt = last ? Math.min(.05, (now - last) / 1000) : .016;
    last = now;
    const goal = target() * N;
    q += (goal - q) * (reduced ? 1 : .12);
    if (Math.abs(goal - q) < .0005) q = goal;
    // keep rendering briefly after the scroll stops so the camera can settle
    if (q !== painted) lastChange = now;
    if (visible && (now - lastChange < 1500 || (S && S.ready && now - moving < 1400))) {
      paint(now, dt);
      painted = q;
    }
    requestAnimationFrame(frame);
  }
  paint(performance.now(), .016);
  requestAnimationFrame(frame);
}
