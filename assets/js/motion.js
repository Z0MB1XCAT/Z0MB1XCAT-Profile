/* Site-wide motion. Everything here is decoration on top of content that is
   already visible: with no JavaScript, or with reduced motion requested,
   none of it runs and nothing is hidden. Only transform and opacity move. */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || !('IntersectionObserver' in window)) return;
  var html = document.documentElement;
  html.classList.add('motion');

  var io = new IntersectionObserver(function (es) {
    es.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: .05 });

  /* split text into masked words (or letters) that rise into place */
  function split(el, mode) {
    if (el.dataset.split) return;
    el.dataset.split = mode;
    var i = 0;
    var walk = function (node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (c) {
        if (c.nodeType === 3) {
          var parts = mode === 'chars' ? c.textContent.split('') : c.textContent.split(/(\s+)/);
          var frag = document.createDocumentFragment();
          parts.forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
            var m = document.createElement('span'); m.className = 'wm';
            var w = document.createElement('span'); w.className = 'wi'; w.textContent = p;
            w.style.setProperty('--i', i++);
            m.appendChild(w); frag.appendChild(m);
          });
          c.replaceWith(frag);
        } else if (c.nodeType === 1 && c.classList.contains('z0')) {
          // keep the slashed zero whole
          var m2 = document.createElement('span'); m2.className = 'wm';
          var w2 = document.createElement('span'); w2.className = 'wi';
          w2.style.setProperty('--i', i++);
          c.replaceWith(m2); w2.appendChild(c); m2.appendChild(w2);
        } else if (c.nodeType === 1 && c.tagName !== 'BR' && !c.classList.contains('sr-only')) {
          walk(c);
        }
      });
    };
    walk(el);
    el.style.setProperty('--n', i);
  }

  document.querySelectorAll('.h2.display, .pagehead .h1, .lost .h1').forEach(function (el) {
    split(el, 'words');
    io.observe(el);
  });
  document.querySelectorAll('.foot-big').forEach(function (el) { split(el, 'chars'); io.observe(el); });

  /* hero wordmark: letters rise as the page opens */
  var heroName = document.querySelector('.hero-name [aria-hidden="true"]');
  if (heroName) {
    split(heroName, 'chars');
    var heroGo = function () { document.querySelector('.hero').classList.add('is-in'); };
    setTimeout(heroGo, 120);
  }

  /* lists and tables: children rise one after another */
  var lists = '.results tbody, .teams, .leagues, .specs, .goals, .week, .facts, .profile, .meter-list, .sims, .channels, .wish, .traits, .favs, .parts, .board-rows';
  document.querySelectorAll(lists).forEach(function (list) {
    list.classList.add('stg');
    Array.prototype.forEach.call(list.children, function (c, k) { c.style.setProperty('--i', Math.min(k, 10)); });
    io.observe(list);
  });
  // the week list is drawn by site.js and redrawn every 30 s; re-index it when it changes
  document.querySelectorAll('[data-week]').forEach(function (list) {
    new MutationObserver(function () {
      Array.prototype.forEach.call(list.children, function (c, k) { c.style.setProperty('--i', k); });
    }).observe(list, { childList: true });
  });

  /* photos: a paper wipe lifts while the picture settles from a slight zoom */
  document.querySelectorAll('.ph, .band').forEach(function (el) {
    if (el.classList.contains('ph')) {
      var cover = document.createElement('i'); cover.className = 'wipe'; el.appendChild(cover);
    }
    io.observe(el);
  });

  /* marquee: drifts on its own, speeds up and turns with the scroll */
  document.querySelectorAll('[data-marquee]').forEach(function (mq) {
    var track = mq.querySelector('.mq-track');
    var x = 0, dir = -1, boost = 0, lastY = window.scrollY, visible = false, last = 0;
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) { last = 0; requestAnimationFrame(step); } }).observe(mq);
    window.addEventListener('scroll', function () {
      var dy = window.scrollY - lastY; lastY = window.scrollY;
      if (dy) dir = dy > 0 ? -1 : 1;
      boost = Math.min(18, boost + Math.abs(dy) * .06);
    }, { passive: true });
    function step(now) {
      if (!visible) return;
      var dt = last ? Math.min(.05, (now - last) / 1000) : 0; last = now;
      boost *= .92;
      x += dir * (40 + boost * 40) * dt;
      var w = track.scrollWidth / 2;
      if (x < -w) x += w; if (x > 0) x -= w;
      track.style.transform = 'translate3d(' + x.toFixed(1) + 'px,0,0)';
      requestAnimationFrame(step);
    }
  });

  /* magnetic buttons on precise pointers */
  if (window.matchMedia('(pointer: fine)').matches) {
    document.querySelectorAll('.btn--accent, .btn--ink, .next-card, .nav-menu').forEach(function (b) {
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        var dx = (e.clientX - r.left - r.width / 2) / r.width, dy = (e.clientY - r.top - r.height / 2) / r.height;
        b.style.translate = (dx * 10).toFixed(1) + 'px ' + (dy * 8).toFixed(1) + 'px';
      });
      b.addEventListener('pointerleave', function () { b.style.translate = ''; });
    });
  }
})();
