/* Channel reach: the counts in assets/data/profile.js, with Twitch
   followers and Discord members fetched live (decapi.me for Twitch, the
   public invite for Discord). Answers are kept for ten minutes per visit.
     [data-reach]                  a list of every channel with its count
     [data-reach-count="twitch"]   one count with its unit, e.g. "30 followers"
     [data-reach-updated]          a line saying which counts are live */
(function () {
  'use strict';

  var P = window.Z0_PROFILE;
  if (!P || !P.channels) return;
  var Z0 = (window.Z0 = window.Z0 || {});
  var KEY = 'z0-reach';
  var esc = function (t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var chans = P.channels.map(function (c) { return Object.assign({}, c, { isLive: false }); });
  var byId = function (id) { return chans.filter(function (c) { return c.id === id; })[0]; };

  // 30 -> "30", 1930 -> "1.93K", 23882 -> "23.9K"
  function fmt(n) {
    if (n == null || isNaN(n)) return '';
    if (n >= 1e6) return (n / 1e6).toFixed(n < 1e7 ? 2 : 1).replace(/\.?0+$/, '') + 'M';
    if (n >= 1000) return (n / 1000).toFixed(n < 1e4 ? 2 : 1).replace(/\.?0+$/, '') + 'K';
    return String(n);
  }
  var unit = function (c) { return c.count === 1 ? c.unit.replace(/s$/, '') : c.unit; };

  function paint() {
    document.querySelectorAll('[data-reach-count]').forEach(function (el) {
      var c = byId(el.getAttribute('data-reach-count'));
      el.textContent = c && c.count != null ? fmt(c.count) + ' ' + unit(c) : '';
    });
    document.querySelectorAll('[data-reach]').forEach(function (list) {
      list.innerHTML = chans.filter(function (c) { return c.count != null; }).map(function (c) {
        return '<li><a href="' + esc(c.url) + '">' +
          '<span class="rc-n">' + esc(c.name) + (c.isLive ? '<i class="rc-live" title="Updated live"></i>' : '') + '</span>' +
          '<b class="rc-c display">' + esc(fmt(c.count)) + '</b>' +
          '<span class="rc-u">' + esc(unit(c)) + (c.extra ? ', ' + esc(fmt(c.extra.count)) + ' ' + esc(c.extra.unit) : '') + '</span>' +
          '<span class="rc-h">' + esc(c.handle) + '</span></a></li>';
      }).join('');
    });
    var fixed = chans.filter(function (c) { return !c.live && c.count != null; }).map(function (c) { return c.name; });
    var live = chans.filter(function (c) { return c.isLive; }).map(function (c) { return c.name; });
    var d = new Date((P.updated || '') + 'T12:00:00Z');
    var when = isNaN(d) ? '' : new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
    document.querySelectorAll('[data-reach-updated]').forEach(function (el) {
      el.textContent = (live.length ? live.join(' and ') + ' update live. ' : '') + (fixed.length && when ? fixed.join(' and ') + ' as of ' + when + '.' : '');
    });
  }

  function apply(got) {
    Object.keys(got).forEach(function (id) {
      var c = byId(id);
      if (c && typeof got[id] === 'number' && got[id] >= 0) { c.count = got[id]; c.isLive = true; }
    });
    paint();
    Z0.reach = chans;
    document.dispatchEvent(new CustomEvent('z0:reach'));
  }

  paint();
  Z0.reach = chans;

  var cached = null;
  try { cached = JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch (e) { cached = null; }
  if (cached && Date.now() - cached.at < 600e3) { apply(cached.got); return; }
  if (!window.fetch) return;

  var got = {};
  var jobs = [];
  if (byId('twitch') && byId('twitch').live) {
    jobs.push(fetch('https://decapi.me/twitch/followcount/' + encodeURIComponent(byId('twitch').handle))
      .then(function (r) { return r.ok ? r.text() : Promise.reject(r.status); })
      .then(function (t) { var n = parseInt(String(t).trim(), 10); if (!isNaN(n)) got.twitch = n; })
      .catch(function () {}));
  }
  var dc = byId('discord');
  var invite = dc && dc.live && /discord\.gg\/([\w-]+)/.exec(dc.url || '');
  if (invite) {
    jobs.push(fetch('https://discord.com/api/v9/invites/' + invite[1] + '?with_counts=true')
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (j) { if (j && typeof j.approximate_member_count === 'number') got.discord = j.approximate_member_count; })
      .catch(function () {}));
  }
  Promise.all(jobs).then(function () {
    try { sessionStorage.setItem(KEY, JSON.stringify({ at: Date.now(), got: got })); } catch (e) { /* private mode */ }
    apply(got);
  });
})();
