/* Starts the home page's 3D scenes and runs them only while on screen. */
import { createTrackScene } from './track-scene.js';
import { bootRig } from './rig-boot.js';

const reduced = !!(window.Z0 && window.Z0.reduced);

/* ---- hero: the circuit ---- */
const heroCanvas = document.querySelector('[data-hero-canvas]');
if (heroCanvas && window.RBR3D && window.Track) {
  try {
    const small = window.matchMedia('(max-width: 899px)').matches;
    const portrait = window.innerHeight > window.innerWidth;
    const Z0 = window.Z0 || {};
    const gate = document.querySelector('[data-gate]');
    // the intro is still on screen: hold on the grid and launch as it cuts away
    const gateUp = !!gate && !gate.hidden && !document.documentElement.classList.contains('gate-seen') && !Z0.gateOut;
    const stage = heroCanvas.closest('.hero-stage');
    const hero = createTrackScene(heroCanvas, {
      mode: 'hero',
      reduced,
      // on a tall screen look along the circuit's long axis so it fits the width
      azimuth: portrait ? -1.38 : -.55,
      distance: portrait ? 2250 : small ? 2050 : 2350,
      elevation: portrait ? .9 : small ? .7 : .56,
      // aim short of the circuit so it sits above the text block
      targetX: portrait ? -300 : small ? -60 : -150,
      targetZ: portrait ? -20 : small ? 260 : 270,
      contourOpacity: .5,
      introWait: true,
    });
    stage.classList.add('is-3d');
    if (gateUp) document.addEventListener('z0:gate-out', () => hero.go(), { once: true });
    else hero.go();
    new IntersectionObserver(([en]) => { if (en.isIntersecting) hero.start(); else hero.stop(); }).observe(heroCanvas);
  } catch (e) {
    console.warn('3D hero unavailable:', e);
  }
}

/* ---- the rig ---- */
const rigRoot = document.querySelector('[data-rig]');
if (rigRoot) bootRig(rigRoot);
