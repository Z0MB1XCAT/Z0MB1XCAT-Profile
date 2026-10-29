/* The rig, modelled part by part from product photos of the real kit:
   GT Omega Prime Lite and Inertia, Moza R9 V3, GS V2P and CRP2, and a
   1000R 32 inch display on a side post. Metres; the driver faces +z.
   Parts are grouped so each one can be picked, focused and exploded. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const ACCENT = new THREE.Color('#ffd23f');
const V = (x, y, z) => new THREE.Vector3(x, y, z);

/* ---------------- textures, drawn on canvases ---------------- */

function tex(w, h, draw, repeat) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); }
  return t;
}

const forgedCarbon = () => tex(256, 256, (c, w, h) => {
  c.fillStyle = '#1b1a1f'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 340; i++) {
    const g = 24 + Math.random() * 34 | 0;
    c.fillStyle = `rgba(${g},${g},${g + 4},${.35 + Math.random() * .5})`;
    c.beginPath();
    const x = Math.random() * w, y = Math.random() * h, r = 4 + Math.random() * 16;
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + Math.random(); c.lineTo(x + Math.cos(a) * r * (.4 + Math.random()), y + Math.sin(a) * r * (.4 + Math.random())); }
    c.fill();
  }
}, 7);

const hexFace = () => tex(128, 128, (c, w, h) => {
  c.fillStyle = '#151418'; c.fillRect(0, 0, w, h);
  const r = 9, dx = r * Math.sqrt(3), dy = r * 1.5;
  for (let row = -1; row < h / dy + 1; row++) for (let col = -1; col < w / dx + 1; col++) {
    const cx = col * dx + (row % 2 ? dx / 2 : 0), cy = row * dy;
    c.beginPath();
    for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; c.lineTo(cx + Math.cos(a) * (r - 1.2), cy + Math.sin(a) * (r - 1.2)); }
    c.closePath();
    const gr = c.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    gr.addColorStop(0, '#3a383f'); gr.addColorStop(1, '#0f0e12');
    c.fillStyle = gr; c.fill();
  }
});

const weave = () => tex(64, 64, (c, w, h) => {
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const on = (x + y) % 4 < 2;
    c.fillStyle = on ? '#2b2a30' : '#141317'; c.fillRect(x * 8, y * 8, 8, 8);
  }
}, 10);

const label = (text, { w = 256, h = 64, font = '800 40px Arial', color = '#f1ecf5', sub } = {}) => tex(w, h, (c) => {
  c.clearRect(0, 0, w, h);
  c.fillStyle = color; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = font; c.fillText(text, w / 2, sub ? h * .4 : h / 2);
  if (sub) { c.font = '600 14px Arial'; c.fillText(sub, w / 2, h * .82); }
});

function decal(t, w, h) {
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false }));
}

/* ---------------- geometry helpers ---------------- */

/* 8020-style aluminium profile cross section with T-slots on every face */
function profileShape(w, h) {
  const pitch = .04, s = .0085, d = .0055;
  const sh = new THREE.Shape();
  const xs = [], ys = [];
  for (let c = -w / 2 + pitch / 2; c < w / 2; c += pitch) xs.push(c);
  for (let c = -h / 2 + pitch / 2; c < h / 2; c += pitch) ys.push(c);
  sh.moveTo(-w / 2, -h / 2);
  xs.forEach(c => { sh.lineTo(c - s / 2, -h / 2); sh.lineTo(c - s / 2, -h / 2 + d); sh.lineTo(c + s / 2, -h / 2 + d); sh.lineTo(c + s / 2, -h / 2); });
  sh.lineTo(w / 2, -h / 2);
  ys.forEach(c => { sh.lineTo(w / 2, c - s / 2); sh.lineTo(w / 2 - d, c - s / 2); sh.lineTo(w / 2 - d, c + s / 2); sh.lineTo(w / 2, c + s / 2); });
  sh.lineTo(w / 2, h / 2);
  xs.slice().reverse().forEach(c => { sh.lineTo(c + s / 2, h / 2); sh.lineTo(c + s / 2, h / 2 - d); sh.lineTo(c - s / 2, h / 2 - d); sh.lineTo(c - s / 2, h / 2); });
  sh.lineTo(-w / 2, h / 2);
  ys.slice().reverse().forEach(c => { sh.lineTo(-w / 2, c + s / 2); sh.lineTo(-w / 2 + d, c + s / 2); sh.lineTo(-w / 2 + d, c - s / 2); sh.lineTo(-w / 2, c - s / 2); });
  sh.closePath();
  return sh;
}

const shapeCache = {};
function beam(group, mat, w, h, from, to, roll = 0, caps) {
  const key = w + 'x' + h;
  shapeCache[key] = shapeCache[key] || profileShape(w, h);
  const len = from.distanceTo(to);
  const g = new THREE.ExtrudeGeometry(shapeCache[key], { depth: len, bevelEnabled: false, curveSegments: 1 });
  g.translate(0, 0, -len / 2);
  const m = new THREE.Mesh(g, mat);
  m.position.copy(from).add(to).multiplyScalar(.5);
  const dir = to.clone().sub(from).normalize();
  if (Math.abs(dir.y) > .99) m.up.set(0, 0, 1);
  m.lookAt(to);
  m.rotateZ(roll);
  group.add(m);
  if (caps) {
    // black plastic end caps
    for (const end of [-1, 1]) {
      const cap = new THREE.Mesh(new THREE.BoxGeometry(w + .002, h + .002, .006), caps);
      cap.position.z = end * (len / 2 + .003);
      m.add(cap);
    }
  }
  return m;
}

