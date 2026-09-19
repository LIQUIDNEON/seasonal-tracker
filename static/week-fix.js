(function () {
  function localKey(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function weekStart(off) {
    const wantSun = (state.settings.weekStart || 'sunday') !== 'monday';
    const now = new Date();
    const startWeekday = wantSun ? 0 : 1;
    const daysSince = (now.getDay() - startWeekday + 7) % 7;
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSince);
    start.setDate(start.getDate() + (Number(off) || 0) * 7);
    return start;
  }
  function fmtDay(d) {
    return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  }
  function rangeLabel(off) {
    const s = weekStart(off);
    const e = new Date(s.getFullYear(), s.getMonth(), s.getDate() + 6);
    const short = function (d) {
      return d.getDate() + ' ' + d.toLocaleDateString(undefined, { month: 'short' });
    };
    return short(s) + ' – ' + short(e);
  }
  function jstDay(at) {
    const d = new Date(at);
    if (Number.isNaN(d.getTime())) return null;
    try {
      const name = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tokyo', weekday: 'short' }).format(d);
      return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(name);
    } catch (e) {
      return d.getDay();
    }
  }
  function showDow(show) {
    const samples = [].concat(show.nextEvents || [], show.upcomingSub || []);
    if (show.nextSubAt) samples.unshift({ at: show.nextSubAt });
    if (show.focus && show.focus.at) samples.unshift(show.focus);
    for (let i = 0; i < samples.length; i += 1) {
      if (samples[i] && samples[i].at) {
        const d = jstDay(samples[i].at);
        if (d != null && d >= 0) return d;
      }
    }
    if (show.airDow != null && show.airDow !== '') return Number(show.airDow);
    return null;
  }
  function findShow(id) {
    const lib = state.library || [];
    let hit = lib.find(function (s) { return String(s.id) === String(id); });
    if (hit) return hit;
    const days = (state.schedule && state.schedule.days) || [];
    for (let i = 0; i < days.length; i += 1) {
      hit = (days[i].shows || []).find(function (s) { return String(s.id) === String(id); });
      if (hit) return hit;
    }
    return null;
  }

  function relabelSeatRotate() {
    const strip = document.querySelector('.week-strip');
    if (!strip) return;
    const off = Number(state.weekOffset || 0);
    const start = weekStart(off);
    const cols = [].slice.call(strip.querySelectorAll('.day-col'));
    if (!cols.length) return;

    const template = cols[0];
    const byDow = {};
    cols.forEach(function (col) {
      const cards = [].slice.call(col.querySelectorAll('[data-sid]'));
      let dow = null;
      if (cards[0]) {
        const show = findShow(cards[0].dataset.sid);
        if (show) dow = showDow(show);
      }
      if (dow == null && col.dataset.date) {
        const d = new Date(col.dataset.date + 'T12:00:00');
        if (!Number.isNaN(d.getTime())) dow = d.getDay();
      }
      if (dow != null && !byDow[dow]) byDow[dow] = col;
    });

    const ordered = [];
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const dow = d.getDay();
      let col = byDow[dow];
      if (!col) {
        col = document.createElement('section');
        col.className = template.className || 'day-col';
        col.innerHTML = '<h3><span></span></h3><div class="cards ' + ((template.querySelector('.cards') || {}).className || 'cards') + '"></div>';
      }
      delete byDow[dow];
      col.dataset.date = localKey(d);
      const h = col.querySelector('h3 span') || col.querySelector('h3');
      if (h) {
        if (h.tagName === 'H3') {
          const span = h.querySelector('span') || h;
          if (span.tagName === 'SPAN') span.textContent = fmtDay(d);
          else h.childNodes[0].textContent = fmtDay(d);
        } else h.textContent = fmtDay(d);
      }
      ordered.push(col);
    }
    Object.keys(byDow).forEach(function (k) {
      const extra = byDow[k];
      const dest = ordered[0] && ordered[0].querySelector('.cards');
      if (dest) [].slice.call(extra.querySelectorAll('[data-sid]')).forEach(function (c) { dest.appendChild(c); });
      extra.remove();
    });

    ordered.forEach(function (col) {
      [].slice.call(col.querySelectorAll('[data-sid]')).forEach(function (card) {
        const show = findShow(card.dataset.sid);
        const dow = show ? showDow(show) : null;
        if (dow == null) return;
        const destCol = ordered.find(function (c) {
          return new Date(c.dataset.date + 'T12:00:00').getDay() === dow;
        });
        const dest = destCol && destCol.querySelector('.cards');
        if (dest && card.parentNode !== dest) dest.appendChild(card);
      });
    });

    if (off === 0) {
      const today = localKey(new Date());
      const idx = ordered.findIndex(function (c) { return c.dataset.date === today; });
      if (idx > 0) ordered.push.apply(ordered, ordered.splice(0, idx));
    }
    ordered.forEach(function (c) { strip.appendChild(c); });

    const label = document.querySelector('#week-label');
    if (label) label.textContent = rangeLabel(off);
  }

  const orig = window.renderBoard;
  window.renderBoard = function () {
    if (typeof orig === 'function') orig();
    relabelSeatRotate();
  };
  relabelSeatRotate();
})();
