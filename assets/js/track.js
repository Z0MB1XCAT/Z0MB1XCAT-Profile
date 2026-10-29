/* Draws the Red Bull Ring from track-rbr.js and turns lap time into
   distance, speed, gear and revs. Used by the home page map and the lap. */
(function () {
  'use strict';

  var T = window.RBR;
  if (!T) return;
  var STEP = 10; // metres between samples in T.speed / T.time
  var NS = 'http://www.w3.org/2000/svg';

  /* 8-speed box: the speed (km/h) at which each gear is selected */
  var GEARS = [0, 108, 142, 172, 202, 234, 264, 294];

  function distAtTime(t) {
    var a = T.time;
    var lap = T.lapTime;
    t = ((t % lap) + lap) % lap;
    var lo = 0, hi = a.length - 1;
    if (t >= a[hi]) {
      return hi * STEP + (T.length - hi * STEP) * (t - a[hi]) / (lap - a[hi]);
    }
    while (hi - lo > 1) {
      var mid = (lo + hi) >> 1;
      if (a[mid] <= t) lo = mid; else hi = mid;
    }
    return lo * STEP + STEP * (t - a[lo]) / (a[hi] - a[lo] || 1);
  }

  function speedAt(m) {
    var s = T.speed;
    var i = Math.max(0, m) / STEP;
    var a = Math.floor(i) % s.length;
    var b = (a + 1) % s.length;
    return s[a] + (s[b] - s[a]) * (i - Math.floor(i));
  }

  function gearFor(kmh) {
    var g = 1;
    for (var i = 1; i < GEARS.length; i++) if (kmh >= GEARS[i]) g = i + 1;
    return g;
  }

  function rpmFor(kmh) {
    var g = gearFor(kmh);
    var lo = GEARS[g - 1];
    var hi = GEARS[g] || 345;
    var r = g === 1 ? 4200 + (kmh / hi) * 7600 : 9900 + (kmh - lo) / (hi - lo) * 2100;
    return Math.max(4000, Math.min(12000, r));
  }

  function fmt(t) {
    var m = Math.floor(t / 60);
    var s = t - m * 60;
    return m + ':' + (s < 10 ? '0' : '') + s.toFixed(3);
  }

  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  /* Builds the map into an <svg>. Options:
       width     track width in viewBox units
       tail      if set, only the last `tail` metres behind the car are lit
       labels    draw corner numbers (default true)
       portrait  turn the map 90 degrees to fill a tall screen */
  function draw(svg, o) {
    o = o || {};
    var w = o.width || 12;
    var vb = T.viewBox.split(' ').map(Number);
    svg.innerHTML = '';
    svg.setAttribute('viewBox', o.portrait ? '0 0 ' + vb[3] + ' ' + vb[2] : T.viewBox);
    var root = el('g', o.portrait ? { transform: 'translate(' + vb[3] + ' 0) rotate(90)' } : {}, svg);
    var upright = o.portrait ? { transform: 'rotate(-90)' } : {};

    el('path', { d: T.pit, class: 'track-pit', 'stroke-width': Math.max(2, w * .28) }, root);
    el('path', { d: T.d, class: 'track-edge', 'stroke-width': w + 7 }, root);
    var base = el('path', { d: T.d, class: 'track-base', 'stroke-width': w }, root);
    var run = el('path', { d: T.d, class: 'track-run', 'stroke-width': Math.max(3, w * .42) }, root);
    var len = base.getTotalLength();
    var scale = len / T.length; // viewBox units per metre

    if (o.tail) run.style.strokeDasharray = (o.tail * scale) + ' ' + len * 2;
    else { run.style.strokeDasharray = len + ' ' + len; run.style.strokeDashoffset = len; }

    // chequered start/finish line across the track
    var sf = el('g', { class: 'track-sf', transform: 'translate(' + T.sf.x + ' ' + T.sf.y + ') rotate(' + T.sf.a + ')' }, root);
    var cs = w / 4 + 1;
    for (var r = 0; r < 2; r++) {
      for (var c = 0; c < 4; c++) {
        el('rect', {
          x: -cs + r * cs, y: -2 * cs + c * cs, width: cs, height: cs,
          fill: (r + c) % 2 ? '#0c0714' : '#f6f2fb',
        }, sf);
      }
    }

    // corner numbers sit just outside each apex
    var corners = [];
    if (o.labels !== false) {
      var cg = el('g', {}, root);
      T.corners.forEach(function (c) {
        var at = c.m * scale;
        var p = base.getPointAtLength(at);
        var a = base.getPointAtLength(Math.max(0, at - 40 * scale));
        var b = base.getPointAtLength(Math.min(len, at + 40 * scale));
        var vx = p.x - (a.x + b.x) / 2;
        var vy = p.y - (a.y + b.y) / 2;
        var vl = Math.hypot(vx, vy) || 1;
        var off = w + 18;
        var x = Math.min(980, Math.max(20, p.x + vx / vl * off));
        var y = p.y + vy / vl * off;
        var g = el('g', { class: 'track-corner', transform: 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')' }, cg);
        var tc = el('g', { class: 'tc' }, el('g', upright, g));
        el('circle', { r: 13 }, tc);
        var tx = el('text', {}, tc);
        tx.textContent = c.n;
        corners.push(g);
      });
    }

    var car = el('g', { class: 'track-car' }, root);
    var cc = el('g', { class: 'tc' }, car);
    el('circle', { r: w * .78, fill: '#fddf89' }, cc);
    el('circle', { r: w * .3, fill: '#0c0714' }, cc);

    function setDistance(m) {
      m = Math.max(0, Math.min(T.length, m));
      var at = m * scale;
      var p = base.getPointAtLength(at);
      car.setAttribute('transform', 'translate(' + p.x.toFixed(2) + ' ' + p.y.toFixed(2) + ')');
      if (o.tail) run.style.strokeDashoffset = -(at - o.tail * scale);
      else run.style.strokeDashoffset = len - at;
    }

    function setCorner(active, doneBefore) {
      corners.forEach(function (g, i) {
        g.classList.toggle('is-active', i + 1 === active);
        g.classList.toggle('is-done', i + 1 < (doneBefore || 0) && i + 1 !== active);
      });
    }

    setDistance(0);
    return { setDistance: setDistance, setCorner: setCorner, length: len, svg: svg };
  }

  window.Track = {
    data: T,
    draw: draw,
    distAtTime: distAtTime,
    speedAt: speedAt,
    gearFor: gearFor,
    rpmFor: rpmFor,
    fmt: fmt,
  };
})();
