/* Racing: every league, season, round and result from
   assets/data/racing.js, turned into the calendar, the results history and
   the stats used across the site.

   Z0.racing holds the tidied-up data and the career stats, for other
   scripts (the driver sheet uses it). Elements ask for what they want:
     [data-stat="podiums"]  one number from the career stats (see STATS)
     [data-stat-line]       a sentence about the career so far
     [data-latest-results]  a table body: the most recent rounds
     [data-seasons-now]     the current seasons: standing, form, teammate
     [data-history]         every season and every result
     [data-next-race]       the next round (home page)
     [data-calendar]        the live page calendar */
(function () {
  'use strict';

  var D = window.Z0_RACING;
  if (!D) return;
  var Z0 = (window.Z0 = window.Z0 || {});
  var P = window.Z0_PROFILE || {};

  var TEAM_COLORS = { Alpine: '#2293d1', McLaren: '#ff8000', Williams: '#64c4ff', 'Mackles Racing': '#8452a1' };
  var esc = function (t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var plural = function (n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); };
  var ordinal = function (n) { var s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };

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

  /* 'P3', '3', 'DNF', 'DNS' -> { pos, status, text } */
  function parseOne(s) {
    s = String(s == null ? '' : s).trim().toUpperCase();
    if (!s) return null;
    var m = /^P?(\d+)$/.exec(s);
    if (m) return { pos: +m[1], status: '', text: 'P' + m[1] };
    return { pos: null, status: s, text: s };
  }
  function parseResult(r) {
    if (r == null || r === '') return [];
    return String(r).split(/\s*[·•\/|]\s*/).map(parseOne).filter(Boolean);
  }

  /* ---------- tidy the data ---------- */
  var seasons = [], rounds = [];
  (D.leagues || []).forEach(function (lg, li) {
    var labels = lg.races || [''];
    (lg.seasons || []).forEach(function (s, si) {
      var team = s.team || lg.team || '';
      var season = {
        league: lg, name: s.name || '', team: team, order: li * 100 + si,
        color: s.color || TEAM_COLORS[team] || lg.color || '#847d8c',
        current: !!s.current, note: s.note || '', standing: s.standing || null, rounds: [],
      };
      var list = (s.rounds || []).slice();
      if (s.raw) String(s.raw).trim().split(/\s+/).forEach(function (r, i) { list.push({ round: i + 1, result: r }); });
      list.forEach(function (r0) {
        var time = r0.time || s.time || lg.time || '';
        var races = parseResult(r0.result).map(function (x, k) { x.label = labels.length > 1 ? (labels[k] || '') : ''; return x; });
        var r = {
          season: season, round: r0.round || null, track: r0.track || '', country: r0.country || '',
          date: r0.date || '', time: time, tag: r0.tag || '', races: races,
          grid: r0.grid == null ? null : r0.grid, pole: r0.pole != null ? !!r0.pole : r0.grid === 1,
          points: r0.points == null ? null : r0.points, note: r0.note || '',
          mate: r0.mate ? { grid: r0.mate.grid == null ? null : r0.mate.grid, race: parseOne(r0.mate.pos) } : null,
        };
        if (r.date) {
          r.at = londonTime(r.date, time);
          // "next" until three hours after a timed start, or the end of an untimed day
          r.over = time ? r.at.getTime() + 3 * 3600e3 : londonTime(r.date).getTime() + 24 * 3600e3;
        }
        season.rounds.push(r);
        rounds.push(r);
      });
      seasons.push(season);
    });
  });

  /* ---------- stats ---------- */
  function statsOf(list) {
    var s = { entries: 0, starts: 0, finishes: 0, wins: 0, podiums: 0, reversePodiums: 0, top5: 0, top10: 0, dnf: 0, poles: 0, sum: 0, best: null, bestAt: null, points: 0, pointsKnown: true, rounds: 0 };
    list.forEach(function (r) {
      if (!r.races.length) return;
      s.rounds++;
      if (r.pole) s.poles++;
      if (r.points == null) s.pointsKnown = false; else s.points += r.points;
      r.races.forEach(function (x) {
        s.entries++;
        if (x.status === 'DNS') return;
        s.starts++;
        if (x.pos == null) { s.dnf++; return; }
        s.finishes++;
        s.sum += x.pos;
        if (x.pos === 1) s.wins++;
        if (x.pos <= 3) { s.podiums++; if (/reverse/i.test(x.label)) s.reversePodiums++; }
        if (x.pos <= 5) s.top5++;
        if (x.pos <= 10) s.top10++;
        if (s.best == null || x.pos < s.best) { s.best = x.pos; s.bestAt = r; }
      });
    });
    s.avg = s.finishes ? s.sum / s.finishes : null;
    s.finishRate = s.starts ? s.finishes / s.starts : null;
    s.mainPodiums = s.podiums - s.reversePodiums;
    return s;
  }

  // head-to-head against my teammate, where their result is known
  function h2h(list) {
    var o = { race: [0, 0], quali: [0, 0], n: 0 };
    list.forEach(function (r) {
      if (!r.mate) return;
      o.n++;
      var me = r.races[0], them = r.mate.race;
      if (me && them) {
        var a = me.pos == null ? 999 : me.pos, b = them.pos == null ? 999 : them.pos;
        if (a < b) o.race[0]++; else if (b < a) o.race[1]++;
      }
      if (r.grid != null && r.mate.grid != null) { if (r.grid < r.mate.grid) o.quali[0]++; else o.quali[1]++; }
    });
    return o;
  }

  var done = rounds.filter(function (r) { return r.races.length; });
  var career = statsOf(done);
  var leaguesRaced = (D.leagues || []).filter(function (lg) { return seasons.some(function (s) { return s.league === lg && s.rounds.some(function (r) { return r.races.length; }); }); }).length;

  var STATS = {
    starts: career.starts, podiums: career.podiums, wins: career.wins, top5: career.top5, top10: career.top10,
    poles: career.poles, dnf: career.dnf, reversePodiums: career.reversePodiums, mainPodiums: career.mainPodiums,
    avg: career.avg == null ? '' : career.avg.toFixed(1),
    best: career.best == null ? '' : 'P' + career.best,
    finishRate: career.finishRate == null ? '' : Math.round(career.finishRate * 100) + '%',
    top10Rate: career.finishes ? Math.round(career.top10 / career.finishes * 100) + '%' : '',
    seasons: seasons.filter(function (s) { return s.rounds.some(function (r) { return r.races.length; }); }).length,
    leagues: leaguesRaced,
    irating: P.irating ? P.irating.value : '',
  };

  /* ---------- formatting ---------- */
  var dayFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', weekday: 'short', day: 'numeric', month: 'short' });
  var shortFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'short' });
  var longFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', weekday: 'long', day: 'numeric', month: 'long' });
  var monthFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', month: 'long', year: 'numeric' });
  var dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' });
  var localFmt = new Intl.DateTimeFormat(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  var inUK = false;
  try { inUK = Intl.DateTimeFormat().resolvedOptions().timeZone === 'Europe/London'; } catch (e) { inUK = false; }

  var flag = function (c) { return c ? '<img src="assets/img/flags/' + esc(c) + '.svg" alt="" width="28" height="19" loading="lazy">' : ''; };
  var chipTeam = function (name, color) { return '<span class="team"><i style="--c:' + esc(color) + '"></i>' + esc(name) + '</span>'; };
  var tag = function (r) { return r.tag ? '<span class="cal-tag">' + esc(r.tag) + '</span>' : ''; };
  var seasonName = function (s) { return s.league.name + (s.name ? ', ' + s.name.toLowerCase() : ''); };
  var place = function (r) { return r.track || (r.round ? 'Round ' + r.round : ''); };

  // a finishing position as a small coloured chip
  function chip(x, title) {
    var cls = x.pos == null ? (x.status === 'DNS' ? 'dns' : 'dnf') : x.pos === 1 ? 'win' : x.pos <= 3 ? 'pod' : x.pos <= 10 ? 'pts' : 'out';
    return '<span class="chip chip--' + cls + '" title="' + esc(title || x.text) + '">' + esc(x.pos == null ? x.status : x.pos) + '</span>';
  }
  // the result of a round in the display face: 'P3', or 'P8 P3' with race labels
  function resultCell(r) {
    if (!r.races.length) return '';
    if (r.races.length === 1) return '<span class="res">' + esc(r.races[0].text) + '</span>';
    return '<span class="res-split">' + r.races.map(function (x) {
      return '<span><b>' + esc(x.text) + '</b><em>' + esc(x.label.replace(/ grid$/i, '')) + '</em></span>';
    }).join('') + '</span>';
  }
  // "Pole" as a badge, then "Started P4. Hit by another car during the race."
  function notes(r) {
    var bits = [];
    if (r.grid != null && !r.pole) bits.push('Started P' + r.grid);
    if (r.note) bits.push(esc(r.note.replace(/\.\s*$/, '')));
    return (r.pole ? '<span class="badge">Pole</span>' : '') + (bits.length ? bits.join('. ') + '.' : '');
  }

  /* ---------- [data-stat] and [data-stat-line] ---------- */
  document.querySelectorAll('[data-stat]').forEach(function (el) {
    var v = STATS[el.getAttribute('data-stat')];
    if (v !== undefined && v !== '') el.textContent = v;
  });
  document.querySelectorAll('[data-stat-line]').forEach(function (el) {
    var c = career;
    el.textContent = c.wins
      ? plural(c.wins, 'win') + ' and ' + plural(c.podiums, 'podium') + ' from ' + plural(c.starts, 'start') + '. More to come.'
      : plural(c.podiums, 'podium') + ' from ' + plural(c.starts, 'start') + ', and no win yet. That\'s the one I\'m after.';
  });

  /* ---------- [data-latest-results]: the most recent rounds ---------- */
  document.querySelectorAll('[data-latest-results]').forEach(function (tb) {
    var n = +tb.getAttribute('data-latest-results') || 5;
    var list = done.filter(function (r) { return r.at; }).sort(function (a, b) { return b.at - a.at; }).slice(0, n);
    tb.innerHTML = list.map(function (r) {
      return '<tr><td class="r-pos">' + resultCell(r) + '</td>' +
        '<td class="r-race">' + flag(r.country) + esc(place(r)) + '<em>' + esc(shortFmt.format(r.at)) + '</em></td>' +
        '<td>' + esc(r.season.league.name) + (r.round ? '<em>Round ' + esc(r.round) + '</em>' : '') + '</td>' +
        '<td>' + chipTeam(r.season.team || r.season.league.name, r.season.color) + (notes(r) ? '<em>' + notes(r) + '</em>' : '') + '</td></tr>';
    }).join('');
  });

  /* ---------- [data-seasons-now]: standing, form and teammate ---------- */
  function seasonSummary(s) {
    var st = statsOf(s.rounds), mate = h2h(s.rounds), bits = [];
    if (s.standing) bits.push('<b>' + ordinal(s.standing) + '</b> in the championship');
    if (st.pointsKnown && st.rounds) bits.push('<b>' + st.points + '</b> points after ' + plural(st.rounds, 'round'));
    if (st.podiums) bits.push('<b>' + st.podiums + '</b> ' + (st.podiums === 1 ? 'podium' : 'podiums'));
    if (st.poles) bits.push('<b>' + st.poles + '</b> ' + (st.poles === 1 ? 'pole' : 'poles'));
    return { stats: st, mate: mate, line: bits.join('<span class="sep"></span>') };
  }
  function form(s) {
    return s.rounds.filter(function (r) { return r.races.length; }).map(function (r) {
      return '<span class="form-round" title="' + esc((r.round ? 'Round ' + r.round + ', ' : '') + place(r)) + '">' +
        r.races.map(function (x) { return chip(x, (r.round ? 'R' + r.round + ' ' : '') + place(r) + (x.label ? ' ' + x.label.toLowerCase() : '') + ': ' + x.text); }).join('') + '</span>';
    }).join('');
  }
  document.querySelectorAll('[data-seasons-now]').forEach(function (box) {
    var list = seasons.filter(function (s) { return s.current && s.rounds.some(function (r) { return r.races.length; }); });
    box.innerHTML = list.map(function (s) {
      var sum = seasonSummary(s);
      var m = sum.mate;
      var mateLine = m.n ? '<p class="sn-mate">Against my teammate: ahead in ' + m.race[0] + ' of ' + (m.race[0] + m.race[1]) + ' races, and out-qualified them in ' + m.quali[0] + ' of ' + (m.quali[0] + m.quali[1]) + '.</p>' : '';
      return '<article class="sn">' +
        '<header class="sn-head"><p class="sn-k">' + chipTeam(s.team || '', s.color) + '<span>' + esc(s.league.name) + (s.name ? ', ' + esc(s.name) : '') + '</span></p>' +
        (sum.line ? '<p class="sn-line">' + sum.line + '</p>' : '') + '</header>' +
        '<div class="form" aria-label="Results this season">' + form(s) + '</div>' + mateLine + '</article>';
    }).join('');
  });

  /* ---------- [data-history]: every season, every result ---------- */
  document.querySelectorAll('[data-history]').forEach(function (box) {
    var list = seasons.filter(function (s) { return s.rounds.some(function (r) { return r.races.length; }); })
      .sort(function (a, b) { return (b.current - a.current) || (a.order - b.order); });
    var html = list.map(function (s) {
      var st = statsOf(s.rounds);
      var played = s.rounds.filter(function (r) { return r.races.length; });
      var meta = [plural(st.starts, 'start')];
      if (st.best != null) meta.push('best P' + st.best);
      if (st.podiums) meta.push(plural(st.podiums, 'podium'));
      if (st.avg != null) meta.push('average P' + st.avg.toFixed(1));
      if (s.standing) meta.push(ordinal(s.standing) + ' overall');
      return '<details class="hist"' + (s.current ? ' open' : '') + '><summary>' +
        '<span class="hist-t">' + esc(s.league.name) + (s.name ? '<em>' + esc(s.name) + (s.current ? ', this season' : '') + '</em>' : '') + '</span>' +
        (s.team ? chipTeam(s.team, s.color) : '<span></span>') +
        '<span class="hist-meta">' + esc(meta.join(', ')) + '</span></summary>' +
        (s.note ? '<p class="hist-note">' + esc(s.note) + '</p>' : '') +
        '<table class="hist-table"><thead><tr><th scope="col">Round</th><th scope="col">Result</th><th scope="col">Notes</th></tr></thead><tbody>' +
        played.map(function (r) {
          return '<tr><td class="h-round">' + flag(r.country) + '<span>' + esc(place(r)) + (r.track && r.round ? '<em>Round ' + esc(r.round) + (r.at ? ', ' + esc(shortFmt.format(r.at)) : '') + '</em>' : '') + '</span></td>' +
            '<td class="h-res">' + resultCell(r) + '</td><td class="h-note">' + notes(r) + (r.points != null ? '<em>' + plural(r.points, 'point') + '</em>' : '') + '</td></tr>';
        }).join('') + '</tbody></table></details>';
    }).join('');
    var ev = (D.events || []);
    if (ev.length) {
      html += '<div class="hist-events"><h3>Endurance and one-offs</h3><ul>' + ev.map(function (e) {
        return '<li><b class="display">' + esc(e.result || '') + '</b><span>' + esc(e.name) + '<em>' + esc(e.detail || '') + '</em></span></li>';
      }).join('') + '</ul></div>';
    }
    box.innerHTML = html;
  });

  /* ---------- calendar: the rounds of the current seasons ---------- */
  var cal = rounds.filter(function (r) { return r.season.current && r.date; }).sort(function (a, b) { return a.at - b.at; });
  var now = Date.now();
  var upcoming = cal.filter(function (r) { return r.over > now; });
  var past = cal.filter(function (r) { return r.over <= now; });
  var next = upcoming[0] || null;

  function daysUntil(r) {
    var a = new Date(dayKey.format(new Date()) + 'T00:00:00Z'), b = new Date(r.date + 'T00:00:00Z');
    return Math.round((b - a) / 86400e3);
  }
  function dayWords(n) { return n <= 0 ? 'Race day today' : n === 1 ? 'Race day tomorrow' : 'In ' + n + ' days'; }

  document.querySelectorAll('[data-next-race]').forEach(function (el) {
    if (!next) return;
    el.hidden = false;
    el.querySelector('[data-nr-track]').innerHTML = flag(next.country) + esc(next.track) + tag(next);
    el.querySelector('[data-nr-meta]').innerHTML = chipTeam(next.season.league.name, next.season.color) + '<span>' + esc(dayFmt.format(next.at)) +
      (next.time ? ', ' + esc(next.time) + ' UK' : '') + '</span>';
    el.querySelector('[data-nr-when]').textContent = dayWords(daysUntil(next));
  });

  var root = document.querySelector('[data-calendar]');
  if (root && cal.length) {
    root.hidden = false;

    // leagues without a published calendar, as one line each
    var also = root.querySelector('[data-cal-also]');
    var unlisted = (D.leagues || []).filter(function (lg) { return lg.schedule && !seasons.some(function (s) { return s.league === lg && s.current; }); });
    if (also && unlisted.length) {
      also.hidden = false;
      also.innerHTML = unlisted.map(function (lg) {
        return '<p>' + chipTeam(lg.name, TEAM_COLORS[lg.team] || lg.color || '#847d8c') + '<span>' + esc(lg.team ? lg.team + '. ' : '') + esc(lg.schedule) + '.</span></p>';
      }).join('');
    }

    var nextEl = root.querySelector('[data-cal-next]');
    if (next && nextEl) {
      var where = seasonName(next.season) + (next.round ? ', round ' + next.round : '');
      nextEl.innerHTML =
        '<p class="cal-k">' + chipTeam(next.season.team || next.season.league.name, next.season.color) + esc(where) + tag(next) + '</p>' +
        '<p class="cal-track display">' + flag(next.country) + esc(next.track) + '</p>' +
        '<p class="cal-when">' + esc(longFmt.format(next.at)) + (next.time ? ', ' + esc(next.time) + ' UK' : '') +
          (next.time && !inUK ? '<span>' + esc(localFmt.format(next.at)) + ' where you are</span>' : '') +
          (next.time ? '' : '<span>Start time to be confirmed</span>') + '</p>' +
        (next.time
          ? '<div class="cal-count num" aria-hidden="true"><div><b data-cc-d>0</b><span>days</span></div><div><b data-cc-h>00</b><span>hours</span></div><div><b data-cc-m>00</b><span>minutes</span></div></div>'
          : '<p class="cal-on">' + esc(dayWords(daysUntil(next))) + '</p>');
      if (next.time) {
        var tick = function () {
          var sec = Math.max(0, Math.round((next.at.getTime() - Date.now()) / 1000));
          var c = nextEl.querySelector('.cal-count');
          if (!c) return;
          if (sec === 0) { c.outerHTML = '<p class="cal-on">Racing now</p>'; return; }
          nextEl.querySelector('[data-cc-d]').textContent = Math.floor(sec / 86400);
          nextEl.querySelector('[data-cc-h]').textContent = pad(Math.floor(sec % 86400 / 3600));
          nextEl.querySelector('[data-cc-m]').textContent = pad(Math.floor(sec % 3600 / 60));
        };
        tick();
        setInterval(tick, 20000);
      }
    } else if (nextEl) {
      nextEl.innerHTML = '<p class="cal-k">No more rounds on the calendar yet.</p>';
    }

    var row = function (r, isPast) {
      return '<li class="' + (r === next ? 'is-next' : '') + '">' +
        '<span class="cl-date">' + esc(dayFmt.format(r.at)) + '<em>' + (r.time ? esc(r.time) + ' UK' : (isPast ? '' : 'Time TBC')) + '</em></span>' +
        '<span class="cl-track">' + flag(r.country) + '<span>' + esc(r.track) + tag(r) + '</span></span>' +
        '<span class="cl-lg">' + chipTeam(r.season.league.name, r.season.color) + (r.round ? '<em>Round ' + esc(r.round) + '</em>' : '') + '</span>' +
        '<span class="cl-res display">' + esc(r.races.map(function (x) { return x.text; }).join(' / ')) + '</span></li>';
    };

    // the rounds still to come, under a heading for each month
    var listEl = root.querySelector('[data-cal-list]');
    if (listEl) {
      var html = '', month = '';
      upcoming.forEach(function (r) {
        var m = monthFmt.format(r.at);
        if (m !== month) { html += (month ? '</ol>' : '') + '<h3 class="cal-month">' + esc(m) + '</h3><ol class="cal-list">'; month = m; }
        html += row(r, false);
      });
      listEl.innerHTML = html + (month ? '</ol>' : '');
    }

    // this season so far, most recent first
    var doneEl = root.querySelector('[data-cal-done]');
    if (doneEl) {
      if (!past.length) doneEl.hidden = true;
      else {
        var scored = past.filter(function (r) { return r.races.length; }).length;
        doneEl.querySelector('summary').textContent = 'This season so far (' + plural(past.length, 'round') + (scored ? ', ' + scored + ' with results' : '') + ')';
        doneEl.querySelector('ol').innerHTML = past.slice().reverse().map(function (r) { return row(r, true); }).join('');
      }
    }
  }

  Z0.racing = {
    data: D, seasons: seasons, rounds: rounds, career: career, stats: STATS,
    statsOf: statsOf, h2h: h2h, seasonSummary: seasonSummary, form: form, chip: chip,
    resultCell: resultCell, place: place, flag: flag, chipTeam: chipTeam, ordinal: ordinal, plural: plural,
    next: next, upcoming: upcoming, esc: esc,
  };
  document.dispatchEvent(new CustomEvent('z0:racing'));
})();
