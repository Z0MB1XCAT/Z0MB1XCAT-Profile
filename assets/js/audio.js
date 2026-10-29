/* Engine sound, all of it from Z0MB1XCAT's own onboard lap of the Red Bull
   Ring in Assetto Corsa (assets/audio/onboard-rbr.mp3). Nothing is
   synthesised: the lap page plays the recording in step with the car, and
   the sound toggles and the start game play short slices of it. Anything
   asked for before the file has decoded waits for it briefly or is skipped.

   Nothing plays until a visitor turns sound on. The choice is remembered for
   the browser session, but browsers only allow audio after a click, tap or
   key press on each page (scrolling doesn't count). Until then sound is
   "armed": the toggles say so, and the next tap starts it. */
(function () {
  'use strict';

  var KEY = 'z0-sound';
  // resolved from this script, so it works from any page
  var SRC = (function () {
    try { return new URL('../audio/onboard-rbr.mp3', document.currentScript.src).href; } catch (e) { return 'assets/audio/onboard-rbr.mp3'; }
  })();
  // slices of the onboard, in seconds
  var SEG = {
    blip: [21.2, 22.1],   // one short burst of revs
    rev: [21.3, 21.75],   // shorter still, for each start light in the game
  };

  var ctx = null, master = null, buf = null, bytes = null, decoding = false;
  var wanted = false, subs = [], pending = [];

  try { wanted = sessionStorage.getItem(KEY) === 'on'; } catch (e) { wanted = false; }
  function save() { try { sessionStorage.setItem(KEY, wanted ? 'on' : 'off'); } catch (e) { /* private mode */ } }
  function emit() { subs.forEach(function (fn) { fn(wanted); }); }
  function g(v) { var x = ctx.createGain(); x.gain.value = v; return x; }

  /* ---------------- loading ---------------- */
  // fetch early (no audio context needed), decode once sound is switched on
  function prefetch() {
    if (!bytes) bytes = fetch(SRC).then(function (r) { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); });
    return bytes;
  }
  function decode() {
    if (buf || decoding || !ctx) return;
    decoding = true;
    prefetch()
      .then(function (a) { return new Promise(function (res, rej) { ctx.decodeAudioData(a.slice(0), res, rej); }); })
      .then(function (b) {
        buf = b;
        var now = performance.now();
        pending.splice(0).forEach(function (p) { if (now - p.at < p.maxAge) p.fn(); });
      })
      .catch(function () { bytes = null; pending = []; })
      .then(function () { decoding = false; emit(); });
  }
  // run fn once the recording is ready, unless it would be too late to matter
  function whenReady(fn, maxAge) {
    if (buf) { fn(); return; }
    pending.push({ fn: fn, at: performance.now(), maxAge: maxAge || 1500 });
    decode();
  }

  /* ---------------- context ---------------- */
  function ensure() {
    if (!wanted) return false;
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      try { ctx = new AC(); } catch (e) { return false; }
      var comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -12; comp.ratio.value = 3;
      comp.connect(ctx.destination);
      master = g(0); master.connect(comp);
      ctx.onstatechange = emit;
    }
    if (ctx.state === 'suspended') ctx.resume().then(emit, emit);
    master.gain.setTargetAtTime(.9, ctx.currentTime, .08);
    decode();
    emit();
    return true;
  }
  function ready() { return !!(wanted && ctx && ctx.state === 'running'); }

  /* ---------------- slices ---------------- */
  function slice(seg, level, fadeOut) {
    var t = ctx.currentTime, dur = seg[1] - seg[0];
    var src = ctx.createBufferSource(); src.buffer = buf;
    var gg = g(0);
    src.connect(gg); gg.connect(master);
    gg.gain.setValueAtTime(0, t);
    gg.gain.linearRampToValueAtTime(level, t + .05);
    gg.gain.setValueAtTime(level, t + Math.max(.08, dur - fadeOut));
    gg.gain.linearRampToValueAtTime(0, t + dur);
    src.start(t, seg[0], dur);
    return { src: src, g: gg };
  }
  function stop(h, k) {
    if (!h || !ctx) return;
    h.g.gain.cancelScheduledValues(ctx.currentTime);
    h.g.gain.setTargetAtTime(0, ctx.currentTime, k || .08);
    setTimeout(function () { try { h.src.stop(); } catch (e) { /* already stopped */ } }, 700);
  }

  function play(name) {
    if (!wanted) return;
    if (name === 'off') { endTape(.05); return; }
    whenReady(function () {
      if (!ready()) return;
      if (name === 'blip') slice(SEG.blip, .5, .45);
      else if (name === 'rev') slice(SEG.rev, .3, .2);
    }, 700);
  }

  /* ---------------- the lap: tape that follows the car ----------------
     `pos` is where the recording should be (seconds) and `vel` how fast that
     point is moving forward. While you scroll, the recording plays on at its
     own pace, nudged faster or slower to stay with the car, and jumps (with a
     crossfade) only when it falls well behind or ahead. Stop scrolling and it
     fades; scroll back and it stays quiet. */
  var tape = null;
  function scrub(pos, vel) {
    if (!ready() || !buf) return false;
    var t = ctx.currentTime;
    if (tape) { tape.p += (t - tape.t) * tape.rate; tape.t = t; }
    if (!(vel > .05)) {
      if (tape && !tape.fading) { tape.g.gain.setTargetAtTime(0, t, .18); tape.fading = t; }
      if (tape && tape.fading && t - tape.fading > 1.5) endTape(.02);
      return true;
    }
    // fast scrolling outruns real time; catch up with a crossfaded jump, but
    // no more than every 0.7 s so it stays one continuous engine note
    if (tape && Math.abs(pos - tape.p) > 2.5 && t - tape.born > .7) endTape(.12);
    if (!tape) {
      var src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      var gg = g(0); src.connect(gg); gg.connect(master);
      src.start(t, Math.max(0, Math.min(buf.duration - .05, pos)));
      tape = { src: src, g: gg, p: pos, t: t, rate: 1, fading: 0, born: t };
    }
    tape.fading = 0;
    var rate = Math.max(.82, Math.min(1.45, 1 + (pos - tape.p) * .25));
    tape.rate = rate;
    tape.src.playbackRate.setTargetAtTime(rate, t, .1);
    tape.g.gain.setTargetAtTime(.6, t, .08);
    return true;
  }
  function endTape(k) { if (tape) { stop(tape, k); tape = null; } }

  /* ---------------- on / off ---------------- */
  function set(on) {
    wanted = !!on;
    save();
    if (wanted) ensure();
    else if (ctx) { endTape(.05); master.gain.setTargetAtTime(0, ctx.currentTime, .06); }
    emit();
  }

  // Start on the first real interaction of each page. `wokeAt` records when
  // a tap did that, so a sound toggle hit by the same tap knows the tap was
  // meant to start the sound, not to switch it off.
  var wokeAt = -1e9;
  function arm() {
    var go = function () {
      if (wanted && !ready()) wokeAt = performance.now();
      if (wanted) ensure();
      if (ready()) {
        window.removeEventListener('pointerdown', go, true);
        window.removeEventListener('keydown', go, true);
        window.removeEventListener('touchend', go, true);
      }
    };
    window.addEventListener('pointerdown', go, true);
    window.addEventListener('keydown', go, true);
    window.addEventListener('touchend', go, true);
  }
  arm();

  window.Sound = {
    get on() { return wanted; },
    get ready() { return ready(); },
    // on, but the browser is still waiting for a tap on this page
    get armed() { return wanted && !ready(); },
    // true for a moment after a tap woke the audio
    get justWoke() { return performance.now() - wokeAt < 1200; },
    get hasOnboard() { return !!buf; },
    set: set,
    ensure: ensure,
    prefetch: function () { prefetch().catch(function () { bytes = null; }); },
    play: play,
    scrub: scrub,
    onChange: function (fn) { subs.push(fn); },
  };
})();