function plateXZ(outline, holes, t, mat) {
  const sh = new THREE.Shape();
  outline.forEach(([x, z], i) => (i ? sh.lineTo(x, z) : sh.moveTo(x, z)));
  sh.closePath();
  (holes || []).forEach(hp => {
    const p = new THREE.Path();
    hp.forEach(([x, z], i) => (i ? p.lineTo(x, z) : p.moveTo(x, z)));
    p.closePath();
    sh.holes.push(p);
  });
  const g = new THREE.ExtrudeGeometry(sh, { depth: t, bevelEnabled: true, bevelThickness: .002, bevelSize: .002, bevelSegments: 1, curveSegments: 8 });
  g.rotateX(Math.PI / 2);
  return new THREE.Mesh(g, mat);
}

function slot(cx, cz, w, h) {
  const r = h / 2, pts = [];
  for (let k = 0; k <= 8; k++) { const a = -Math.PI / 2 + k / 8 * Math.PI; pts.push([cx + w / 2 - r + Math.cos(a) * r, cz + Math.sin(a) * r]); }
  for (let k = 0; k <= 8; k++) { const a = Math.PI / 2 + k / 8 * Math.PI; pts.push([cx - w / 2 + r + Math.cos(a) * r, cz + Math.sin(a) * r]); }
  return pts;
}

function rod(a, b, r, mat, seg = 10) {
  const len = a.distanceTo(b);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat);
  m.position.copy(a).add(b).multiplyScalar(.5);
  m.quaternion.setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize());
  return m;
}

/* ---------------- the parts ---------------- */

