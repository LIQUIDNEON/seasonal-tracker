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
    return fmtDay(s).replace(/^\w+ /, '') + ' – ' + fmtDay(e).replace(/^\w+ /, '');
  }

  function relabelAndRotate() {
    const strip = document.querySelector('.week-strip');
    if (!strip) return;
    const off = Number(state.weekOffset || 0);
    const start = weekStart(off);
    const cols = [].slice.call(strip.querySelectorAll('.day-col'));
    cols.forEach(function (col, i) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      col.dataset.date = localKey(d);
      const h = col.querySelector('h3 span') || col.querySelector('h3');
      if (h) h.textContent = fmtDay(d);
    });
    const label = document.querySelector('#week-label');
    if (label) label.textContent = rangeLabel(off);
    if (off === 0 && (state.range === 'this_week' || state.range === 'week')) {
      const today = localKey(new Date());
      const idx = cols.findIndex(function (c) { return c.dataset.date === today; });
      if (idx > 0) {
        cols.slice(idx).concat(cols.slice(0, idx)).forEach(function (c) { strip.appendChild(c); });
      }
    }
  }

  const orig = window.renderBoard;
  window.renderBoard = function () {
    if (typeof orig === 'function') orig();
    relabelAndRotate();
  };
  relabelAndRotate();
})();
