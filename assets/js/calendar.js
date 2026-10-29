/* Race calendar, drawn from assets/data/calendar.js.
   Live page ([data-calendar]): the next round with a countdown, the rounds
   still to come grouped by month, and the season's results so far.
   Home page ([data-next-race]): one line about the next round. */
(function () {
  'use strict';

  var leagues = window.Z0_CALENDAR;
  if (!leagues) return;

  var esc = function (t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };

  /* A UK date and time to a real instant. London is UTC+0 or +1, so try
     both and keep the one that reads back as the wanted wall-clock time. */
  var hm = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', hour12: false });
  function londonTime(date, time) {
    var p = date.split('-').map(Number), t = (time || '00:00').split(':').map(Number);
    var want = pad(t[0]) + ':' + pad(t[1]);
    for (var off = 0; off <= 1; off++) {
      var d = new Date(Date.UTC(p[0], p[1] - 1, p[2], t[0] - off, t[1]));
      if (hm.format(d).replace(/^24/, '00') === want) return d;
    }
    return new Date(Date.UTC(p[0], p[1] - 1, p[2], t[0], t[1]));
  }

  var rounds = [];
  leagues.forEach(function (lg) {
    (lg.rounds || []).forEach(function (r0) {
      if (!r0.date) return;
      // a round takes its league's usual start time unless it has its own
      var r = Object.assign({}, r0, { time: r0.time || lg.time || '' });
      var start = londonTime(r.date, r.time);
      // a timed race counts as "next" until three hours after the start;
      // an untimed one until the end of its day
      var over = r.time ? start.getTime() + 3 * 3600e3 : londonTime(r.date).getTime() + 24 * 3600e3;
      rounds.push({ lg: lg, r: r, at: start, over: over });
    });
  });
  if (!rounds.length) return;
  rounds.sort(function (a, b) { return a.at - b.at || (a.r.time ? -1 : 1); });

  var now = Date.now();
  var upcoming = rounds.filter(function (x) { return x.over > now; });
  var past = rounds.filter(function (x) { return x.over <= now; });
  var next = upcoming[0];

  var dayFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', weekday: 'short', day: 'numeric', month: 'short' });
  var longFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', weekday: 'long', day: 'numeric', month: 'long' });
  var monthFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', month: 'long', year: 'numeric' });
  var dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' });
  var localFmt = new Intl.DateTimeFormat(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  var inUK = false;
  try { inUK = Intl.DateTimeFormat().resolvedOptions().timeZone === 'Europe/London'; } catch (e) { inUK = false; }
  var flag = function (c) { return c ? '<img src="assets/img/flags/' + esc(c) + '.svg" alt="" width="28" height="19" loading="lazy">' : ''; };
  var team = function (lg) { return '<span class="team"><i style="--c:' + esc(lg.color) + '"></i>' + esc(lg.league) + '</span>'; };
  var tag = function (r) { return r.tag ? '<span class="cal-tag">' + esc(r.tag) + '</span>' : ''; };

  // whole days between today and the race day, UK calendar
  function daysUntil(x) {
    var a = new Date(dayKey.format(new Date()) + 'T00:00:00Z'), b = new Date(x.r.date + 'T00:00:00Z');
    return Math.round((b - a) / 86400e3);
  }
  function dayWords(n) { return n <= 0 ? 'Race day today' : n === 1 ? 'Race day tomorrow' : 'In ' + n + ' days'; }

  /* ---------- home: one line about the next round ---------- */
  document.querySelectorAll('[data-next-race]').forEach(function (el) {
    if (!next) return;
    el.hidden = false;
    el.querySelector('[data-nr-track]').innerHTML = flag(next.r.country) + esc(next.r.track) + tag(next.r);
    el.querySelector('[data-nr-meta]').innerHTML = team(next.lg) + '<span>' + esc(dayFmt.format(next.at)) +
      (next.r.time ? ', ' + esc(next.r.time) + ' UK' : '') + '</span>';
    el.querySelector('[data-nr-when]').textContent = dayWords(daysUntil(next));
  });

  /* ---------- live page ---------- */
  var root = document.querySelector('[data-calendar]');
  if (!root) return;
  root.hidden = false;

  // leagues without a published calendar, as one line each
  var also = root.querySelector('[data-cal-also]');
  var unlisted = leagues.filter(function (lg) { return !(lg.rounds || []).length && lg.schedule; });
  if (also && unlisted.length) {
    also.hidden = false;
    also.innerHTML = unlisted.map(function (lg) {
      return '<p><span class="team"><i style="--c:' + esc(lg.color) + '"></i>' + esc(lg.league) + '</span><span>' + esc(lg.team) + '. ' + esc(lg.schedule) + '.</span></p>';
    }).join('');
  }

  var nextEl = root.querySelector('[data-cal-next]');
  if (next && nextEl) {
    var where = next.lg.league + (next.lg.season ? ', ' + next.lg.season.toLowerCase() : '') + (next.r.round ? ', round ' + next.r.round : '');
    nextEl.innerHTML =
      '<p class="cal-k"><span class="team"><i style="--c:' + esc(next.lg.color) + '"></i>' + esc(next.lg.team) + '</span>' + esc(where) + tag(next.r) + '</p>' +
      '<p class="cal-track display">' + flag(next.r.country) + esc(next.r.track) + '</p>' +
      '<p class="cal-when">' + esc(longFmt.format(next.at)) + (next.r.time ? ', ' + esc(next.r.time) + ' UK' : '') +
        (next.r.time && !inUK ? '<span>' + esc(localFmt.format(next.at)) + ' where you are</span>' : '') +
        (next.r.time ? '' : '<span>Start time to be confirmed</span>') + '</p>' +
      (next.r.time
        ? '<div class="cal-count num" aria-hidden="true"><div><b data-cc-d>0</b><span>days</span></div><div><b data-cc-h>00</b><span>hours</span></div><div><b data-cc-m>00</b><span>minutes</span></div></div>'
        : '<p class="cal-on">' + esc(dayWords(daysUntil(next))) + '</p>');
    if (next.r.time) {
      var tick = function () {
        var s = Math.max(0, Math.round((next.at.getTime() - Date.now()) / 1000));
        var c = nextEl.querySelector('.cal-count');
        if (!c) return;
        if (s === 0) { c.outerHTML = '<p class="cal-on">Racing now</p>'; return; }
        nextEl.querySelector('[data-cc-d]').textContent = Math.floor(s / 86400);
        nextEl.querySelector('[data-cc-h]').textContent = pad(Math.floor(s % 86400 / 3600));
        nextEl.querySelector('[data-cc-m]').textContent = pad(Math.floor(s % 3600 / 60));
      };
      tick();
      setInterval(tick, 20000);
    }
  } else if (nextEl) {
    nextEl.innerHTML = '<p class="cal-k">No more rounds on the calendar yet.</p>';
  }

  function row(x, isPast) {
    return '<li class="' + (x === next ? 'is-next' : '') + '">' +
      '<span class="cl-date">' + esc(dayFmt.format(x.at)) + '<em>' + (x.r.time ? esc(x.r.time) + ' UK' : (isPast ? '' : 'Time TBC')) + '</em></span>' +
      '<span class="cl-track">' + flag(x.r.country) + '<span>' + esc(x.r.track) + tag(x.r) + '</span></span>' +
      '<span class="cl-lg">' + team(x.lg) + (x.r.round ? '<em>Round ' + esc(x.r.round) + '</em>' : '') + '</span>' +
      '<span class="cl-res display">' + esc(x.r.result || '') + '</span></li>';
  }

  // the rounds still to come, under a heading for each month
  var list = root.querySelector('[data-cal-list]');
  if (list) {
    var html = '', month = '';
    upcoming.forEach(function (x) {
      var m = monthFmt.format(x.at);
      if (m !== month) { html += (month ? '</ol>' : '') + '<h3 class="cal-month">' + esc(m) + '</h3><ol class="cal-list">'; month = m; }
      html += row(x, false);
    });
    list.innerHTML = html + (month ? '</ol>' : '');
  }

  // this season so far, most recent first
  var done = root.querySelector('[data-cal-done]');
  if (done) {
    if (!past.length) done.hidden = true;
    else {
      var scored = past.filter(function (x) { return x.r.result; }).length;
      done.querySelector('summary').textContent = 'Results so far (' + past.length + ' round' + (past.length === 1 ? '' : 's') + (scored ? ', ' + scored + ' result' + (scored === 1 ? '' : 's') + ' in' : '') + ')';
      done.querySelector('ol').innerHTML = past.slice().reverse().map(function (x) { return row(x, true); }).join('');
    }
  }
})();
