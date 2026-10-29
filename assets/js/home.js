/* Home page: intro gate, the statement that fills as you read, the photo
   parallax, and the lights-out game. The 3D scenes live in three/home-3d.js. */
(function () {
  'use strict';

  var Z0 = window.Z0 || {};
  var reduced = !!Z0.reduced;
  var S = window.Sound || { on: false, set: function () {}, play: function () {} };

  function lights(root) {
    var pods = root.querySelectorAll('.pod');
    return function (k) { pods.forEach(function (p, i) { p.classList.toggle('is-on', i < k); }); };
  }

  /* ------------------------------------------------------------------
     Intro: a cold open on the onboard lap. Once per browser session.
     The onboard runs silently behind the Engine start button as a teaser;
     pressing it (the click browsers need before sound may play) rewinds to
     the drive out of Remus and plays it with its engine sound. Cinema bars
     close in, the name plate slides on, and a flash cuts to the page as the
     3D hero launches (z0:gate-out).
     While it is open, everything else on the page is inert, so keyboard
     focus can't wander behind it.
     ------------------------------------------------------------------ */
  var gate = document.querySelector('[data-gate]');
  var html = document.documentElement;

  if (gate && !html.classList.contains('gate-seen')) {
    html.classList.add('gate-open');
    if (Z0.lenis) Z0.lenis.stop();
    // (anything already inert, like the closed menu, is left as it is)
    var outside = Array.prototype.filter.call(document.body.children, function (el) {
      return el !== gate && el.tagName !== 'SCRIPT' && !el.hasAttribute('inert');
    });
    outside.forEach(function (el) { el.setAttribute('inert', ''); });

    var video = gate.querySelector('[data-gate-video]');
    var START = 16.9; // seconds into the lap: braking for Remus, then the drive out
    var timers = [];
    var leaving = false, started = false;
    gate.querySelectorAll('.ignite-ring i').forEach(function (el, k) { el.style.setProperty('--k', k); });
    // the video is only fetched when the intro is actually shown
    if (video) { video.preload = 'auto'; video.load(); }
    if (video && !reduced) { var tp = video.play(); if (tp && tp.catch) tp.catch(function () {}); }
    var first = gate.querySelector('[data-gate-go]');
    if (first) first.focus({ preventScroll: true });

    var leave = function () {
      if (leaving) return;
      leaving = true;
      timers.forEach(clearTimeout);
      try { sessionStorage.setItem('z0-gate', '1'); } catch (e) { /* private mode */ }
      gate.classList.add('is-leaving');
      outside.forEach(function (el) { el.removeAttribute('inert'); });
      html.classList.remove('gate-open');
      if (Z0.lenis) Z0.lenis.start();
      Z0.gateOut = true;
      document.dispatchEvent(new CustomEvent('z0:gate-out'));
      setTimeout(function () {
        if (video) video.pause();
        gate.hidden = true;
        var m = document.querySelector('#main');
        if (m) m.focus({ preventScroll: true });
      }, reduced ? 60 : 800);
    };

    var run = function (withSound) {
      if (started) return;
      started = true;
      S.set(withSound);
      if (reduced || !video) { leave(); return; }
      gate.classList.add('is-running');
      video.loop = false;
      video.muted = !withSound;
      video.volume = .85;
      video.currentTime = START;
      var p = video.play();
      // if the browser refuses sound, run it silent rather than not at all
      if (p && p.catch) p.catch(function () { video.muted = true; video.play().catch(function () {}); });
      var at = function (ms, fn) { timers.push(setTimeout(fn, ms)); };
      at(300, function () { gate.classList.add('is-bars'); });
      at(1500, function () { gate.classList.add('is-name'); });
      at(3300, function () { gate.classList.add('is-teams'); });
      at(5600, function () { gate.classList.add('is-out'); });
      at(6100, function () { gate.classList.add('is-cut'); });
      at(6250, leave);
    };

    gate.querySelectorAll('[data-gate-go]').forEach(function (b) {
      b.addEventListener('click', function () { run(b.getAttribute('data-gate-go') === 'sound'); });
    });
    var skip = gate.querySelector('[data-gate-skip]');
    if (skip) skip.addEventListener('click', leave);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !gate.hidden) leave(); });
  }

  /* ------------------------------------------------------------------
     Statement: words fill in from light to ink as the paragraph moves
     up the screen, so the reader's position is the progress bar.
     ------------------------------------------------------------------ */
  var fill = document.querySelector('[data-fill]');
  if (fill) {
    var words = fill.textContent.trim().split(/\s+/);
    fill.setAttribute('aria-label', fill.textContent.trim());
    fill.innerHTML = words.map(function (w) { return '<span class="w" aria-hidden="true">' + w + '</span>'; }).join(' ');
    var spans = fill.querySelectorAll('.w');
    var paintFill = function () {
      var r = fill.getBoundingClientRect();
      var vh = window.innerHeight;
      var p = reduced ? 1 : Math.max(0, Math.min(1, (vh * .85 - r.top) / (r.height + vh * .35)));
      var n = Math.round(p * spans.length);
      spans.forEach(function (s, i) { s.classList.toggle('on', i < n); });
    };
    paintFill();
    window.addEventListener('scroll', paintFill, { passive: true });
    window.addEventListener('resize', paintFill);
  }

  /* ------------------------------------------------------------------
     Collage parallax: each photo drifts at its own rate.
     ------------------------------------------------------------------ */
  var phs = Array.prototype.slice.call(document.querySelectorAll('[data-speed]'));
  if (phs.length && !reduced) {
    var ticking = false;
    var paintPh = function () {
      ticking = false;
      var vh = window.innerHeight;
      phs.forEach(function (el) {
        var r = el.parentElement.getBoundingClientRect();
        var off = (r.top + r.height / 2 - vh / 2) * parseFloat(el.getAttribute('data-speed'));
        el.style.transform = 'translate3d(0,' + off.toFixed(1) + 'px,0)';
      });
    };
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(paintPh); } }, { passive: true });
    paintPh();
  }

  /* ------------------------------------------------------------------
     Lights out. Five lights a second apart, then a random hold of 0.2 to
     3 seconds, as in the real start procedure. Under 100 ms is
     anticipation, not reaction, so it counts as a jump start.
     ------------------------------------------------------------------ */
  var game = document.querySelector('[data-game]');
  if (game) {
    var REF = 183;   // my best, ms
    var HUMAN = 273; // median on Human Benchmark
    var stage = game.querySelector('[data-game-stage]');
    var setLights = lights(stage);
    var timeEl = game.querySelector('[data-game-time]');
    var msgEl = game.querySelector('[data-game-msg]');
    var boardEl = game.querySelector('[data-game-board]');
    var lapsEl = game.querySelector('[data-game-laps]');
    var state = 'idle', timers2 = [], t0 = 0, lockUntil = 0, attempts = [], best = null;

    try { var b = parseInt(localStorage.getItem('z0-reaction-best'), 10); if (b > 0) best = b; } catch (e) { best = null; }

    timeEl.classList.add('is-idle');
    var setState = function (s) { state = s; stage.setAttribute('data-state', s); };
    var say = function (time, tone, msg) {
      timeEl.textContent = time;
      timeEl.classList.toggle('is-idle', !tone);
      if (tone) timeEl.setAttribute('data-tone', tone); else timeEl.removeAttribute('data-tone');
      msgEl.innerHTML = msg;
    };

    var paintBoard = function () {
      var rows = [{ who: 'Z0MB1XCAT', t: REF, cls: 'is-ref' }, { who: 'Human median', t: HUMAN, cls: '' }];
      if (best) rows.push({ who: 'Your best', t: best, cls: 'is-you' });
      rows.sort(function (a, b) { return a.t - b.t; });
      boardEl.innerHTML = rows.map(function (r, i) {
        return '<li class="' + r.cls + '"><span class="p">' + (i + 1) + '</span><span class="who">' + r.who + '</span><span class="t">' + (r.t / 1000).toFixed(3) + '</span></li>';
      }).join('');
      lapsEl.innerHTML = attempts.length
        ? attempts.slice(-10).map(function (a) { return '<li data-tone="' + a.tone + '">' + (a.t ? (a.t / 1000).toFixed(3) : 'Jump start') + '</li>'; }).join('')
        : '<li class="empty">None yet.</li>';
    };

    var clear = function () { timers2.forEach(clearTimeout); timers2 = []; };

    var start = function () {
      clear();
      setState('arming');
      setLights(0);
      say('0.000', '', 'Wait for the lights to go out.');
      for (var k = 1; k <= 5; k++) {
        (function (k) {
          timers2.push(setTimeout(function () {
            setLights(k);
            if (S.on) S.play('rev');
            if (k === 5) {
              setState('holding');
              timers2.push(setTimeout(function () {
                requestAnimationFrame(function (ts) { setLights(0); t0 = ts; setState('go'); });
              }, 200 + Math.random() * 2800));
            }
          }, k * 1000));
        })(k);
      }
    };

    var jump = function () {
      clear();
      setState('result');
      lockUntil = performance.now() + 700;
      attempts.push({ t: 0, tone: 'red' });
      say('Jump start', 'red', 'Wait until every light is out. Tap or press <kbd>Space</kbd> to try again.');
      paintBoard();
    };

    var finish = function (rt) {
      setState('result');
      lockUntil = performance.now() + 700;
      var ms = Math.round(rt), gap = ms - REF, tone = 'cream', msg;
      var newBest = !best || ms < best;
      if (newBest) { best = ms; try { localStorage.setItem('z0-reaction-best', String(ms)); } catch (e) { /* private mode */ } }
      if (ms < REF) { tone = 'purple'; msg = 'You beat Z0MB1XCAT by ' + (-gap) + ' ms.'; }
      else if (newBest) { tone = 'green'; msg = 'Personal best. ' + (gap === 0 ? 'Dead level with Z0MB1XCAT.' : gap + ' ms off Z0MB1XCAT.'); }
      else msg = gap + ' ms off Z0MB1XCAT. Your best is ' + (best / 1000).toFixed(3) + '.';
      attempts.push({ t: ms, tone: tone });
      say((ms / 1000).toFixed(3), tone, msg + ' Tap or press <kbd>Space</kbd> to go again.');
      paintBoard();
      if (S.on) S.play('blip');
    };

    var input = function (e) {
      var now = performance.now();
      var ts = e && e.timeStamp && Math.abs(now - e.timeStamp) < 1000 ? e.timeStamp : now;
      if (state === 'arming' || state === 'holding') { jump(); return; }
      if (state === 'go') { var rt = ts - t0; if (rt < 100) jump(); else finish(rt); return; }
      if (now < lockUntil) return;
      start();
    };

    stage.addEventListener('pointerdown', function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      e.preventDefault();
      stage.focus({ preventScroll: true });
      input(e);
    });
    stage.addEventListener('keydown', function (e) {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) input(e); }
    });
    paintBoard();
  }
})();