export function buildRig(posterUrl) {
  const rig = new THREE.Group();
  const parts = {};
  const part = (name) => { const g = new THREE.Group(); g.name = name; g.userData.part = name; rig.add(g); parts[name] = g; return g; };

  const alu = new THREE.MeshStandardMaterial({ color: 0x1b1a20, metalness: .6, roughness: .4 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x202026, metalness: .55, roughness: .35 });
  const anod = new THREE.MeshStandardMaterial({ color: 0x17161b, metalness: .5, roughness: .32 });
  const plastic = new THREE.MeshStandardMaterial({ color: 0x0d0c10, roughness: .7 });
  const silver = new THREE.MeshStandardMaterial({ color: 0xb9b5c0, metalness: .9, roughness: .26 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xb8925a, metalness: .85, roughness: .3 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xc8a96a, metalness: .6, roughness: .4 });
  const fabric = new THREE.MeshPhysicalMaterial({ color: 0x1a191e, roughness: .95, sheen: 1, sheenColor: new THREE.Color(0x4a4552), sheenRoughness: .55, side: THREE.DoubleSide });
  const fabric2 = new THREE.MeshPhysicalMaterial({ color: 0x141317, roughness: .95, sheen: .8, sheenColor: new THREE.Color(0x3a3640), sheenRoughness: .6, side: THREE.DoubleSide });
  const leather = new THREE.MeshStandardMaterial({ color: 0x1c1b20, roughness: .72 });
  const carbonForged = new THREE.MeshStandardMaterial({ map: forgedCarbon(), roughness: .32, metalness: .35 });
  const glow = c => new THREE.MeshBasicMaterial({ color: c, toneMapped: false });

  /* ===== cockpit: GT Omega Prime Lite ===== */
  const ck = part('cockpit');
  for (const x of [-.27, .27]) beam(ck, alu, .04, .08, V(x, .04, -.7), V(x, .04, .78), 0, plastic);
  beam(ck, alu, .04, .08, V(-.31, .04, -.73), V(.31, .04, -.73), Math.PI / 2, plastic);
  beam(ck, alu, .04, .08, V(-.31, .04, .82), V(.31, .04, .82), Math.PI / 2, plastic);
  for (const z of [-.52, -.13]) beam(ck, alu, .04, .04, V(-.25, .1, z), V(.25, .1, z));
  for (const x of [-.27, .27]) {
    beam(ck, alu, .04, .08, V(x, .08, .42), V(x, .68, .42), 0, plastic);
    beam(ck, alu, .04, .04, V(x, .1, .74), V(x, .52, .46));
  }
  beam(ck, alu, .04, .08, V(-.31, .7, .42), V(.31, .7, .42), Math.PI / 2, plastic);
  // wheelbase mounting plate with slots
  const wbPlate = plateXZ([[-.16, -.13], [.16, -.13], [.16, .13], [-.16, .13]], [slot(-.08, 0, .05, .012), slot(.08, 0, .05, .012), slot(-.08, .08, .05, .012), slot(.08, .08, .05, .012)], .008, steel);
  wbPlate.position.set(0, .748, .46); ck.add(wbPlate);
  // pedal plate: slotted steel on two angled rails
  const pg = new THREE.Group();
  const pedalPlate = plateXZ([[-.26, -.22], [.26, -.22], [.26, .22], [-.26, .22]], [
    slot(-.16, -.12, .1, .02), slot(0, -.12, .1, .02), slot(.16, -.12, .1, .02),
    slot(-.16, .02, .1, .02), slot(0, .02, .1, .02), slot(.16, .02, .1, .02),
  ], .006, steel);
  pg.add(pedalPlate);
  for (const x of [-.2, .2]) beam(pg, alu, .04, .04, V(x, -.026, -.22), V(x, -.026, .22));
  pg.position.set(0, .2, .62); pg.rotation.x = -.38;
  ck.add(pg);
  // seat brackets on the crossbars
  for (const x of [-.255, .255]) {
    const br = new THREE.Mesh(new THREE.BoxGeometry(.006, .15, .38), steel);
    br.position.set(x, .2, -.33); ck.add(br);
    const sl = new THREE.Mesh(new THREE.BoxGeometry(.03, .02, .42), steel);
    sl.position.set(x * .92, .13, -.33); ck.add(sl);
  }

  /* ===== seat: GT Omega Inertia bucket ===== */
  const seat = part('seat');
  const key = (v, rows) => { for (let i = 1; i < rows.length; i++) if (v <= rows[i][0]) { const t = (v - rows[i - 1][0]) / (rows[i][0] - rows[i - 1][0]); const s = t * t * (3 - 2 * t); return rows[i - 1][1] + (rows[i][1] - rows[i - 1][1]) * s; } return rows[rows.length - 1][1]; };
  const Wk = [[0, .25], [.12, .265], [.3, .245], [.48, .235], [.62, .262], [.7, .255], [.77, .17], [.85, .155], [.94, .145], [1, .1]];
  const Dk = [[0, .2], [.12, .2], [.3, .13], [.48, .1], [.62, .14], [.7, .14], [.77, .07], [.85, .07], [.94, .06], [1, .02]];
  const SH = .82, NSQ = 3;
  const backPt = (u, v, inset = 0) => {
    const W = key(v, Wk) - inset, D = Math.max(.01, key(v, Dk) - inset * .6);
    const th = u * Math.PI / 2, e = 2 / NSQ;
    const x = W * Math.sign(Math.sin(th)) * Math.pow(Math.abs(Math.sin(th)), e);
    const z = D * (1 - Math.pow(Math.abs(Math.cos(th)), e)) - .025 * Math.sin(v * Math.PI) + inset * .5;
    return V(x, v * SH, z);
  };
  const surface = (fn, su, sv, mat) => {
    const pos = [], idx = [];
    for (let j = 0; j <= sv; j++) for (let i = 0; i <= su; i++) { const p = fn(i / su * 2 - 1, j / sv); pos.push(p.x, p.y, p.z); }
    for (let j = 0; j < sv; j++) for (let i = 0; i < su; i++) { const a = j * (su + 1) + i, b = a + 1, c = a + su + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return new THREE.Mesh(g, mat);
  };
  const backG = new THREE.Group();
  backG.add(surface((u, v) => backPt(u, v, 0), 48, 56, fabric2));
  backG.add(surface((u, v) => backPt(u * .97, v * .985, .028).add(V(0, .006, 0)), 48, 56, fabric));
  // rolled edge round the shell
  const rim = [];
  for (let j = 0; j <= 40; j++) rim.push(backPt(1, j / 40));
  for (let i = 19; i >= -19; i--) rim.push(backPt(i / 20, 1));
  for (let j = 40; j >= 0; j--) rim.push(backPt(-1, j / 40));
  backG.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rim), 300, .017, 10, false), fabric));
  // harness slots: grey rims round dark holes
  for (const sx of [-1, 1]) {
    const p = backPt(sx * .13, .705, .028);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.026, .006, 8, 24), new THREE.MeshStandardMaterial({ color: 0x6b6870, roughness: .5, metalness: .2 }));
    ring.scale.set(1.15, .45, 1); ring.position.copy(p).add(V(0, 0, .004));
    const hole = new THREE.Mesh(new THREE.CircleGeometry(.026, 20), plastic);
    hole.scale.set(1.1, .38, 1); hole.position.copy(p).add(V(0, 0, .003));
    backG.add(ring, hole);
  }
  const gtLogo = decal(label('GT OMEGA', { font: 'italic 900 42px Arial' }), .1, .025);
  gtLogo.position.copy(backPt(.35, .9, .028)).add(V(0, 0, .008));
  backG.add(gtLogo);
  backG.position.set(0, .29, -.6);
  backG.rotation.x = -.26;
  seat.add(backG);
  // cushion: a bolstered U profile pulled along the seat
  const cush = new THREE.Shape();
  [[-.25, 0], [.25, 0], [.25, .14], [.205, .165], [.15, .075], [-.15, .075], [-.205, .165], [-.25, .14]].forEach(([x, y], i) => (i ? cush.lineTo(x, y) : cush.moveTo(x, y)));
  cush.closePath();
  const cg = new THREE.ExtrudeGeometry(cush, { depth: .42, bevelEnabled: true, bevelThickness: .03, bevelSize: .022, bevelSegments: 6, curveSegments: 12 });
  const cushion = new THREE.Mesh(cg, fabric);
  cushion.position.set(0, .25, -.57); cushion.rotation.x = -.07;
  seat.add(cushion);
  const subHole = new THREE.Mesh(new THREE.CircleGeometry(.022, 20), plastic);
  subHole.scale.set(1.2, .7, 1); subHole.rotation.x = -Math.PI / 2 - .07; subHole.position.set(0, .358, -.2);
  seat.add(subHole);
  const shellBase = new THREE.Mesh(new RoundedBoxGeometry(.5, .05, .46, 3, .018), fabric2);
  shellBase.position.set(0, .245, -.36); shellBase.rotation.x = -.07;
  seat.add(shellBase);

  /* ===== wheelbase: Moza R9 V3 ===== */
  const TILT = -.1;
  const AX = V(0, .815, .56); // centre of the body
  const wb = part('wheelbase');
  const wbG = new THREE.Group();
  const oct = new THREE.Shape();
  const S = .068, C = .02;
  [[-S + C, -S], [S - C, -S], [S, -S + C], [S, S - C], [S - C, S], [-S + C, S], [-S, S - C], [-S, -S + C]].forEach(([x, y], i) => (i ? oct.lineTo(x, y) : oct.moveTo(x, y)));
  oct.closePath();
  const bodyGeo = new THREE.ExtrudeGeometry(oct, { depth: .19, bevelEnabled: true, bevelThickness: .004, bevelSize: .004, bevelSegments: 2 });
  bodyGeo.translate(0, 0, -.095);
  wbG.add(new THREE.Mesh(bodyGeo, anod));
  // cooling fins on the top and both sides
  for (let i = 0; i < 7; i++) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(.004, .007, .12), anod);
    f.position.set(-.036 + i * .012, S + .006, .015); wbG.add(f);
  }
  for (const sx of [-1, 1]) for (let i = 0; i < 6; i++) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(.007, .004, .11), anod);
    f.position.set(sx * (S + .006), -.03 + i * .011, .02); wbG.add(f);
  }
  for (const sx of [-1, 1]) {
    const mz = decal(label('MOZA', { font: '900 46px Arial' }), .07, .018);
    mz.position.set(sx * (S + .011), .0, .02); mz.rotation.y = sx * Math.PI / 2;
    wbG.add(mz);
  }
  // front face plate, collar, shaft, quick release
  const face = new THREE.Mesh(new RoundedBoxGeometry(.15, .15, .012, 3, .012), anod);
  face.position.z = -.1; wbG.add(face);
  const stack = [[.056, .014, -.113], [.036, .058, -.15], [.044, .03, -.193]];
  stack.forEach(([r, l, z]) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, l, 40), anod); c.rotation.x = Math.PI / 2; c.position.z = z; wbG.add(c); });
  for (let k = 0; k < 6; k++) {
    const a = k / 6 * Math.PI * 2;
    const b = new THREE.Mesh(new THREE.CylinderGeometry(.004, .004, .006, 10), silver);
    b.rotation.x = Math.PI / 2; b.position.set(Math.cos(a) * .036, Math.sin(a) * .036, -.21); wbG.add(b);
  }
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(.05, .003, 8, 48), silver);
  ring2.position.z = -.107; wbG.add(ring2);
  wbG.position.copy(AX); wbG.rotation.x = TILT;
  wb.add(wbG);

  /* ===== wheel: Moza GS V2P ===== */
  const wh = part('wheel');
  const wG = new THREE.Group();
  const plate = new THREE.Shape();
  const half = [[0, .074], [.085, .077], [.098, .097], [.158, .1], [.174, .084], [.176, .04], [.152, .018], [.13, .004], [.13, -.06], [.11, -.087], [.045, -.093], [0, -.093]];
  const outline = half.concat(half.slice(1, -1).reverse().map(([x, y]) => [-x, y]));
  outline.forEach(([x, y], i) => (i ? plate.lineTo(x, y) : plate.moveTo(x, y)));
  plate.closePath();
  const pgeo = new THREE.ExtrudeGeometry(plate, { depth: .016, bevelEnabled: true, bevelThickness: .003, bevelSize: .003, bevelSegments: 2, curveSegments: 6 });
  pgeo.translate(0, 0, -.008);
  wG.add(new THREE.Mesh(pgeo, carbonForged));
  // grips: wrapped tubes curving down each side, with darker tips
  for (const sx of [-1, 1]) {
    const path = new THREE.CatmullRomCurve3([V(sx * .14, .07, 0), V(sx * .19, .066, 0), V(sx * .222, .02, .004), V(sx * .224, -.05, .006), V(sx * .2, -.105, .004), V(sx * .165, -.122, 0)]);
    wG.add(new THREE.Mesh(new THREE.TubeGeometry(path, 40, .022, 14, false), leather));
    const tip = new THREE.Mesh(new THREE.SphereGeometry(.024, 16, 12), carbonForged);
    tip.scale.set(1.25, .9, 1); tip.position.set(sx * .162, -.122, 0); wG.add(tip);
    const top = new THREE.Mesh(new THREE.SphereGeometry(.022, 16, 12), leather);
    top.position.set(sx * .14, .07, 0); wG.add(top);
    // paddle behind the plate
    const pad = new THREE.Mesh(new RoundedBoxGeometry(.075, .045, .005, 2, .002), carbonForged);
    pad.position.set(sx * .1, .01, .03); pad.rotation.z = sx * -.25; wG.add(pad);
  }
  const FZ = -.013; // driver-facing surface
  // LED bar and the teal edge light
  const leds = ['#4be08a', '#4be08a', '#4be08a', '#e5242f', '#e5242f', '#e5242f', '#e5242f', '#a35bff', '#a35bff', '#a35bff'];
  leds.forEach((c, i) => {
    const l = new THREE.Mesh(new THREE.SphereGeometry(.0032, 10, 8), glow(c));
    l.position.set(-.045 + i * .01, .066, FZ); wG.add(l);
  });
  const teal = glow('#3fe0c5');
  for (const sx of [-1, 1]) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(.035, .0025, .002), teal); t.position.set(sx * .07, .074, FZ); wG.add(t);
  }
  const tb = new THREE.Mesh(new THREE.BoxGeometry(.09, .0025, .002), teal); tb.position.set(0, -.091, FZ); wG.add(tb);
  const logo = decal(label('MOZA', { font: '900 44px Arial', sub: 'R A C I N G' }), .07, .022);
  logo.position.set(0, .044, FZ - .001); logo.rotation.y = Math.PI; wG.add(logo);
  // rotary encoders with lit rings
  const enc = (x, y, r, col) => {
    const back = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.55, r * 1.55, .003, 32), plastic);
    back.rotation.x = Math.PI / 2; back.position.set(x, y, FZ - .001); wG.add(back);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 1.3, .0018, 6, 36), glow(col));
    ring.position.set(x, y, FZ - .003); wG.add(ring);
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.05, .014, 20), anod);
    knob.rotation.x = Math.PI / 2; knob.position.set(x, y, FZ - .008); wG.add(knob);
  };
  enc(-.03, .012, .013, '#b6e05a'); enc(.03, .012, .013, '#f2c21a');
  enc(-.058, -.04, .013, '#e5242f'); enc(.058, -.04, .013, '#ff8a3d'); enc(0, -.058, .009, '#e5242f');
  // buttons with coloured rings
  const btn = (x, y, col) => {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(.0085, .0085, .007, 20), plastic);
    cap.rotation.x = Math.PI / 2; cap.position.set(x, y, FZ - .003); wG.add(cap);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.0095, .0015, 6, 24), glow(col));
    ring.position.set(x, y, FZ - .007); wG.add(ring);
  };
  [[-.163, .045, '#3fe0c5'], [-.137, .078, '#4f8bff'], [-.108, .087, '#ff4fd8'], [-.1, .002, '#e5242f'], [-.1, -.052, '#d6f04a'],
    [.108, .087, '#a35bff'], [.137, .078, '#e5242f'], [.163, .045, '#f2e04a'], [.1, .002, '#3fe0c5'], [.1, -.052, '#4be08a']].forEach(([x, y, c]) => btn(x, y, c));
  // thumb encoders on the ears
  for (const sx of [-1, 1]) {
    const k = new THREE.Mesh(new THREE.CylinderGeometry(.009, .009, .022, 18), anod);
    k.position.set(sx * .128, .052, FZ - .008); wG.add(k);
  }
  // quick release hub on the back
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .03, 32), anod);
  hub.rotation.x = Math.PI / 2; hub.position.z = .024; wG.add(hub);
  // sits on the end of the shaft, on the same tilt
  const shaftEnd = V(0, 0, -.235).applyAxisAngle(V(1, 0, 0), TILT).add(AX);
  wG.position.copy(shaftEnd); wG.rotation.x = TILT;
  wh.add(wG);

  /* ===== pedals: Moza CRP2 ===== */
  const pd = part('pedals');
  const pG = new THREE.Group();
  const baseShape = new THREE.Shape();
  [[-.2, .02], [-.17, .0], [.17, .0], [.2, .02], [.2, .045], [-.2, .045]].forEach(([z, y], i) => (i ? baseShape.lineTo(z, y) : baseShape.moveTo(z, y)));
  baseShape.closePath();
  for (const sx of [-1, 1]) {
    const g = new THREE.ExtrudeGeometry(baseShape, { depth: .03, bevelEnabled: true, bevelThickness: .003, bevelSize: .003, bevelSegments: 1 });
    const m = new THREE.Mesh(g, anod);
    m.rotation.y = Math.PI / 2; m.position.set(sx * .2 + (sx < 0 ? -.015 : -.015), 0, 0);
    pG.add(m);
    const chev = new THREE.Mesh(new THREE.BoxGeometry(.002, .006, .12), gold);
    chev.position.set(sx * .217, .028, .03); chev.rotation.x = .15; pG.add(chev);
  }
  const deckTop = new THREE.Mesh(new THREE.BoxGeometry(.4, .01, .4), anod);
  deckTop.position.set(0, .045, 0); pG.add(deckTop);
  const cf = new THREE.Mesh(new THREE.PlaneGeometry(.32, .12), new THREE.MeshStandardMaterial({ map: weave(), roughness: .35, metalness: .3 }));
  cf.rotation.x = -Math.PI / 2; cf.position.set(0, .051, -.13); pG.add(cf);
  const faceTex = hexFace();
  [-.13, 0, .13].forEach((x, i) => {
    const house = new THREE.Mesh(new RoundedBoxGeometry(.062, .06, .2, 2, .008), anod);
    house.position.set(x, .08, .05); pG.add(house);
    const chev = new THREE.Mesh(new THREE.BoxGeometry(.003, .004, .05), gold);
    chev.position.set(x + .032, .095, .08); chev.rotation.y = .5; pG.add(chev);
    // stem rises from the pivot towards the driver, face on top
    const pivot = V(x, .085, -.03);
    const top = V(x, .3, -.045);
    const stem = new THREE.Mesh(new THREE.BoxGeometry(.024, 1, .018), anod);
    stem.scale.y = pivot.distanceTo(top);
    stem.position.copy(pivot).add(top).multiplyScalar(.5);
    stem.quaternion.setFromUnitVectors(V(0, 1, 0), top.clone().sub(pivot).normalize());
    pG.add(stem);
    const faceM = new THREE.Mesh(new RoundedBoxGeometry(i === 1 ? .088 : .08, .11, .016, 3, .006), new THREE.MeshStandardMaterial({ map: faceTex, roughness: .45, metalness: .5, color: 0xd8d4de }));
    faceM.position.copy(top).add(V(0, .04, .004)); faceM.rotation.x = .45; pG.add(faceM);
    if (i) {
      // brass damper and knurled adjuster behind brake and throttle
      const a = V(x + .022, .17, -.06), b = V(x + .022, .1, .1);
      pG.add(rod(a, b, .013, brass, 16));
      const adj = new THREE.Mesh(new THREE.CylinderGeometry(.017, .017, .009, 16), anod);
      adj.position.copy(a); adj.quaternion.setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize()); pG.add(adj);
    } else {
      pG.add(rod(V(x + .02, .2, -.07), V(x + .02, .1, .06), .005, silver));
    }
  });
  pG.position.set(0, .225, .6); pG.rotation.x = -.38;
  pd.add(pG);

  /* ===== display: 32 inch 1000R on a side post ===== */
  const dp = part('display');
  const R = 1.0, halfA = .36, H = .4;
  const scrTex = new THREE.TextureLoader().load(posterUrl);
  scrTex.colorSpace = THREE.SRGBColorSpace;
  scrTex.wrapS = THREE.RepeatWrapping; scrTex.repeat.x = -1; scrTex.offset.x = 1;
  const scrMat = new THREE.MeshBasicMaterial({ map: scrTex, side: THREE.BackSide, toneMapped: false });
  const mon = new THREE.Group();
  mon.add(new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, 64, 1, true, -halfA, halfA * 2), scrMat));
  const bezel = new THREE.MeshStandardMaterial({ color: 0x0e0d11, roughness: .55, side: THREE.DoubleSide });
  mon.add(new THREE.Mesh(new THREE.CylinderGeometry(R + .004, R + .004, H + .016, 64, 1, true, -halfA - .008, halfA * 2 + .016), bezel));
  mon.add(new THREE.Mesh(new THREE.CylinderGeometry(R + .028, R + .028, H + .006, 64, 1, true, -halfA - .004, halfA * 2 + .008), bezel));
  // edges of the shell
  for (const a of [-halfA - .006, halfA + .006]) {
    const e = new THREE.Mesh(new THREE.BoxGeometry(.03, H + .016, .01), bezel);
    e.position.set(Math.sin(a) * (R + .015), 0, Math.cos(a) * (R + .015)); e.rotation.y = a; mon.add(e);
  }
  // top and bottom edges: thin curved strips between the panel and the shell
  for (const y of [-(H / 2 + .008), H / 2 + .008]) {
    const pts = [];
    for (let k = 0; k <= 48; k++) {
      const a = -halfA - .008 + k / 48 * (halfA * 2 + .016);
      pts.push(new THREE.Vector2(Math.sin(a) * (R + .002), Math.cos(a) * (R + .002)));
    }
    for (let k = 48; k >= 0; k--) {
      const a = -halfA - .008 + k / 48 * (halfA * 2 + .016);
      pts.push(new THREE.Vector2(Math.sin(a) * (R + .03), Math.cos(a) * (R + .03)));
    }
    const lipG = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: .004, bevelEnabled: false });
    lipG.rotateX(Math.PI / 2);
    const lip = new THREE.Mesh(lipG, bezel);
    lip.position.y = y + .002; mon.add(lip);
  }
  const hump = new THREE.Mesh(new RoundedBoxGeometry(.32, .22, .07, 4, .03), bezel);
  hump.position.set(0, -.01, R + .06); mon.add(hump);
  mon.position.set(0, .96, .1);
  dp.add(mon);
  // side post bolted to the front cross, arm across to the VESA mount
  beam(dp, alu, .04, .08, V(.31, .04, .82), V(.5, .04, .82), Math.PI / 2, plastic);
  beam(dp, alu, .04, .08, V(.47, .08, .82), V(.47, 1.0, .82), 0, plastic);
  beam(dp, alu, .04, .04, V(.47, .97, .88), V(.47, .97, 1.2), 0, plastic);
  beam(dp, alu, .04, .04, V(.49, .97, 1.2), V(.02, .97, 1.2), 0, plastic);
  const vesa = new THREE.Mesh(new THREE.BoxGeometry(.11, .11, .015), steel);
  vesa.position.set(0, .96, 1.175); dp.add(vesa);

  /* ===== mat, with the red edge from the photo ===== */
  const mat = new THREE.Group();
  const matTop = new THREE.Mesh(new THREE.BoxGeometry(1.5, .006, 2.15), new THREE.MeshStandardMaterial({ color: 0x131217, roughness: .95 }));
  matTop.position.set(0, .003, .23); matTop.receiveShadow = true; mat.add(matTop);
  const red = new THREE.MeshStandardMaterial({ color: 0x7d1022, roughness: .75 });
  [[1.5, .018, 0, -.845], [1.5, .018, 0, 1.305], [.018, 2.15, -.75, .23], [.018, 2.15, .75, .23]].forEach(([w, d, x, z]) => {
    const e = new THREE.Mesh(new THREE.BoxGeometry(w, .008, d), red); e.position.set(x, .004, z); mat.add(e);
  });
  rig.add(mat);

  rig.traverse(o => { if (o.isMesh && !(o.material && o.material.isMeshBasicMaterial)) { o.castShadow = true; o.receiveShadow = true; } });
  matTop.castShadow = false;
  return { rig, parts, screenMat: scrMat };
}

