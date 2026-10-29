/* Wires a [data-rig] block to the 3D rig: lazy start when near the screen,
   the parts list, pins, and the optional exploded-view and reset buttons. */
import { createRigScene } from './rig-scene.js';

export function bootRig(root) {
  const reduced = !!(window.Z0 && window.Z0.reduced);
  const canvas = root.querySelector('[data-rig-canvas]');
  const buttons = Array.from(root.querySelectorAll('[data-part]'));
  const hint = root.querySelector('[data-rig-hint]');
  const explodeBtn = root.querySelector('[data-explode]');
  const resetBtn = root.querySelector('[data-reset]');
  let rig = null;

  const boot = () => {
    if (rig) return rig;
    try {
      rig = createRigScene(canvas, {
        reduced,
        pins: root.querySelector('[data-rig-pins]'),
        poster: 'assets/video/onboard-poster.jpg',
        // AV1 where the browser can play it (smaller), H.264 otherwise
        video: document.createElement('video').canPlayType('video/webm; codecs="av01.0.04M.08, opus"')
          ? 'assets/video/onboard-rbr.webm' : 'assets/video/onboard-rbr.mp4',
        onFocus: name => buttons.forEach(b => b.classList.toggle('is-active', b.dataset.part === name)),
        onInteract: () => { if (hint) hint.style.opacity = '0'; },
      });
    } catch (e) {
      console.warn('3D rig unavailable:', e);
      root.classList.add('no-3d');
    }
    return rig;
  };

  buttons.forEach(b => b.addEventListener('click', () => {
    const r = boot(); if (!r) return;
    r.focus(b.classList.contains('is-active') ? null : b.dataset.part);
  }));
  if (explodeBtn) explodeBtn.addEventListener('click', () => {
    const r = boot(); if (!r) return;
    const on = explodeBtn.getAttribute('aria-pressed') !== 'true';
    explodeBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    r.explode(on);
  });
  if (resetBtn) resetBtn.addEventListener('click', () => { const r = boot(); if (r) r.focus(null); });

  new IntersectionObserver(([en]) => {
    if (en.isIntersecting) { const r = boot(); if (r) r.start(); }
    else if (rig) rig.stop();
  }, { rootMargin: '200px 0px' }).observe(canvas);
}

const page = document.querySelector('[data-rig-page]');
if (page) bootRig(page.querySelector('[data-rig]'));
