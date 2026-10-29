/* The Red Bull Ring on its real terrain.
   Modes:
     hero  slow orbit with mouse parallax, the car laps on its own
     lap   the page drives it with setLap(); the camera follows the car */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildCar } from './car.js';

const EXAG = 1.6;      // vertical exaggeration so the hills read
const WIDTH = 14;      // track width, metres
const STEP = 4;        // metres between track points in RBR3D.track

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function createTrackScene(canvas, opts = {}) {
  const D = window.RBR3D;
  const Track = window.Track;
  const mode = opts.mode || 'hero';
  const reduced = !!opts.reduced;
  const ink = new THREE.Color(opts.ink || '#141117');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x5c4c6c, 1.2));
  const sun = new THREE.DirectionalLight(0xffffff, 1.8);
  sun.position.set(-700, 1100, 500);
  scene.add(sun);

  const camera = new THREE.PerspectiveCamera(mode === 'hero' ? 26 : 42, 1, 2, 9000);

  /* ---------- terrain as contour lines ---------- */
  const nx = D.nx, ny = D.ny;
  const tpos = new Float32Array(nx * ny * 3);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const k = (j * nx + i) * 3;
    tpos[k] = D.x0 + i * D.cell;
    tpos[k + 1] = D.h[j * nx + i] / 10 * EXAG - .8;
    tpos[k + 2] = D.z0 + j * D.cell;
  }
  const tidx = [];
  for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
    tidx.push(a, c, b, b, c, d);
  }
  const tgeo = new THREE.BufferGeometry();
  tgeo.setAttribute('position', new THREE.BufferAttribute(tpos, 3));
  tgeo.setIndex(tidx);
  const terrainMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    uniforms: {
      uColor: { value: ink.clone() },
      uStep: { value: 4.0 * EXAG },
      uOpacity: { value: opts.contourOpacity ?? .55 },
      uFade: { value: new THREE.Vector2(opts.fadeIn ?? 650, opts.fadeOut ?? 1050) },
      // lines thin out with distance from the camera, so the horizon stays calm
      uFar: { value: new THREE.Vector2(opts.farIn ?? 5000, opts.farOut ?? 9000) },
      // a scan ring that lights the contours as it passes (intro only)
      uScanC: { value: new THREE.Vector2(D.track[0][0], D.track[0][2]) },
      uScanR: { value: 0 },
      uScanOn: { value: 0 },
      // written straight to screen, so these are sRGB values: #ffd23f and #8452a1
      uAccent: { value: new THREE.Vector3(1, .824, .247) },
      uBrand: { value: new THREE.Vector3(.518, .322, .631) },
    },
    vertexShader: `
      varying float vH; varying vec2 vXZ; varying float vDist;
      void main() {
        vH = position.y; vXZ = position.xz;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vDist = distance(wp.xyz, cameraPosition);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: `
      uniform vec3 uColor; uniform float uStep; uniform float uOpacity; uniform vec2 uFade; uniform vec2 uFar;
      uniform vec2 uScanC; uniform float uScanR; uniform float uScanOn; uniform vec3 uAccent; uniform vec3 uBrand;
      varying float vH; varying vec2 vXZ; varying float vDist;
      float line(float v, float w) { float f = abs(fract(v - .5) - .5) / fwidth(v); return 1. - min(f / w, 1.); }
      void main() {
        // scan: a sharp leading edge (front) and a purple wake behind it
        float d = length(vXZ - uScanC) - uScanR;
        float front = uScanOn * exp(-d * d / 4000.);
        float wake = uScanOn * (d < 0. ? exp(d / 240.) : 0.);
        float minor = line(vH / uStep, 1.0 + front * 1.6);
        float major = line(vH / (uStep * 5.), 1.5 + front * 1.6);
        float lit = max(minor, major);
        float a = max(max(minor * .42, major * .95), lit * max(front, wake * .85));
        float r = length(vXZ * vec2(1., 1.3));
        float keep = (1. - smoothstep(uFade.x, uFade.y, r)) * (1. - smoothstep(uFar.x, uFar.y, vDist));
        // lines, then a translucent yellow band under the edge
        float la = a * mix(uOpacity, 1., max(front, wake * .8)) * keep;
        float fa = front * .34 * keep;
        float outA = la + fa * (1. - la);
        if (outA < .004) discard;
        vec3 lineCol = mix(mix(uColor, uBrand, clamp(wake * 1.3, 0., 1.)), uBrand * .62, front);
        gl_FragColor = vec4((lineCol * la + uAccent * fa * (1. - la)) / outA, outA);
      }`,
  });
  scene.add(new THREE.Mesh(tgeo, terrainMat));

  /* ---------- the circuit ---------- */
  const P = D.track.map(([x, y, z]) => new THREE.Vector3(x, y * EXAG, z));
  const N = P.length;
  const at = i => P[((i % N) + N) % N];
  const T = [], S = [];
  for (let i = 0; i < N; i++) {
    const t = at(i + 1).clone().sub(at(i - 1)); t.y = 0; t.normalize();
    T.push(t);
    S.push(new THREE.Vector3(-t.z, 0, t.x)); // right-hand side of travel
  }
  // which way each point turns: > 0 is a right-hander
  const turn = i => { const a = T[((i - 6) % N + N) % N], b = T[(i + 6) % N]; return a.x * b.z - a.z * b.x; };

  function strip(i0, i1, offA, offB, lift, uvScale) {
    const pos = [], uv = [], idx = [];
    let v = 0;
    for (let i = i0, k = 0; i <= i1; i++, k++) {
      const p = at(i), s = S[((i % N) + N) % N];
      pos.push(p.x + s.x * offA, p.y + lift, p.z + s.z * offA, p.x + s.x * offB, p.y + lift, p.z + s.z * offB);
      uv.push(0, v, 1, v);
      v += STEP / uvScale;
      if (i < i1) idx.push(2 * k, 2 * k + 1, 2 * k + 2, 2 * k + 1, 2 * k + 3, 2 * k + 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }

  const asphalt = canvasTexture(128, 256, (c, w, h) => {
    c.fillStyle = '#2b2830'; c.fillRect(0, 0, w, h);
    for (let n = 0; n < 900; n++) { c.fillStyle = `rgba(255,255,255,${Math.random() * .05})`; c.fillRect(Math.random() * w, Math.random() * h, 1, 1); }
    c.fillStyle = '#efeaf3'; c.fillRect(2, 0, 5, h); c.fillRect(w - 7, 0, 5, h);
  });
  asphalt.wrapT = THREE.RepeatWrapping;
  const road = new THREE.Mesh(strip(0, N, WIDTH / 2, -WIDTH / 2, .35, 60), new THREE.MeshStandardMaterial({ map: asphalt, roughness: .86, metalness: 0, side: THREE.DoubleSide }));
  scene.add(road);

  // red and white kerbs: inside at the apex, outside on the exit
  const kerbTex = canvasTexture(4, 16, (c) => { c.fillStyle = '#c4121f'; c.fillRect(0, 0, 4, 8); c.fillStyle = '#f4f1f6'; c.fillRect(0, 8, 4, 8); });
  kerbTex.wrapT = THREE.RepeatWrapping;
  kerbTex.magFilter = THREE.NearestFilter;
  const kerbMat = new THREE.MeshStandardMaterial({ map: kerbTex, color: 0xa8a4ac, roughness: .7, side: THREE.DoubleSide });
  const corners = (window.RBR && window.RBR.corners) || [];
  corners.forEach(c => {
    const i = Math.round(c.m / STEP);
    const sgn = turn(i) > 0 ? 1 : -1;
    scene.add(new THREE.Mesh(strip(i - 9, i + 6, sgn * WIDTH / 2, sgn * (WIDTH / 2 + 1.8), .45, 6), kerbMat));
    scene.add(new THREE.Mesh(strip(i + 3, i + 16, -sgn * WIDTH / 2, -sgn * (WIDTH / 2 + 1.8), .45, 6), kerbMat));
  });

  // chequered start/finish line
  const chequer = canvasTexture(64, 8, (c) => { for (let x = 0; x < 16; x++) for (let y = 0; y < 2; y++) { c.fillStyle = (x + y) % 2 ? '#141117' : '#f4f1f6'; c.fillRect(x * 4, y * 4, 4, 4); } });
  chequer.magFilter = THREE.NearestFilter;
  scene.add(new THREE.Mesh(strip(0, 1, WIDTH / 2, -WIDTH / 2, .5, 4), new THREE.MeshBasicMaterial({ map: chequer, side: THREE.DoubleSide })));

  // pit lane, its height taken from the nearest point of the circuit
  if (D.pit && D.pit.length > 2) {
    const pp = D.pit.map(([x, , z]) => {
      let best = 1e12, y = 0;
      for (let i = 0; i < N; i += 2) { const d = (P[i].x - x) ** 2 + (P[i].z - z) ** 2; if (d < best) { best = d; y = P[i].y; } }
      return new THREE.Vector3(x, y + .3, z);
    });
    const curve = new THREE.CatmullRomCurve3(pp);
    const pts = curve.getSpacedPoints(120);
    const pos = [], idx = [];
    pts.forEach((p, k) => {
      const nxt = pts[Math.min(k + 1, pts.length - 1)], prv = pts[Math.max(k - 1, 0)];
      const t = nxt.clone().sub(prv); t.y = 0; t.normalize();
      const s = new THREE.Vector3(-t.z, 0, t.x).multiplyScalar(3.5);
      pos.push(p.x + s.x, p.y, p.z + s.z, p.x - s.x, p.y, p.z - s.z);
      if (k < pts.length - 1) idx.push(2 * k, 2 * k + 1, 2 * k + 2, 2 * k + 1, 2 * k + 3, 2 * k + 2);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    scene.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x4a4553, roughness: .9, side: THREE.DoubleSide })));
  }

  // the path already driven, in the accent colour
  const tw = (opts.trailWidth ?? (mode === 'hero' ? 7 : .9)) / 2;
  const trailGeo = strip(0, N, tw, -tw, .6, 60);
  const trail = new THREE.Mesh(trailGeo, new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: .95, side: THREE.DoubleSide }));
  trailGeo.setDrawRange(0, 0);
  scene.add(trail);

  /* ---------- car ---------- */
  const car = buildCar();
  const carScale = opts.carScale || (mode === 'hero' ? 7 : 1.7);
  car.scale.setScalar(carScale);
  scene.add(car);

  const tmp = new THREE.Vector3();
  function pointAt(m) {
    const f = ((m / STEP) % N + N) % N;
    const i = Math.floor(f), u = f - i;
    const a = at(i), b = at(i + 1);
    return { p: tmp.copy(a).lerp(b, u).clone(), t: T[i].clone().lerp(T[(i + 1) % N], u).normalize(), i, slope: (b.y - a.y) / STEP };
  }

  function placeCar(m) {
    const { p, t, slope } = pointAt(m);
    car.position.copy(p).y += .4;
    const look = p.clone().add(new THREE.Vector3(t.x, slope, t.z));
    look.y += .5;
    car.lookAt(look);
    return { p, t };
  }

  function setTrail(fromM, toM) {
    const a = Math.max(0, Math.floor(fromM / STEP)), b = Math.min(N, Math.ceil(toM / STEP));
    trailGeo.setDrawRange(a * 6, Math.max(0, b - a) * 6);
  }

  /* ---------- the start gantry over the line (hero only) ---------- */
  const isHero = mode === 'hero';
  const UP = new THREE.Vector3(0, 1, 0);
  const GANTRY_H = 8.6;
  const panelWorld = new THREE.Vector3();
  if (isHero) {
    const p0 = at(0), f0 = T[0], left = S[0].clone().negate();
    const gantry = new THREE.Group();
    gantry.position.copy(p0);
    gantry.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(left, UP, f0));
    const steel = new THREE.MeshStandardMaterial({ color: 0x1b1921, roughness: .45, metalness: .65 });
    const half = WIDTH / 2 + 2.6;
    for (const x of [-half, half]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(.7, GANTRY_H + .6, .7), steel);
      post.position.set(x, (GANTRY_H + .6) / 2, 0);
      gantry.add(post);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(half * 2 + .7, 1, .8), steel);
    beam.position.set(0, GANTRY_H + .2, 0);
    gantry.add(beam);
    // a yellow stripe along the beam, facing the grid
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(half * 2 + .7, .16), new THREE.MeshBasicMaterial({ color: 0xffd23f, toneMapped: false }));
    stripe.position.set(0, GANTRY_H + .52, -.41); stripe.rotation.y = Math.PI;
    gantry.add(stripe);
    // the light housing: five pods of two lamps facing the grid, lights out
    const panelY = GANTRY_H - 1.15;
    const housing = new THREE.Mesh(new THREE.BoxGeometry(6.6, 2.2, .55), steel);
    housing.position.set(0, panelY, 0);
    gantry.add(housing);
    const podMat = new THREE.MeshStandardMaterial({ color: 0x08070a, roughness: .7 });
    const lampMat = new THREE.MeshBasicMaterial({ color: 0x2a0b10, toneMapped: false });
    for (let k = 0; k < 5; k++) {
      const x = (2 - k) * 1.22;
      const pod = new THREE.Mesh(new THREE.BoxGeometry(1, 2, .2), podMat);
      pod.position.set(x, panelY, -.36);
      gantry.add(pod);
      for (const dy of [.46, -.46]) {
        const lamp = new THREE.Mesh(new THREE.CircleGeometry(.32, 32), lampMat);
        lamp.position.set(x, panelY + dy, -.47); lamp.rotation.y = Math.PI;
        gantry.add(lamp);
      }
    }
    scene.add(gantry);
    gantry.updateMatrixWorld(true);
    panelWorld.set(0, panelY, 0).applyMatrix4(gantry.matrixWorld);
  }

  /* ---------- corner labels (html, positioned each frame) ---------- */
  const labelLayer = opts.labels || null;
  const labels = [];
  if (labelLayer) {
    corners.forEach(c => {
      const i = Math.round(c.m / STEP);
      const sgn = turn(i) > 0 ? -1 : 1; // outside of the corner
      const p = at(i).clone().add(S[i].clone().multiplyScalar(sgn * 34));
      p.y += 6;
      const el = document.createElement('span');
      el.className = 'corner-label';
      el.textContent = c.n;
      labelLayer.appendChild(el);
      labels.push({ el, p, n: c.n });
    });
  }
  const proj = new THREE.Vector3();
  function placeLabels(w, h, active) {
    labels.forEach(l => {
      proj.copy(l.p).project(camera);
      const vis = proj.z < 1 && Math.abs(proj.x) < 1.1 && Math.abs(proj.y) < 1.1;
      l.el.style.opacity = vis ? '' : '0';
      l.el.style.transform = `translate(${((proj.x + 1) / 2 * w).toFixed(1)}px, ${((1 - proj.y) / 2 * h).toFixed(1)}px) translate(-50%, -50%)`;
      l.el.classList.toggle('is-active', l.n === active);
    });
  }

  /* ---------- sizing ---------- */
  let W = 1, H = 1;
  function resize() {
    const r = canvas.parentElement.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    // lens shift: frame the subject in the space the page leaves free
    if (opts.shift) {
      const s = opts.shift(W, H);
      camera.setViewOffset(W, H, s.x * W, s.y * H, W, H);
    }
    camera.updateProjectionMatrix();
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas.parentElement);

  /* ---------- cameras ---------- */
  const target = new THREE.Vector3(opts.targetX ?? 40, 40, opts.targetZ ?? 20);
  const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  if (mode === 'hero' && !reduced) {
    window.addEventListener('pointermove', e => {
      mouse.x = e.clientX / window.innerWidth * 2 - 1;
      mouse.y = e.clientY / window.innerHeight * 2 - 1;
    }, { passive: true });
  }

  function overview(az, el, distBase) {
    const fit = camera.aspect < 1.25 ? 1.25 / camera.aspect : 1;
    const dist = distBase * Math.min(fit, 2.4);
    return new THREE.Vector3(
      target.x + Math.sin(az) * Math.cos(el) * dist,
      target.y + Math.sin(el) * dist,
      target.z + Math.cos(az) * Math.cos(el) * dist);
  }

  let az = opts.azimuth ?? -.55;
  const el = opts.elevation ?? .58;
  const dist = opts.distance ?? 2300;

  /* ---------- hero loop ----------
     The hero runs as a short sequence:
       hold    the car on the grid, the camera low behind it looking up at
               the gantry (hidden under the intro while it plays)
       launch  the car leaves the grid, the lens punches wider, and the
               camera pulls up into the overview while a scan sweeps the
               hills and the lap traces itself in yellow
       free    the overview: slow orbit, mouse parallax, the car lapping */
  let running = false, last = 0, simT = opts.startTime ?? 16;
  const lap = (window.RBR && window.RBR.lapTime) || 63;
  const L = (window.RBR && window.RBR.length) || 4318;
  const easeInOut = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const smooth01 = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const baseFov = camera.fov;
  const tmpLook = new THREE.Vector3();

  // the car's grid slot, a few lengths behind the line, and the shot on it
  const GRID = L - 26, GRID_SCALE = 1.7;
  const grid = pointAt(GRID);
  const gF = grid.t.clone(), gS = new THREE.Vector3(-gF.z, 0, gF.x);
  const holdPos = grid.p.clone().addScaledVector(gF, -8.1).addScaledVector(gS, 2.3).add(new THREE.Vector3(0, 2.2, 0));
  const holdLook = grid.p.clone().add(new THREE.Vector3(0, 1.1, 0)).lerp(panelWorld, .8);
  const holdFov = () => (camera.aspect < 1 ? 56 : 36);

  let phase = isHero && !reduced && opts.introWait ? 'hold' : 'free';
  let phaseAt = 0, shake = 0;
  const jitter = () => new THREE.Vector3((Math.random() - .5) * shake, (Math.random() - .5) * shake, (Math.random() - .5) * shake);

  // time on the simulated lap at a distance, for handing over to the free loop
  function timeAtDist(m) {
    const t = window.RBR.time, i = Math.min(t.length - 2, Math.floor(m / 10));
    return t[i] + (t[i + 1] - t[i]) * (m / 10 - i);
  }

  function heroFrame(now) {
    if (!running) return;
    const dt = last ? Math.min(.05, (now - last) / 1000) : 0;
    last = now;
    mouse.sx += (mouse.x - mouse.sx) * .05;
    mouse.sy += (mouse.y - mouse.sy) * .05;
    shake *= Math.exp(-dt * 7);
    if (phase !== 'hold' && !reduced) az += dt * .018;
    const endPos = overview(az + mouse.sx * .22, el - mouse.sy * .07, dist);

    if (phase === 'hold') {
      car.scale.setScalar(GRID_SCALE);
      placeCar(GRID);
      camera.position.copy(holdPos);
      camera.lookAt(holdLook);
      if (camera.fov !== holdFov()) { camera.fov = holdFov(); camera.updateProjectionMatrix(); }
      setTrail(0, 0);
      terrainMat.uniforms.uScanOn.value = 0;
    } else if (phase === 'launch') {
      const tl = (now - phaseAt) / 1000;
      // hard acceleration off the grid, capped at about 280 km/h
      const v0 = 78, a = 17, tCap = v0 / a;
      const d = tl < tCap ? .5 * a * tl * tl : .5 * a * tCap * tCap + v0 * (tl - tCap);
      const crossed = GRID + d > L;
      const m = (GRID + d) % L;
      const raw = Math.min(1, Math.max(0, (tl - .9) / 3.4));
      const e = easeInOut(raw);
      car.scale.setScalar(lerp(GRID_SCALE, carScale, smooth01(.1, .8, e)));
      const { p, t: fwd } = placeCar(m);
      // a low beat first: the camera creeps after the car as it rockets away
      // under the gantry, then pulls up and out over the circuit
      tmpLook.copy(holdPos).addScaledVector(gF, Math.min(d, 7) * .45);
      camera.position.lerpVectors(tmpLook, endPos, e).add(jitter());
      tmpLook.copy(holdLook).lerp(p.clone().addScaledVector(fwd, 12).add(new THREE.Vector3(0, 1.6, 0)), smooth01(0, .4, tl));
      tmpLook.lerp(target, e);
      camera.lookAt(tmpLook);
      camera.fov = lerp(holdFov() + 14 * smooth01(0, .3, tl), baseFov, e);
      camera.updateProjectionMatrix();
      // once the camera is high, a scan sweeps the hills and the lap traces itself
      const ks = Math.min(1, Math.max(0, (tl - 1.3) / 3.6));
      terrainMat.uniforms.uScanR.value = 1400 * (1 - Math.pow(1 - ks, 2));
      terrainMat.uniforms.uScanOn.value = smooth01(0, .05, ks) * (1 - smooth01(.78, 1, ks));
      const own = crossed ? m : 0;
      const traced = Math.max(own, L * smooth01(.34, .8, raw));
      setTrail(Math.max(0, own - 420) * smooth01(.68, 1, raw), traced + (own - traced) * smooth01(.78, 1, raw));
      if (raw >= 1 && ks >= 1) { phase = 'free'; simT = timeAtDist(m); }
    } else {
      // free: the overview, with the car lapping on the simulated lap
      if (!reduced) simT = (simT + dt * 1.6) % lap;
      car.scale.setScalar(carScale);
      camera.position.copy(endPos);
      camera.lookAt(target);
      if (camera.fov !== baseFov) { camera.fov = baseFov; camera.updateProjectionMatrix(); }
      terrainMat.uniforms.uScanOn.value = 0;
      const m = Track.distAtTime(simT);
      placeCar(m);
      setTrail(Math.max(0, m - 420), m);
    }
    renderer.render(scene, camera);
    requestAnimationFrame(heroFrame);
  }

  /* ---------- lap mode ---------- */
  const farNear = terrainMat.uniforms.uFar.value.clone();
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
  let camInit = false;
  function setLap(t, blendOverview, sideBias, activeCorner, dt) {
    const m = t >= lap ? (window.RBR.length - .01) : Track.distAtTime(t);
    const { p, t: fwd } = placeCar(m);
    setTrail(0, m);
    const side = new THREE.Vector3(-fwd.z, 0, fwd.x);
    const chasePos = p.clone()
      .addScaledVector(fwd, -26)
      .addScaledVector(side, sideBias * 11)
      .add(new THREE.Vector3(0, 9.5, 0));
    const chaseLook = p.clone().addScaledVector(fwd, 24).add(new THREE.Vector3(0, 1.5, 0));
    const ovPos = overview(-.55, .64, 2500);
    const pos = chasePos.lerp(ovPos, blendOverview);
    const look = chaseLook.lerp(target, blendOverview);
    // close up the contours fade with distance; from the overview they don't
    const far = terrainMat.uniforms.uFar.value;
    far.set(farNear.x + (5000 - farNear.x) * blendOverview, farNear.y + (9000 - farNear.y) * blendOverview);
    if (!camInit || reduced) { camPos.copy(pos); camLook.copy(look); camInit = true; }
    const k = 1 - Math.exp(-(dt || .016) * 5);
    camPos.lerp(pos, k);
    camLook.lerp(look, k);
    camera.position.copy(camPos);
    camera.lookAt(camLook);
    renderer.render(scene, camera);
    placeLabels(W, H, activeCorner);
  }

  function start() {
    if (mode !== 'hero' || running) return;
    running = true; last = 0;
    requestAnimationFrame(heroFrame);
  }
  function stop() { running = false; }

  if (mode === 'hero' && reduced) {
    camera.position.copy(overview(az, el, dist));
    camera.lookAt(target);
    const m = Track.distAtTime(simT);
    placeCar(m); setTrail(Math.max(0, m - 420), m);
    renderer.render(scene, camera);
  }

  // launch off the grid; the home page calls this as its intro cuts away
  function go() {
    if (phase !== 'hold') return;
    shake = .55;
    phase = 'launch';
    phaseAt = performance.now();
  }

  return { start, stop, setLap, resize, go, renderer, scene, camera };
}
