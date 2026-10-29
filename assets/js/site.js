/* Shared behaviour for every page: navigation and menu, smooth scroll,
   the stream schedule, the sound toggle and the stream embeds. */
(function () {
  'use strict';

  var Z0 = (window.Z0 = window.Z0 || {});
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  Z0.reduced = reduced;

  /* ------------------------------------------------------------------
     Stream schedule, as set on Twitch. This copy shows straight away; the
     page then reads the live Twitch calendar (schedule.js) and replaces it,
     so editing the schedule on Twitch updates the site too. Times are UK
     local time; the clock follows Europe/London, so GMT and BST are handled
     with no seasonal edits.
     day: 0 = Sunday ... 6 = Saturday
     ------------------------------------------------------------------ */
  var SCHEDULE = [
    { day: 1, start: '16:30', end: '18:30', game: 'F1 25', title: 'Formula 1 practice and open lobbies' },
    { day: 2, start: '16:30', end: '18:30', game: 'iRacing', title: 'iRacing practice and racing' },
    { day: 3, start: '16:30', end: '18:30', game: 'F1 25', title: 'Formula 1 practice and open lobbies' },
    { day: 4, start: '16:30', end: '18:30', game: 'F1 25', title: 'F1 league race practice' },
    { day: 5, start: '18:00', end: '22:00', game: 'F1 25', title: 'F1 league race build-up' },
    { day: 6, start: '12:00', end: '14:00', game: 'F1 25', title: 'F1 chill racing' },
    { day: 0, start: '17:00', end: '20:00', game: 'Assetto Corsa', title: 'Assetto Corsa or iRacing' },
  ];
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var DAY_IDX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  function mins(hhmm) { var p = hhmm.split(':'); return +p[0] * 60 + +p[1]; }

  function londonNow() {
    var parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London', weekday: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    }).formatToParts(new Date());
    var m = {};
    parts.forEach(function (p) { m[p.type] = p.value; });
    var h = +m.hour % 24;
    return { day: DAY_IDX[m.weekday], mins: h * 60 + +m.minute, secs: +m.second, h: h, m: +m.minute };
  }

  function isBST() {
    try {
      var p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', timeZoneName: 'short' }).formatToParts(new Date());
      var tz = p.filter(function (x) { return x.type === 'timeZoneName'; })[0];
      return !!tz && tz.value !== 'GMT';
    } catch (e) { return false; }
  }

  /* Live status comes from Twitch itself (checked every two minutes), not
     from the schedule, so the site only says "live" when the stream is up.
     `live` is null when the check hasn't answered, true or false after. */
  var LIVE = { live: null, uptime: '' };
  function checkLive() {
    if (!window.fetch) return;
    fetch('https://decapi.me/twitch/uptime/z0mb1xcat', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.text() : Promise.reject(r.status); })
      .then(function (t) {
        t = t.trim();
        LIVE.live = !/offline/i.test(t) && !/error|not found/i.test(t);
        LIVE.uptime = LIVE.live ? t : '';
        paintStatus();
      })
      .catch(function () { /* keep the last answer */ });
  }

  /* What is live now (if Twitch says so) and the next scheduled slot. */
  function status() {
    var now = londonNow();
    var weekMin = now.day * 1440 + now.mins;
    var slotNow = null, next = null, best = Infinity;
    SCHEDULE.forEach(function (s) {
      var a = s.day * 1440 + mins(s.start);
      var b = s.day * 1440 + mins(s.end);
      if (weekMin >= a && weekMin < b) slotNow = s;
      var until = a - weekMin;
      if (until <= 0) until += 7 * 1440;
      if (until < best) { best = until; next = { slot: s, until: until }; }
    });
    var live = LIVE.live ? { slot: slotNow || { game: 'On Twitch', title: '' }, uptime: LIVE.uptime } : null;
    return { now: now, live: live, next: next, bst: isBST() };
  }

  /* schedule.js replaces the list with the live Twitch calendar */
  Z0.setSchedule = function (list) {
    if (!list || !list.length) return;
    SCHEDULE.length = 0;
    list.forEach(function (s) { SCHEDULE.push(s); });
    paintStatus();
  };

  function rel(m) {
    if (m < 60) return 'in ' + m + ' min';
    var h = Math.floor(m / 60), r = m % 60;
    if (h < 24) return 'in ' + h + ' h' + (r ? ' ' + r + ' min' : '');
    var d = Math.floor(h / 24);
    return 'in ' + d + (d === 1 ? ' day' : ' days');
  }

  /* The next start in the visitor's own clock. */
  function localTime(minutesFromNow) {
    var d = new Date(Date.now() + minutesFromNow * 60000);
    d.setSeconds(0, 0);
    return new Intl.DateTimeFormat(undefined, { weekday: 'long', hour: '2-digit', minute: '2-digit' }).format(d);
  }

  /* "Today", "Tomorrow" or the weekday of the next slot */
  function dayWord(s) {
    var d = s.next.slot.day;
    if (d === s.now.day && s.next.until < 1440) return 'Today';
    if (d === (s.now.day + 1) % 7) return 'Tomorrow';
    return DAYS[d];
  }

  Z0.dayWord = dayWord;
  Z0.schedule = SCHEDULE;
  Z0.days = DAYS;
  Z0.status = status;
  Z0.rel = rel;
  Z0.mins = mins;
  Z0.localTime = localTime;
  Z0.londonNow = londonNow;

  function paintStatus() {
    var s = status();
    var live = !!s.live;

    document.querySelectorAll('[data-next-card]').forEach(function (card) {
      card.classList.toggle('is-live', live);
      var k = card.querySelector('[data-next-k]');
      var v = card.querySelector('[data-next-v]');
      var w = card.querySelector('[data-next-w]');
      if (live) {
        k.textContent = 'Live now';
        v.textContent = s.live.slot.game;
        w.textContent = s.live.uptime ? 'On for ' + s.live.uptime : 'Watch on Twitch';
      } else {
        k.textContent = 'Next stream';
        v.textContent = s.next.slot.game;
        w.textContent = dayWord(s) + ', ' + s.next.slot.start + ' UK';
      }
    });

    document.querySelectorAll('[data-live-btn]').forEach(function (b) {
      b.classList.toggle('is-live', live);
      var l = b.querySelector('.nav-live-label');
      if (l) l.textContent = live ? 'Live now' : 'Watch live';
    });

    document.querySelectorAll('[data-next-line]').forEach(function (el) {
      el.textContent = live
        ? 'Live now: ' + s.live.slot.game
        : 'Next stream: ' + s.next.slot.game + ', ' + DAYS[s.next.slot.day] + ' ' + s.next.slot.start + ' UK';
    });

    var esc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    document.querySelectorAll('[data-week]').forEach(function (list) {
      var order = [1, 2, 3, 4, 5, 6, 0];
      var full = list.hasAttribute('data-week-full');
      list.innerHTML = order.map(function (d) {
        var slot = SCHEDULE.filter(function (x) { return x.day === d; })[0];
        var today = d === s.now.day;
        var what = slot ? (full && slot.title ? esc(slot.title) + '<em>' + esc(slot.game) + '</em>' : esc(slot.game)) : 'Off';
        return '<li class="' + (today ? 'is-today' : '') + '"><span class="d">' + DAYS[d] + '</span>' +
          '<span class="g">' + what + '</span>' +
          '<span class="h">' + (slot ? slot.start + ' to ' + slot.end : '') + '</span></li>';
      }).join('');
    });
    // pages with their own status displays (the live page) repaint on this
    document.dispatchEvent(new CustomEvent('z0:status'));
  }
  /* The live Twitch calendar (iCalendar, public, allowed from any site).
     Each weekly event becomes one slot; anything unexpected keeps the copy
     above. Times in the feed are already Europe/London. */
  var CAL = 'https://api.twitch.tv/helix/schedule/icalendar?broadcaster_id=792780701';
  var BYDAY = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
  function loadCalendar() {
    if (!window.fetch) return;
    fetch(CAL).then(function (r) { return r.ok ? r.text() : Promise.reject(r.status); }).then(function (ics) {
      var slots = [];
      ics.replace(/\r?\n[ \t]/g, '').split('BEGIN:VEVENT').slice(1).forEach(function (ev) {
        var get = function (k) { var m = new RegExp('^' + k + '[^:\\n]*:(.*)$', 'm').exec(ev); return m ? m[1].trim() : ''; };
        var rule = /BYDAY=([A-Z,]+)/.exec(get('RRULE'));
        var st = /T(\d\d)(\d\d)/.exec(get('DTSTART')), en = /T(\d\d)(\d\d)/.exec(get('DTEND'));
        if (!rule || !st || !en || !/FREQ=WEEKLY/.test(get('RRULE'))) return;
        var game = get('CATEGORIES').split(',')[0] || 'Sim racing';
        var title = get('SUMMARY').replace(/\\,/g, ',').replace(/\.$/, '');
        rule[1].split(',').forEach(function (d) {
          if (d in BYDAY) slots.push({ day: BYDAY[d], start: st[1] + ':' + st[2], end: en[1] + ':' + en[2], game: game, title: title });
        });
      });
      if (slots.length >= 3) Z0.setSchedule(slots);
    }).catch(function () { /* keep the built-in copy */ });
  }

  paintStatus();
  checkLive();
  loadCalendar();
  setInterval(paintStatus, 30000);
  setInterval(checkLive, 120000);
  Z0.paintStatus = paintStatus;

  /* ---------------- sound toggle ---------------- */
  /* Three states: off, on, and "armed" (on, but this page hasn't had the tap
     browsers need before audio can play). Clicking an armed toggle starts
     the sound rather than switching it off. */
  var soundBtns = document.querySelectorAll('[data-sound-toggle]');
  function paintSound() {
    var on = Sound.on, armed = Sound.armed;
    soundBtns.forEach(function (b) {
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.classList.toggle('is-armed', armed);
      b.setAttribute('aria-label', armed ? 'Sound is on: tap to start it' : on ? 'Turn sound off' : 'Turn sound on');
      var l = b.querySelector('[data-sound-label]');
      if (l) l.textContent = armed ? 'Tap to start sound' : on ? 'Sound on' : 'Sound off';
    });
  }
  if (soundBtns.length && window.Sound) {
    paintSound();
    soundBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        if (Sound.armed || Sound.justWoke) { Sound.ensure(); return; }
        Sound.set(!Sound.on);
        if (Sound.on) Sound.play('blip');
      });
    });
    Sound.onChange(paintSound);
  }

  /* ---------------- smooth scroll ---------------- */
  if (window.Lenis && !reduced && window.matchMedia('(pointer: fine)').matches) {
    var lenis = new Lenis({ lerp: .1, smoothWheel: true });
    Z0.lenis = lenis;
    var loop = function (t) { lenis.raf(t); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    if (id.length < 2) return;
    var target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    if (Z0.lenis) Z0.lenis.scrollTo(target, { offset: -20 });
    else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  });

  /* ---------------- nav: hides on the way down, turns light over plum ---- */
  var nav = document.querySelector('[data-nav]');
  if (nav) {
    var lastY = window.scrollY;
    var darks = function () { return document.querySelectorAll('.sec--plum, .band, .foot, [data-dark]'); };
    var onScroll = function () {
      var y = window.scrollY;
      var menuOpen = document.documentElement.classList.contains('menu-open');
      nav.classList.toggle('is-hidden', !menuOpen && y > 240 && y > lastY + 2);
      if (y < lastY - 2 || y < 240) nav.classList.remove('is-hidden');
      lastY = y;
      var over = false;
      darks().forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top <= 40 && r.bottom >= 40) over = true;
      });
      nav.classList.toggle('on-plum', over);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------------- menu ---------------- */
  var menu = document.querySelector('[data-menu]');
  var openBtn = document.querySelector('[data-menu-open]');
  var closeBtn = document.querySelector('[data-menu-close]');
  function setMenu(open) {
    if (!menu) return;
    menu.classList.toggle('is-open', open);
    menu.toggleAttribute('inert', !open);
    document.documentElement.classList.toggle('menu-open', open);
    if (openBtn) openBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (Z0.lenis) { if (open) Z0.lenis.stop(); else Z0.lenis.start(); }
    document.documentElement.style.overflow = open ? 'hidden' : '';
    if (open) { var f = menu.querySelector('.menu-links a'); if (f) setTimeout(function () { f.focus(); }, 300); }
    else if (openBtn) openBtn.focus();
  }
  if (menu) {
    menu.setAttribute('inert', '');
    if (openBtn) openBtn.addEventListener('click', function () { setMenu(true); });
    if (closeBtn) closeBtn.addEventListener('click', function () { setMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.classList.contains('is-open')) setMenu(false); });
  }

  /* ---------------- headline line reveals ---------------- */
  if ('IntersectionObserver' in window) {
    var rio = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); rio.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -12% 0px' });
    document.querySelectorAll('[data-reveal]').forEach(function (el) { rio.observe(el); });
  } else {
    document.querySelectorAll('[data-reveal]').forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------------- embeds ----------------
     The Twitch player and Discord widget are heavy and keep connections
     open, so each is only built when it comes within a screen of view (the
     page itself finishes loading straight away). Twitch only plays inside a
     page whose host matches the `parent` parameter, so that comes from
     location.hostname. */
  function buildTwitch(box) {
    if (location.protocol === 'file:' || !location.hostname) { box.classList.add('is-failed'); return; }
    var ch = box.getAttribute('data-twitch');
    var f = document.createElement('iframe');
    f.title = 'Twitch stream for ' + ch;
    f.allowFullscreen = true;
    f.src = 'https://player.twitch.tv/?channel=' + encodeURIComponent(ch) +
      '&parent=' + encodeURIComponent(location.hostname) + '&muted=true&autoplay=false';
    box.querySelector('[data-embed-slot]').appendChild(f);
  }
  function buildDiscord(box) {
    var d = document.createElement('iframe');
    d.title = 'Discord server members';
    d.setAttribute('sandbox', 'allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts');
    d.src = 'https://discord.com/widget?id=' + encodeURIComponent(box.getAttribute('data-discord')) + '&theme=dark';
    box.querySelector('[data-embed-slot]').appendChild(d);
  }
  var embeds = [];
  document.querySelectorAll('[data-twitch]').forEach(function (el) { embeds.push([el, buildTwitch]); });
  document.querySelectorAll('[data-discord]').forEach(function (el) { embeds.push([el, buildDiscord]); });
  if (embeds.length) {
    if ('IntersectionObserver' in window) {
      var eio = new IntersectionObserver(function (es) {
        es.forEach(function (en) {
          if (!en.isIntersecting) return;
          eio.unobserve(en.target);
          embeds.forEach(function (e) { if (e[0] === en.target) e[1](e[0]); });
        });
      }, { rootMargin: '100% 0px' });
      embeds.forEach(function (e) { eio.observe(e[0]); });
    } else {
      embeds.forEach(function (e) { e[1](e[0]); });
    }
  }

  /* ---------------- small things ---------------- */
  // copy buttons: <button data-copy-text="...">
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-copy-text]');
    if (!b || !navigator.clipboard) return;
    var label = b.textContent;
    navigator.clipboard.writeText(b.getAttribute('data-copy-text')).then(function () {
      b.textContent = 'Copied';
      setTimeout(function () { b.textContent = label; }, 1800);
    });
  });
  document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* looping videos load when near, play on screen, pause off screen. Videos
     marked data-sound carry the onboard audio and play it when sound is on;
     if the browser refuses audible autoplay they fall back to muted. */
  function playVideo(v) {
    var loud = v.hasAttribute('data-sound') && window.Sound && Sound.on;
    v.muted = !loud;
    v.volume = .45;
    var p = v.play();
    if (p && p.catch) p.catch(function () { if (!v.muted) { v.muted = true; v.play().catch(function () {}); } });
  }
  if ('IntersectionObserver' in window) {
    var vio = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        var v = en.target;
        v.dataset.onScreen = en.isIntersecting ? '1' : '';
        if (en.isIntersecting && !reduced) {
          if (v.preload === 'none') { v.preload = 'auto'; v.load(); }
          playVideo(v);
        } else v.pause();
      });
    }, { rootMargin: '200px 0px' });
    document.querySelectorAll('video[data-autopause]').forEach(function (v) { vio.observe(v); });
    if (window.Sound) Sound.onChange(function () {
      document.querySelectorAll('video[data-sound]').forEach(function (v) { if (v.dataset.onScreen && !reduced) playVideo(v); });
    });
  }
})();
