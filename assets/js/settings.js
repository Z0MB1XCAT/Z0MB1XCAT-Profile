/* Settings on the Rig page, drawn from assets/data/settings.js: one tab per
   set, with a short note on why, grouped tables of values, pedal curves
   where given, and a button that copies the set as text for Discord. */
(function () {
  'use strict';

  var root = document.querySelector('[data-settings]');
  var data = window.Z0_SETTINGS;
  if (!root || !data) return;

  var esc = function (t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var cap = function (k) { return k.charAt(0).toUpperCase() + k.slice(1); };
  var groupsOf = function (s) {
    var g = (s.groups || []).slice();
    if (s.rows && s.rows.length) g.unshift({ title: '', rows: s.rows });
    if (s.common && data.common && data.common.rows) g.push({ title: data.common.title, rows: data.common.rows, note: data.common.note, shared: true });
    return g.filter(function (x) { return x.rows && x.rows.length; });
  };

  /* curves: pedals that share the same points are drawn as one line */
  function curveSeries(curves) {
    var out = [];
    Object.keys(curves || {}).forEach(function (k) {
      var pts = curves[k];
      if (!pts || pts.length !== 5) return;
      var same = out.filter(function (o) { return o.pts.join() === pts.join(); })[0];
      if (same) same.names.push(k); else out.push({ names: [k], pts: pts });
    });
    return out;
  }
  var COLORS = ['#3bbf74', '#e5242f', '#3d8fe0'];
  function nameList(names) {
    var n = names.map(function (x, i) { return i ? x : cap(x); });
    return n.length > 1 ? n.slice(0, -1).join(', ') + ' and ' + n[n.length - 1] : n[0];
  }

  var sets = (data.sets || []).filter(function (s) { return groupsOf(s).length || curveSeries(s.curves).length; });
  if (!sets.length) return;
  root.hidden = false;

  function curveSvg(series) {
    var W = 320, H = 210, L = 30, B = 26, T = 10, R = 10;
    var x = function (i) { return L + i / 5 * (W - L - R); };
    var y = function (v) { return H - B - v / 100 * (H - B - T); };
    var grid = [0, 20, 40, 60, 80, 100].map(function (v) {
      return '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text class="ylab" x="' + (L - 8) + '" y="' + (y(v) + 4) + '">' + v + '</text>';
    }).join('');
    var lines = series.map(function (s, k) {
      var c = COLORS[k % COLORS.length];
      var pts = [[x(0), y(0)]].concat(s.pts.map(function (v, i) { return [x(i + 1), y(v)]; }));
      return '<polyline points="' + pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') + '" style="stroke:' + c + '"/>' +
        pts.slice(1).map(function (p) { return '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="4" style="fill:' + c + '"/>'; }).join('');
    }).join('');
    var axis = [0, 20, 40, 60, 80, 100].map(function (v, i) { return '<text x="' + x(i) + '" y="' + (H - 6) + '">' + v + '</text>'; }).join('');
    var legend = series.map(function (s, k) { return '<span><i style="background:' + COLORS[k % COLORS.length] + '"></i>' + esc(nameList(s.names)) + '</span>'; }).join('');
    return '<figure class="set-curves"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Pedal curves: ' + esc(series.map(function (s) { return nameList(s.names) + ' ' + s.pts.join(', '); }).join('; ')) + '"><g class="grid">' + grid + '</g>' + lines + '<g class="axis">' + axis + '</g></svg>' +
      '<figcaption><span class="set-legend">' + legend + '</span>Output against pedal travel (%)</figcaption></figure>';
  }

  function asText(s) {
    var out = ['**' + s.title + '**' + (s.note ? ' (' + s.note + ')' : '')];
    groupsOf(s).forEach(function (g) {
      out.push('');
      if (g.title) out.push(g.title);
      g.rows.forEach(function (r) { out.push('- ' + r[0] + ': ' + r[1]); });
    });
    var cs = curveSeries(s.curves);
    if (cs.length) {
      out.push('', 'Pedal curves (output at 20/40/60/80/100% travel)');
      cs.forEach(function (c) { out.push('- ' + nameList(c.names) + ': ' + c.pts.join(' / ')); });
    }
    out.push('', 'z0mb1xcat.github.io/Z0MB1XCAT-Profile/rig.html#settings');
    return out.join('\n');
  }

  var tabs = root.querySelector('[data-set-tabs]');
  var panels = root.querySelector('[data-set-panels]');
  tabs.innerHTML = sets.map(function (s, i) {
    return '<button type="button" role="tab" id="set-tab-' + esc(s.id) + '" aria-controls="set-' + esc(s.id) + '" aria-selected="' + (i ? 'false' : 'true') + '" tabindex="' + (i ? '-1' : '0') + '">' + esc(s.title) + '</button>';
  }).join('');
  panels.innerHTML = sets.map(function (s, i) {
    var cs = curveSeries(s.curves);
    var groups = groupsOf(s).map(function (g) {
      return '<section class="set-group' + (g.shared ? ' is-shared' : '') + '">' + (g.title ? '<h3>' + esc(g.title) + '</h3>' : '') +
        '<dl class="set-list">' + g.rows.map(function (r) { return '<div><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>'; }).join('') + '</dl>' +
        (g.note ? '<p class="set-note">' + esc(g.note) + '</p>' : '') + '</section>';
    }).join('');
    if (cs.length) groups += '<section class="set-group"><h3>Pedal curves</h3>' + curveSvg(cs) + '</section>';
    return '<div class="set-panel" role="tabpanel" id="set-' + esc(s.id) + '" aria-labelledby="set-tab-' + esc(s.id) + '"' + (i ? ' hidden' : '') + '>' +
      '<div class="set-head"><div><p class="set-title display">' + esc(s.title) + '</p><p class="set-sub">' + esc(s.note || '') + '</p></div>' +
      '<button class="btn btn--line set-copy" type="button" data-copy="' + esc(s.id) + '">Copy for Discord</button></div>' +
      (s.blurb ? '<p class="set-blurb">' + esc(s.blurb) + '</p>' : '') +
      '<div class="set-groups">' + groups + '</div></div>';
  }).join('');

  var upd = root.querySelector('[data-set-updated]');
  if (upd && data.updated) {
    var d = new Date(data.updated + 'T12:00:00Z');
    upd.textContent = 'Last updated ' + (isNaN(d) ? data.updated : new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(d)) + '.';
  }

  // tabs: click, or arrow keys between them
  var btns = Array.prototype.slice.call(tabs.querySelectorAll('[role="tab"]'));
  function select(i, focus) {
    btns.forEach(function (b, k) {
      b.setAttribute('aria-selected', k === i ? 'true' : 'false');
      b.tabIndex = k === i ? 0 : -1;
      document.getElementById(b.getAttribute('aria-controls')).hidden = k !== i;
    });
    if (focus) btns[i].focus();
  }
  btns.forEach(function (b, i) {
    b.addEventListener('click', function () { select(i); });
    b.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); select((i + 1) % btns.length, true); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); select((i - 1 + btns.length) % btns.length, true); }
    });
  });

  panels.addEventListener('click', function (e) {
    var b = e.target.closest('[data-copy]');
    if (!b || !navigator.clipboard) return;
    var s = sets.filter(function (x) { return x.id === b.getAttribute('data-copy'); })[0];
    navigator.clipboard.writeText(asText(s)).then(function () {
      b.textContent = 'Copied';
      setTimeout(function () { b.textContent = 'Copy for Discord'; }, 1800);
    }, function () { b.textContent = 'Copy failed'; });
  });
})();
