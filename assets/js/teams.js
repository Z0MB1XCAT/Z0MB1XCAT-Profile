/* For teams page: partner slots from assets/data/partners.js, and enquiry
   links that open an email with the right subject and a few prompts. */
(function () {
  'use strict';

  var esc = function (t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var EMAIL = 'businessdexterrees@gmail.com';

  /* ---------- partners ---------- */
  var box = document.querySelector('[data-partners]');
  var P = window.Z0_PARTNERS;
  if (box && P) {
    var html = '';
    if (P.current && P.current.length) {
      html += '<ul class="partner-logos">' + P.current.map(function (p) {
        var inner = p.logo ? '<img src="' + esc(p.logo) + '" alt="' + esc(p.name) + '" loading="lazy">' : '<b class="display">' + esc(p.name) + '</b>';
        return '<li>' + (p.url ? '<a href="' + esc(p.url) + '">' + inner + '</a>' : inner) + (p.role ? '<span>' + esc(p.role) + '</span>' : '') + '</li>';
      }).join('') + '</ul>';
    }
    html += '<ol class="slots">' + (P.slots || []).map(function (s) {
      return '<li class="slot' + (s.open === false ? ' is-taken' : '') + '">' +
        '<p class="slot-k">' + (s.open === false ? 'Taken' : 'Open') + '</p>' +
        '<h3 class="display">' + esc(s.name) + '</h3>' +
        '<ul>' + (s.gets || []).map(function (g) { return '<li>' + esc(g) + '</li>'; }).join('') + '</ul></li>';
    }).join('') + '</ol>';
    box.innerHTML = html;
  }

  /* ---------- enquiries: subject plus a short template ---------- */
  var T = {
    seat: ['Team seat: Z0MB1XCAT', 'Team and league:\nSeat and car:\nRace nights (UK time):\nAnything else:'],
    sponsor: ['Sponsorship: Z0MB1XCAT', 'Company:\nWhat you have in mind:\nBudget or product:\nAnything else:'],
    league: ['League invite: Z0MB1XCAT', 'League:\nGame and platform:\nRace nights (UK time):\nAnything else:'],
    collab: ['Collab: Z0MB1XCAT', 'Who you are and where you post:\nThe idea:\nWhen:'],
  };
  document.querySelectorAll('[data-enquiry]').forEach(function (a) {
    var t = T[a.getAttribute('data-enquiry')];
    if (!t) return;
    a.href = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent(t[0]) + '&body=' + encodeURIComponent('Hi,\n\n' + t[1] + '\n\nThanks,\n');
  });
})();
