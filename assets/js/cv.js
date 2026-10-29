/* Driver sheet: fills in this season, results by season and reach from the
   same data as the rest of the site (Z0.racing and Z0.reach), then sets
   window.Z0_CV_READY so the PDF maker knows it can print. */
(function () {
  'use strict';

  var R = window.Z0 && window.Z0.racing;
  var P = window.Z0_PROFILE || {};
  if (!R) return;
  var esc = R.esc;

  // the date on the sheet: today, as it's printed when results change
  var month = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', month: 'long', year: 'numeric' }).format(new Date());
  document.querySelectorAll('[data-cv-updated]').forEach(function (el) { el.textContent = month; });
  if (P.racingSince) document.querySelectorAll('[data-cv-since]').forEach(function (el) { el.textContent = P.racingSince; });

  var played = function (s) { return s.rounds.some(function (r) { return r.races.length; }); };
  var title = function (s) { return esc(s.league.name) + (s.name ? ' <em>' + esc(s.name) + '</em>' : ''); };

  /* ---------- this season ---------- */
  var now = document.querySelector('[data-cv-now]');
  if (now) {
    now.innerHTML = R.seasons.filter(function (s) { return s.current && played(s); }).map(function (s) {
      var sum = R.seasonSummary(s), m = sum.mate;
      return '<article><p class="sn-k">' + R.chipTeam(s.team || '', s.color) + '<span>' + esc(s.league.name) + (s.name ? ', ' + esc(s.name) : '') + '</span></p>' +
        (sum.line ? '<p class="sn-line">' + sum.line + '</p>' : '') +
        '<div class="form">' + R.form(s) + '</div>' +
        (m.n ? '<p class="sn-mate">Against my teammate: ahead in ' + m.race[0] + ' of ' + (m.race[0] + m.race[1]) + ' races, out-qualified them in ' + m.quali[0] + ' of ' + (m.quali[0] + m.quali[1]) + '.</p>' : '') +
        '</article>';
    }).join('');
  }

  /* ---------- earlier seasons (this season is above) ---------- */
  var list = document.querySelector('[data-cv-seasons]');
  if (list) {
    list.innerHTML = R.seasons.filter(function (s) { return played(s) && !s.current; }).sort(function (a, b) { return (b.current - a.current) || (a.order - b.order); }).map(function (s) {
      var st = R.statsOf(s.rounds), bits = [R.plural(st.starts, 'start')];
      if (st.best != null) bits.push('best P' + st.best);
      if (st.podiums) bits.push(R.plural(st.podiums, 'podium'));
      if (s.standing) bits.push(R.ordinal(s.standing) + ' overall');
      return '<li><p class="ss-t">' + (s.team ? R.chipTeam(s.team, s.color) : '') + '<span>' + title(s) + '</span></p>' +
        '<p class="ss-sum">' + esc(bits.join(', ')) + '</p>' +
        '<div class="form">' + R.form(s) + '</div>' +
        (s.note ? '<p class="ss-note">' + esc(s.note) + '</p>' : '') + '</li>';
    }).join('');
  }

  /* ---------- reach ---------- */
  var fmt = function (n) {
    if (n >= 1e6) return (n / 1e6).toFixed(n < 1e7 ? 2 : 1).replace(/\.?0+$/, '') + 'M';
    if (n >= 1000) return (n / 1000).toFixed(n < 1e4 ? 2 : 1).replace(/\.?0+$/, '') + 'K';
    return String(n);
  };
  function reach() {
    var box = document.querySelector('[data-cv-reach]');
    var chans = (window.Z0 && window.Z0.reach) || [];
    if (!box) return;
    box.innerHTML = chans.filter(function (c) { return c.count != null; }).map(function (c) {
      return '<li><b>' + esc(fmt(c.count)) + '</b><span>' + esc(c.name) + '</span><em>' + esc(c.count === 1 ? c.unit.replace(/s$/, '') : c.unit) + ', ' + esc(c.handle) + '</em></li>';
    }).join('');
  }
  reach();

  // wait for the live counts (or give up after a few seconds), then the fonts
  var done = false;
  function ready() {
    if (done) return;
    done = true;
    reach();
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(function () { window.Z0_CV_READY = true; });
  }
  document.addEventListener('z0:reach', ready);
  setTimeout(ready, 4000);

  /* ---------- small screens: shrink the page to fit ---------- */
  var sheet = document.querySelector('.sheet');
  function fit() {
    if (!sheet) return;
    sheet.style.zoom = '';
    var room = document.documentElement.clientWidth - 32;
    var w = sheet.offsetWidth;
    if (w > room) sheet.style.zoom = (room / w).toFixed(4);
  }
  fit();
  window.addEventListener('resize', fit);
})();
