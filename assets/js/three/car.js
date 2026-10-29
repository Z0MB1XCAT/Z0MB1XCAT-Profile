/* A 2022-regulation F1 car in Z0MB1XCAT colours, built from code.
   The bodywork is lofted through rounded cross-sections, the wings are real
   airfoil sections, and the tyres are lathed with a sidewall profile.
   Faces +z, sits on y = 0, about 5.5 m long. */
import * as THREE from 'three';

const PLUM = new THREE.Color('#2b1838');
const PURPLE = new THREE.Color('#8452a1');
const YELLOW = new THREE.Color('#ffd23f');

/* ---------- geometry helpers ---------- */

// Catmull-Rom through keyframes so a handful of sections loft smoothly
function refine(keys, sub) {
  const out = [];
  const props = Object.keys(keys[0]);
  for (let i = 0; i < keys.length - 1; i++) {
    const p0 = keys[Math.max(0, i - 1)], p1 = keys[i], p2 = keys[i + 1], p3 = keys[Math.min(keys.length - 1, i + 2)];
    for (let s = 0; s < sub; s++) {
      const t = s / sub, t2 = t * t, t3 = t2 * t;
      const o = {};
      props.forEach(k => {
        o[k] = .5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
      });
      out.push(o);
    }
  }
  out.push({ ...keys[keys.length - 1] });
  return out;
}

// superellipse ring: w half-width, yb/yt bottom/top, n squareness, x offset
function ringPts(s, seg) {
  const pts = [];
  const yc = (s.yt + s.yb) / 2, hh = (s.yt - s.yb) / 2, e = 2 / s.n;
  for (let k = 0; k < seg; k++) {
    const a = k / seg * Math.PI * 2;
    const c = Math.cos(a), sn = Math.sin(a);
    pts.push(new THREE.Vector3((s.x || 0) + s.w * Math.sign(c) * Math.pow(Math.abs(c), e), yc + hh * Math.sign(sn) * Math.pow(Math.abs(sn), e), s.z));
  }
  return pts;
}

function loft(keys, { seg = 40, sub = 5, color } = {}) {
  const secs = refine(keys, sub);
  const pos = [], col = [], idx = [];
  const rings = secs.map(s => ringPts(s, seg));
  rings.forEach((r, i) => r.forEach(p => {
    pos.push(p.x, p.y, p.z);
    const c = color ? color(p, secs[i]) : PLUM;
    col.push(c.r, c.g, c.b);
  }));
  for (let i = 0; i < rings.length - 1; i++) for (let k = 0; k < seg; k++) {
    const a = i * seg + k, b = i * seg + (k + 1) % seg, c = a + seg, d = b + seg;
    idx.push(a, c, b, b, c, d);
  }
  // close both ends with a fan
  [0, rings.length - 1].forEach((ri, end) => {
    const r = rings[ri];
    const ctr = r.reduce((m, p) => m.add(p), new THREE.Vector3()).multiplyScalar(1 / seg);
    const ci = pos.length / 3;
    pos.push(ctr.x, ctr.y, ctr.z);
    const c0 = color ? color(ctr, secs[ri]) : PLUM;
    col.push(c0.r, c0.g, c0.b);
    for (let k = 0; k < seg; k++) {
      const a = ri * seg + k, b = ri * seg + (k + 1) % seg;
      if (end) idx.push(a, b, ci); else idx.push(b, a, ci);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// NACA-style airfoil, inverted so it makes downforce; u along chord, v up
function airfoil(chord, thick = .11, camber = .05, aoa = 0) {
  const n = 18, up = [], lo = [];
  for (let i = 0; i <= n; i++) {
    const x = (1 - Math.cos(i / n * Math.PI)) / 2;
    const yt = 5 * thick * (.2969 * Math.sqrt(x) - .126 * x - .3516 * x * x + .2843 * x ** 3 - .1036 * x ** 4);
    const yc = -camber * 4 * x * (1 - x);
    up.push([x * chord, (yc + yt) * chord]);
    lo.push([x * chord, (yc - yt) * chord]);
  }
  const pts = up.concat(lo.reverse().slice(1, -1));
  const ca = Math.cos(aoa), sa = Math.sin(aoa);
  const sh = new THREE.Shape();
  pts.forEach(([u, v], i) => {
    const ru = u * ca - v * sa, rv = u * sa + v * ca; // trailing edge rises with aoa
    if (i) sh.lineTo(ru, rv); else sh.moveTo(ru, rv);
  });
  sh.closePath();
  return sh;
}

// extrude a (u = along car, v = up) shape across the car, then remap axes
function across(shape, span, { z0 = 0, y0 = 0, bend } = {}) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: span, bevelEnabled: false, curveSegments: 4, steps: 24 });
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i), v = p.getY(i), w = p.getZ(i);
    const x = w - span / 2;
    const b = bend ? bend(x) : { y: 0, z: 0 };
    p.setXYZ(i, x, y0 + v + b.y, z0 - u + b.z);
  }
  g.computeVertexNormals();
  return g;
}