/* camera presets: [position, target] per part */
const VIEWS = {
  overview: [V(-2.45, 1.55, -2.1), V(0, .5, .3)],
  wheelbase: [V(-.75, 1.05, .2), V(0, .8, .55)],
  wheel: [V(-.5, 1.02, -.78), V(0, .8, .3)],
  pedals: [V(-.7, .62, -.02), V(0, .28, .6)],
  cockpit: [V(-1.6, .9, .55), V(0, .3, .3)],
  seat: [V(-1.15, 1.05, .35), V(0, .55, -.45)],
  display: [V(-.5, 1.05, -.35), V(0, .95, 1.05)],
};
const PIN_AT = {
  wheelbase: V(0, .9, .6), wheel: V(-.06, .9, .32), pedals: V(.2, .4, .62),
  cockpit: V(.33, .5, .42), seat: V(0, 1.15, -.78), display: V(.32, 1.22, 1.05),
};
const EXPLODE = {
  wheelbase: V(0, .2, .08), wheel: V(0, .12, -.22), pedals: V(0, .08, .28),
  seat: V(0, .14, -.3), display: V(0, .2, .32), cockpit: V(0, 0, 0),
};

export function createRigScene(canvas, opts = {}) {
  const reduced = !!opts.reduced;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  scene.environmentIntensity = .9;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7d99, .6));
  const keyL = new THREE.DirectionalLight(0xffffff, 2.2);
  keyL.position.set(-1.6, 3.2, -1.2);
  keyL.castShadow = true;
  keyL.shadow.mapSize.set(2048, 2048);
  keyL.shadow.camera.left = -1.6; keyL.shadow.camera.right = 1.6; keyL.shadow.camera.top = 1.8; keyL.shadow.camera.bottom = -1.8;
  keyL.shadow.radius = 6; keyL.shadow.bias = -.0004; keyL.shadow.normalBias = .01;
  scene.add(keyL);
  const rimL = new THREE.DirectionalLight(0xd9ccff, 1.1);
  rimL.position.set(2, 1.4, 2.4);
  scene.add(rimL);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.ShadowMaterial({ opacity: .16 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  scene.add(ground);

  const { rig, parts, screenMat } = buildRig(opts.poster || 'assets/video/onboard-poster.jpg');
  scene.add(rig);
  Object.values(parts).forEach(g => { g.userData.home = g.position.clone(); });

  const camera = new THREE.PerspectiveCamera(30, 1, .05, 50);
  camera.position.copy(VIEWS.overview[0]);
  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(VIEWS.overview[1]);
  controls.enableDamping = true;
  controls.dampingFactor = .08;
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.rotateSpeed = .7;
  controls.minPolarAngle = .3;
  controls.maxPolarAngle = 1.48;
  controls.autoRotate = !reduced;
  controls.autoRotateSpeed = .55;
  controls.update();
  // let vertical swipes scroll the page on touch screens
  canvas.style.touchAction = 'pan-y';

  /* ---- video on the monitor once the rig is on screen ---- */
  let video = null;
  function startVideo() {
    if (video || reduced || !opts.video) return;
    video = document.createElement('video');
    video.src = opts.video; video.muted = true; video.loop = true; video.playsInline = true;
    video.addEventListener('canplay', () => {
      const vt = new THREE.VideoTexture(video);
      vt.colorSpace = THREE.SRGBColorSpace;
      vt.wrapS = THREE.RepeatWrapping; vt.repeat.x = -1; vt.offset.x = 1;
      screenMat.map = vt; screenMat.needsUpdate = true;
    }, { once: true });
    video.play().catch(() => {});
  }

  /* ---- sizing ---- */
  function resize() {
    const r = canvas.parentElement.getBoundingClientRect();
    renderer.setSize(Math.max(1, r.width), Math.max(1, r.height), false);
    camera.aspect = r.width / Math.max(1, r.height);
    camera.fov = camera.aspect < 1 ? 42 : 30;
    camera.updateProjectionMatrix();
  }
  resize();
  new ResizeObserver(resize).observe(canvas.parentElement);

  /* ---- picking and highlighting ---- */
  const ray = new THREE.Raycaster();
  const ptr = new THREE.Vector2();
  let hovered = null, focused = null;
  function setGlow(name, amt) {
    const g = parts[name]; if (!g) return;
    g.traverse(o => {
      if (!o.isMesh || !o.material.emissive) return;
      if (!o.userData.ownMat) { o.material = o.material.clone(); o.userData.ownMat = true; }
      o.material.emissive.copy(ACCENT).multiplyScalar(amt);
    });
  }
  function paintGlow() {
    // a faint glow under the pointer; focusing a part is shown by the camera move
    Object.keys(parts).forEach(n => setGlow(n, n === hovered && n !== focused ? .035 : 0));
  }
  function pick(e) {
    const r = canvas.getBoundingClientRect();
    ptr.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
    ray.setFromCamera(ptr, camera);
    const hit = ray.intersectObjects(Object.values(parts), true)[0];
    let o = hit && hit.object;
    while (o && !o.userData.part) o = o.parent;
    return o ? o.userData.part : null;
  }
  let downAt = null;
  canvas.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const n = pick(e);
    if (n !== hovered) { hovered = n; paintGlow(); canvas.style.cursor = n ? 'pointer' : ''; }
  });
  canvas.addEventListener('pointerleave', () => { hovered = null; paintGlow(); canvas.style.cursor = ''; });
  canvas.addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY]; });
  canvas.addEventListener('pointerup', e => {
    if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 5) return;
    focus(pick(e) || null);
  });

  /* ---- camera moves ---- */
  let fly = null;
  let idleTimer = 0;
  function focus(name) {
    focused = name && VIEWS[name] ? name : null;
    paintGlow();
    const [p, t] = VIEWS[focused || 'overview'];
    fly = { p0: camera.position.clone(), t0: controls.target.clone(), p1: p.clone(), t1: t.clone(), start: performance.now(), dur: reduced ? 1 : 1100 };
    controls.autoRotate = false;
    clearTimeout(idleTimer);
    if (!focused && !reduced) idleTimer = setTimeout(() => { controls.autoRotate = true; }, 4000);
    if (opts.onFocus) opts.onFocus(focused);
  }
  controls.addEventListener('start', () => { controls.autoRotate = false; fly = null; clearTimeout(idleTimer); if (opts.onInteract) opts.onInteract(); });
  controls.addEventListener('end', () => { clearTimeout(idleTimer); if (!reduced && !focused) idleTimer = setTimeout(() => { controls.autoRotate = true; }, 5000); });

  /* ---- exploded view ---- */
  let explodeT = 0, explodeGoal = 0;
  function explode(on) { explodeGoal = on ? 1 : 0; }

  /* ---- pins (html) ---- */
  const order = ['wheelbase', 'wheel', 'pedals', 'cockpit', 'seat', 'display'];
  const pins = {};
  if (opts.pins) {
    order.forEach(name => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pin';
      b.textContent = String(order.indexOf(name) + 1);
      b.setAttribute('aria-label', 'Show the ' + name);
      b.addEventListener('click', () => focus(focused === name ? null : name));
      opts.pins.appendChild(b);
      pins[name] = b;
    });
  }
  const pv = new THREE.Vector3(), pw = new THREE.Vector3(), dir = new THREE.Vector3();
  const occluder = new THREE.Raycaster();
  const solids = Object.values(parts);
  function placePins() {
    const r = canvas.getBoundingClientRect();
    Object.entries(pins).forEach(([name, el]) => {
      pw.copy(PIN_AT[name]).addScaledVector(EXPLODE[name], explodeT);
      // fade a pin when something solid sits between it and the camera
      dir.copy(pw).sub(camera.position);
      const dist = dir.length();
      occluder.set(camera.position, dir.normalize());
      occluder.far = dist - .06;
      const hidden = occluder.intersectObjects(solids, true).length > 0;
      pv.copy(pw).project(camera);
      el.style.transform = `translate(${((pv.x + 1) / 2 * r.width - 14).toFixed(1)}px, ${((1 - pv.y) / 2 * r.height - 14).toFixed(1)}px)`;
      el.classList.toggle('is-active', name === focused);
      el.classList.toggle('is-behind', hidden && name !== focused);
    });
  }

  /* ---- loop ---- */
  let running = false;
  const ease = t => 1 - Math.pow(1 - t, 3);
  function frame(now) {
    if (!running) return;
    if (fly) {
      const k = Math.min(1, (now - fly.start) / fly.dur);
      const e = ease(k);
      camera.position.lerpVectors(fly.p0, fly.p1, e);
      controls.target.lerpVectors(fly.t0, fly.t1, e);
      if (k >= 1) fly = null;
    }
    explodeT += (explodeGoal - explodeT) * (reduced ? 1 : .08);
    Object.entries(parts).forEach(([n, g]) => { g.position.copy(g.userData.home).addScaledVector(EXPLODE[n], explodeT); });
    controls.update();
    renderer.render(scene, camera);
    placePins();
    requestAnimationFrame(frame);
  }
  function start() { if (running) return; running = true; startVideo(); if (video) video.play().catch(() => {}); requestAnimationFrame(frame); }
  function stop() { running = false; if (video) video.pause(); }

  renderer.render(scene, camera);
  return { start, stop, focus, explode, parts, camera, renderer, scene };
}
