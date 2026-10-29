/* Live page: real live status from Twitch, otherwise a countdown to the
   next scheduled stream, in UK time and the visitor's own. */
(function () {
  'use strict';

  var st = document.querySelector('[data-status]');
  var Z0 = window.Z0;
  if (!st || !Z0) return;

  var line = st.querySelector('[data-status-line]');
  var local = st.querySelector('[data-status-local]');
  var dEl = st.querySelector('[data-c-d]'), hEl = st.querySelector('[data-c-h]'), mEl = st.querySelector('[data-c-m]');
  var inUK = false;
  try { inUK = Intl.DateTimeFormat().resolvedOptions().timeZone === 'Europe/London'; } catch (e) { inUK = false; }
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };

  function tick() {
    var s = Z0.status();
    if (s.live) {
      st.classList.add('is-live');
      line.textContent = s.live.slot.title
        ? 'On Twitch now: ' + s.live.slot.title + '.'
        : 'On Twitch now.';
      local.textContent = s.live.uptime ? 'Live for ' + s.live.uptime + '.' : '';
      return;
    }
    st.classList.remove('is-live');
    var secs = Math.max(0, s.next.until * 60 - s.now.secs);
    dEl.textContent = Math.floor(secs / 86400);
    hEl.textContent = pad(Math.floor(secs % 86400 / 3600));
    mEl.textContent = pad(Math.floor(secs % 3600 / 60));
    line.textContent = 'Next up: ' + (s.next.slot.title || s.next.slot.game) + ', ' + Z0.dayWord(s) + ' at ' + s.next.slot.start + ' UK time.';
    local.textContent = inUK ? '' : 'That\'s ' + Z0.localTime(s.next.until) + ' where you are.';
  }
  tick();
  document.addEventListener('z0:status', tick);
  setInterval(tick, 15000);
})();