// a flat plate in the side (z, y) plane, `t` thick, centred on x
function sidePlate(pts, t, x) {
  const sh = new THREE.Shape();
  pts.forEach(([z, y], i) => (i ? sh.lineTo(z, y) : sh.moveTo(z, y)));
  sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: t, bevelEnabled: true, bevelThickness: .003, bevelSize: .003, bevelSegments: 1, curveSegments: 8 });
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setXYZ(i, x + p.getZ(i) - t / 2, p.getY(i), p.getX(i));
  g.computeVertexNormals();
  return g;
}

function rod(a, b, r, mat, flat = 1) {
  const len = a.distanceTo(b);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), mat);
  m.position.copy(a).add(b).multiplyScalar(.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  m.scale.set(1, 1, flat);
  return m;
}

/* ---------- the car ---------- */

export function buildCar() {
  const car = new THREE.Group();
  car.name = 'car';

  const paint = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: .34, metalness: .08, clearcoat: .55, clearcoatRoughness: .22, envMapIntensity: .55 });
  const carbon = new THREE.MeshStandardMaterial({ color: 0x110f14, roughness: .5, metalness: .25, side: THREE.DoubleSide });
  const plum = new THREE.MeshPhysicalMaterial({ color: PLUM, roughness: .34, metalness: .08, clearcoat: .55, clearcoatRoughness: .22, envMapIntensity: .55 });
  const accent = new THREE.MeshStandardMaterial({ color: YELLOW, roughness: .38, metalness: .05 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x141316, roughness: .88, metalness: 0 });
  const black = new THREE.MeshStandardMaterial({ color: 0x050507, roughness: .6 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x9a96a2, roughness: .3, metalness: .9 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x1a1420, roughness: .05, metalness: .6, clearcoat: 1 });
  const add = (geo, mat) => { const m = new THREE.Mesh(geo, mat); car.add(m); return m; };

  /* survival cell, nose and engine cover in one loft */
  const body = loft([
    { z: 2.78, w: .05, yb: .15, yt: .24, n: 2.2, x: 0 },
    { z: 2.5, w: .11, yb: .14, yt: .33, n: 2.4, x: 0 },
    { z: 2.05, w: .17, yb: .15, yt: .45, n: 2.6, x: 0 },
    { z: 1.55, w: .24, yb: .16, yt: .56, n: 2.8, x: 0 },
    { z: 1.1, w: .3, yb: .12, yt: .64, n: 3, x: 0 },
    { z: .65, w: .34, yb: .11, yt: .69, n: 3.2, x: 0 },
    { z: .2, w: .36, yb: .11, yt: .71, n: 3.2, x: 0 },
    { z: -.08, w: .33, yb: .11, yt: .95, n: 3, x: 0 },
    { z: -.4, w: .31, yb: .11, yt: .92, n: 3, x: 0 },
    { z: -.85, w: .27, yb: .12, yt: .79, n: 2.8, x: 0 },
    { z: -1.35, w: .22, yb: .14, yt: .64, n: 2.6, x: 0 },
    { z: -1.85, w: .15, yb: .17, yt: .51, n: 2.4, x: 0 },
    { z: -2.22, w: .1, yb: .21, yt: .43, n: 2.2, x: 0 },
    { z: -2.45, w: .055, yb: .26, yt: .38, n: 2, x: 0 },
  ], {
    seg: 48, sub: 6,
    color: (p, s) => {
      if (p.z > 2.45) return YELLOW;
      const mid = s.yb + (s.yt - s.yb) * .44;
      return p.y < mid && p.z < 1.3 ? PURPLE : PLUM;
    },
  });
  add(body, paint);

  /* sidepods, purple sides under a plum top */
  for (const sx of [-1, 1]) {
    const pod = loft([
      { z: .62, x: sx * .52, w: .15, yb: .25, yt: .58, n: 4 },
      { z: .38, x: sx * .56, w: .22, yb: .16, yt: .64, n: 3.4 },
      { z: -.05, x: sx * .57, w: .23, yb: .14, yt: .61, n: 3.2 },
      { z: -.55, x: sx * .52, w: .21, yb: .14, yt: .5, n: 3 },
      { z: -1.05, x: sx * .43, w: .16, yb: .15, yt: .39, n: 2.8 },
      { z: -1.5, x: sx * .33, w: .09, yb: .17, yt: .29, n: 2.4 },
      { z: -1.78, x: sx * .26, w: .04, yb: .2, yt: .24, n: 2 },
    ], { seg: 36, sub: 6, color: (p, s) => (p.y > s.yb + (s.yt - s.yb) * .62 ? PLUM : PURPLE) });
    add(pod, paint);
    // dark inlet mouth
    const mouth = new THREE.Mesh(new THREE.CircleGeometry(1, 32), black);
    mouth.scale.set(.13, .15, 1);
    mouth.position.set(sx * .52, .415, .625);
    car.add(mouth);
    // mirror on a stalk
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(.15, .065, .07), plum);
    mirror.position.set(sx * .6, .78, .5);
    car.add(mirror);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(.13, .05), glass);
    face.position.set(sx * .6, .78, .464); face.rotation.y = Math.PI;
    car.add(face);
    car.add(rod(new THREE.Vector3(sx * .52, .62, .52), new THREE.Vector3(sx * .6, .76, .5), .012, carbon));
  }

  /* floor with edge lip, and the diffuser */
  const floor = new THREE.Shape();
  [[0, 1.35], [.6, 1.15], [.95, .55], [.97, -.6], [.9, -1.3], [.62, -2.0], [.55, -2.4]].forEach(([x, z], i) => (i ? floor.lineTo(x, z) : floor.moveTo(x, z)));
  [[-.55, -2.4], [-.62, -2.0], [-.9, -1.3], [-.97, -.6], [-.95, .55], [-.6, 1.15]].forEach(([x, z]) => floor.lineTo(x, z));
  floor.closePath();
  const fg = new THREE.ExtrudeGeometry(floor, { depth: .025, bevelEnabled: false });
  fg.rotateX(Math.PI / 2); fg.translate(0, .085, 0);
  add(fg, carbon);
  for (const sx of [-1, 1]) {
    add(sidePlate([[.55, .085], [-1.3, .085], [-1.3, .14], [.4, .12]], .012, sx * .96), carbon);
  }
  const diff = new THREE.Mesh(new THREE.PlaneGeometry(1.1, .62), carbon);
  diff.position.set(0, .2, -2.2); diff.rotation.x = -Math.PI / 2 + .42;
  car.add(diff);
  for (const x of [-.36, -.12, .12, .36]) add(sidePlate([[-1.95, .09], [-2.5, .09], [-2.5, .34], [-2.0, .12]], .008, x), carbon);

  /* front wing: four elements sweeping up towards the endplates */
  const fwSpan = 1.92;
  const fwEl = [
    { c: .36, z: 2.98, y: .08, a: .03, rise: .02 },
    { c: .22, z: 2.7, y: .125, a: .2, rise: .05 },
    { c: .15, z: 2.55, y: .17, a: .34, rise: .08 },
  ];
  fwEl.forEach((e, i) => {
    const g = across(airfoil(e.c, .1, .045, e.a), fwSpan, {
      z0: e.z, y0: e.y,
      bend: x => { const t = Math.abs(x) / (fwSpan / 2); return { y: e.rise * t * t, z: -.05 * t * t }; },
    });
    add(g, i === 2 ? plum : carbon);
  });
  for (const sx of [-1, 1]) {
    add(sidePlate([[3.02, .06], [2.4, .06], [2.36, .2], [2.42, .34], [2.62, .36], [2.9, .22], [3.04, .12]], .014, sx * .97), accent);
  }

  /* rear wing, beam wing and the swan-neck pylon */
  const rwSpan = 1.0;
  const tipDrop = x => { const t = Math.max(0, (Math.abs(x) - .32) / .18); return { y: -.16 * Math.pow(t, 1.6), z: 0 }; };
  add(across(airfoil(.34, .12, .06, .06), rwSpan, { z0: -2.18, y0: .86, bend: tipDrop }), plum);
  add(across(airfoil(.22, .1, .05, .5), rwSpan * .98, { z0: -2.34, y0: .97, bend: tipDrop }), carbon);
  add(across(airfoil(.16, .1, .05, .2), .72, { z0: -2.22, y0: .44 }), carbon);
  add(across(airfoil(.12, .1, .05, .5), .72, { z0: -2.36, y0: .5 }), carbon);
  for (const sx of [-1, 1]) add(sidePlate([[-2.12, .58], [-2.62, .58], [-2.62, .84], [-2.5, .96], [-2.2, .9]], .012, sx * .5), accent);
  add(sidePlate([[-1.95, .5], [-2.05, .86], [-2.2, .86], [-2.15, .5]], .016, 0), carbon);

  /* engine cover fin and stripe */
  add(sidePlate([[-.5, .9], [-1.85, .5], [-1.85, .55], [-.55, .95]], .008, 0), plum);
  const stripe = [];
  for (let z = .9; z >= -2.3; z -= .1) {
    // follow the cover's top line closely enough for a painted stripe
    const k = [[.9, .7], [.2, .715], [-.08, .955], [-.4, .925], [-.85, .795], [-1.35, .645], [-1.85, .515], [-2.3, .42]];
    let y = .42;
    for (let i = 1; i < k.length; i++) if (z >= k[i][0]) { const t = (z - k[i][0]) / (k[i - 1][0] - k[i][0]); y = k[i][1] + (k[i - 1][1] - k[i][1]) * t; break; }
    stripe.push(new THREE.Vector3(0, y + .006, z));
  }
  // a painted ribbon laid along the top of the cover
  const sp = [], si = [];
  stripe.forEach((p, i) => {
    sp.push(-.045, p.y, p.z, .045, p.y, p.z);
    if (i) si.push(2 * i - 2, 2 * i, 2 * i - 1, 2 * i - 1, 2 * i, 2 * i + 1);
  });
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  sg.setIndex(si);
  sg.computeVertexNormals();
  const stripeMesh = new THREE.Mesh(sg, accent);
  stripeMesh.material = accent.clone();
  stripeMesh.material.side = THREE.DoubleSide;
  car.add(stripeMesh);

  /* cockpit opening, airbox mouth, T-cam */
  const cockpit = new THREE.Mesh(new THREE.CircleGeometry(1, 40), black);
  cockpit.scale.set(.25, .4, 1); cockpit.rotation.x = -Math.PI / 2; cockpit.position.set(0, .728, .28);
  car.add(cockpit);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1, .06, 8, 48), carbon);
  rim.scale.set(.25, .4, .25); rim.rotation.x = -Math.PI / 2; rim.position.set(0, .732, .28);
  car.add(rim);
  const intake = new THREE.Mesh(new THREE.CircleGeometry(1, 32), black);
  intake.scale.set(.1, .075, 1); intake.position.set(0, .85, .03);
  car.add(intake);
  const tcam = new THREE.Mesh(new THREE.BoxGeometry(.1, .035, .07), accent);
  tcam.position.set(0, .962, -.2);
  car.add(tcam);

  /* halo: a horseshoe on a centre pillar */
  const haloPts = [[-.23, .74, -.12], [-.26, .82, .05], [-.2, .86, .27], [0, .875, .4], [.2, .86, .27], [.26, .82, .05], [.23, .74, -.12]].map(p => new THREE.Vector3(...p));
  add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(haloPts), 64, .032, 10), plum);
  add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, .62, .78), new THREE.Vector3(0, .76, .6), new THREE.Vector3(0, .875, .4)]), 24, .03, 10), plum);

  /* driver: helmet, visor and shoulders */
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(.145, 28, 20), accent);
  helmet.position.set(0, .82, .1); helmet.scale.set(1, .95, 1.1);
  car.add(helmet);
  const visor = new THREE.Mesh(new THREE.SphereGeometry(.148, 28, 10, Math.PI / 2 - 1.1, 2.2, 1.25, .42), glass);
  visor.position.copy(helmet.position); visor.scale.copy(helmet.scale);
  car.add(visor);

  /* wheels: lathed tyres, Pirelli-yellow bands, wheel covers */
  const tyreGeo = (R, W) => {
    const ri = .23, pts = [];
    const prof = [[ri, -W / 2], [R - .045, -W / 2], [R - .012, -W / 2 + .03], [R, -W / 2 + .07], [R, W / 2 - .07], [R - .012, W / 2 - .03], [R - .045, W / 2], [ri, W / 2]];
    prof.forEach(([r, y]) => pts.push(new THREE.Vector2(r, y)));
    const g = new THREE.LatheGeometry(pts, 48);
    g.rotateZ(Math.PI / 2);
    return g;
  };
  const wheel = (x, z, R, W, front) => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(tyreGeo(R, W), rubber));
    for (const s of [-1, 1]) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(R * .82, .009, 6, 64), accent);
      band.rotation.y = Math.PI / 2; band.position.x = s * (W / 2 + .001);
      g.add(band);
      const cover = new THREE.Mesh(new THREE.CircleGeometry(.23, 40), carbon);
      cover.rotation.y = s * Math.PI / 2; cover.position.x = s * (W / 2 - .02);
      g.add(cover);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.19, .008, 6, 48), metal);
      ring.rotation.y = Math.PI / 2; ring.position.x = s * (W / 2 - .015);
      g.add(ring);
    }
    g.position.set(x, R, z);
    car.add(g);
    // wishbones and the pushrod, slim aero tubes back to the chassis
    const hub = new THREE.Vector3(x - Math.sign(x) * (W / 2 + .02), R, z);
    const inner = Math.sign(x) * .2;
    [[.2, R - .12], [.42, R + .1]].forEach(([y, hy]) => {
      car.add(rod(new THREE.Vector3(inner, y, z + .22), hub.clone().setY(hy), .016, carbon, .45));
      car.add(rod(new THREE.Vector3(inner, y, z - .22), hub.clone().setY(hy), .016, carbon, .45));
    });
    car.add(rod(hub.clone().setY(R - .08), new THREE.Vector3(Math.sign(x) * .14, .56, z - .1), .014, carbon));
  };
  wheel(-.8, 1.72, .36, .3, true);
  wheel(.8, 1.72, .36, .3, true);
  wheel(-.78, -1.75, .36, .4, false);
  wheel(.78, -1.75, .36, .4, false);

  /* rain light and exhaust */
  const rain = new THREE.Mesh(new THREE.BoxGeometry(.1, .05, .02), new THREE.MeshBasicMaterial({ color: 0xff2e3f }));
  rain.position.set(0, .3, -2.47);
  car.add(rain);
  const ex = new THREE.Mesh(new THREE.CylinderGeometry(.045, .05, .14, 16, 1, true), metal);
  ex.rotation.x = Math.PI / 2; ex.position.set(0, .46, -2.4);
  car.add(ex);

  /* soft contact shadow so the car sits on the road */
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x2 = c.getContext('2d');
  const gr = x2.createRadialGradient(64, 64, 4, 64, 64, 64);
  gr.addColorStop(0, 'rgba(10,6,16,.55)'); gr.addColorStop(1, 'rgba(10,6,16,0)');
  x2.fillStyle = gr; x2.fillRect(0, 0, 128, 128);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 6.2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = .01;
  car.add(shadow);

  car.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return car;
}
