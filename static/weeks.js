(function () {
  const NAMES = ['This week', 'Next week', 'Following'];
  let offset = Number(state.weekOffset || 0);
  let layoutBeforeLibrary = null;

  const css = document.createElement('style');
  css.textContent = [
    '.statusbar .ranges{padding-left:14px!important;gap:6px!important;align-items:center!important;}',
    '#btn-today{margin-left:2px!important;}',
    '.week-pager{display:inline-flex!important;align-items:center!important;gap:2px!important;',
    'height:22px!important;border:1px solid var(--line,#2a3340)!important;border-radius:8px!important;padding:0 4px!important;}',
    '.week-pager button{min-width:22px!important;width:22px!important;height:20px!important;padding:0!important;font-size:14px!important;}',
    '#week-label{font-size:11px!important;min-width:6.2rem!important;text-align:center!important;opacity:.9!important;padding:0 4px!important;}',
    '#week-now.active,.week-pager.is-on{box-shadow:inset 0 0 0 1px color-mix(in srgb,#7eb8ff 45%,transparent);}'
  ].join('');
  document.head.appendChild(css);

  const nav = document.querySelector('#ranges');
  if (!nav || typeof loadSchedule !== 'function') return;
  nav.innerHTML =
    '<button type="button" id="btn-today" data-range="today">Today</button>' +
    '<button type="button" id="week-now">This week</button>' +
    '<span class="week-pager" id="week-pager">' +
      '<button type="button" id="week-prev" aria-label="Previous week">‹</button>' +
      '<span id="week-label">This week</span>' +
      '<button type="button" id="week-next" aria-label="Next week">›</button>' +
    '</span>' +
    '<button type="button" data-range="library">My shows</button>';

  function isWeek() {
    return state.range === 'this_week' || state.range === 'next_week' || state.range === 'week_after' || state.range === 'week';
  }
  window.isWeekRange = function (range) {
    return range === 'this_week' || range === 'next_week' || range === 'week_after' || range === 'week';
  };

  function weekStartDate(off) {
    const wantSun = (state.settings.weekStart || 'sunday') !== 'monday';
    const now = new Date();
    const startWeekday = wantSun ? 0 : 1;
    const daysSince = (now.getDay() - startWeekday + 7) % 7;
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSince);
    start.setDate(start.getDate() + off * 7);
    return start;
  }
  function localKey(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function paintActive() {
    nav.querySelectorAll('button').forEach(function (b) { b.classList.remove('active'); });
    const today = document.querySelector('#btn-today');
    const mine = nav.querySelector('[data-range="library"]');
    const jump = document.querySelector('#week-now');
    const pager = document.querySelector('#week-pager');
    const label = document.querySelector('#week-label');
    if (state.range === 'today' && today) today.classList.add('active');
    else if (state.range === 'library' && mine) mine.classList.add('active');
    if (jump) jump.classList.toggle('active', isWeek() && offset === 0);
    if (pager) pager.classList.toggle('is-on', isWeek());
    if (label) {
      if (isWeek() && state.schedule && state.schedule.label) label.textContent = state.schedule.label;
      else label.textContent = NAMES[offset] || ('+' + offset + ' wk');
    }
    const prev = document.querySelector('#week-prev');
    if (prev) prev.disabled = isWeek() && offset <= 0;
  }

  function applyLibraryLayout() {
    if (state.range === 'library') {
      if (layoutBeforeLibrary == null) layoutBeforeLibrary = state.settings.layout;
      state.settings.layout = 'stacks';
    } else if (layoutBeforeLibrary != null) {
      state.settings.layout = layoutBeforeLibrary;
      layoutBeforeLibrary = null;
    }
    if (typeof applyTheme === 'function') applyTheme();
  }

  function reseat() {
    const strip = document.querySelector('.week-strip');
    if (!strip || !isWeek()) return;
    const cols = [].slice.call(strip.querySelectorAll('.day-col'));
    if (!cols.length) return;
    const start = weekStartDate(offset);
    const byDow = {};
    cols.forEach(function (col, i) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      col.dataset.date = localKey(d);
      byDow[d.getDay()] = col;
    });
    const lib = state.library || [];
    cols.forEach(function (col) {
      [].slice.call(col.querySelectorAll('[data-sid]')).forEach(function (card) {
        const show = lib.find(function (s) { return String(s.id) === String(card.dataset.sid); });
        if (!show || show.airDow == null || show.airDow === '') return;
        const destCol = byDow[Number(show.airDow)];
        const dest = destCol && destCol.querySelector('.cards');
        if (dest && card.parentNode !== dest) dest.appendChild(card);
      });
    });
    cols.forEach(function (col) {
      const box = col.querySelector('.cards');
      if (!box) return;
      const kids = [].slice.call(box.children);
      kids.sort(function (a, b) { return Number(a.dataset.sid) - Number(b.dataset.sid); });
      kids.forEach(function (k) { box.appendChild(k); });
    });
    if (offset === 0) {
      const today = localKey(new Date());
      const idx = cols.findIndex(function (c) { return c.dataset.date === today; });
      if (idx > 0) {
        const head = cols.slice(idx);
        const tail = cols.slice(0, idx);
        head.concat(tail).forEach(function (c) { strip.appendChild(c); });
      }
    }
  }

  async function loadWeek() {
    state.weekOffset = offset;
    state.range = offset === 0 ? 'this_week' : offset === 1 ? 'next_week' : offset === 2 ? 'week_after' : 'this_week';
    applyLibraryLayout();
    paintActive();
    try {
      const [sched, lib] = await Promise.all([
        api('/api/schedule?range=this_week&offset=' + offset),
        api('/api/library')
      ]);
      state.schedule = sched;
      state.library = lib.shows || [];
      renderBoard();
    } catch (e) {
      if (typeof toast === 'function') toast(e.message);
    }
    paintActive();
    reseat();
  }

  function goToday() {
    state.range = 'today';
    applyLibraryLayout();
    paintActive();
    loadSchedule().then(paintActive);
  }
  function goLibrary() {
    state.range = 'library';
    applyLibraryLayout();
    paintActive();
    loadSchedule().then(function () {
      paintActive();
      if (typeof applyTheme === 'function') applyTheme();
      renderBoard();
    });
  }

  document.querySelector('#btn-today').addEventListener('click', goToday);
  nav.querySelector('[data-range="library"]').addEventListener('click', goLibrary);
  document.querySelector('#week-now').addEventListener('click', function () {
    offset = 0;
    loadWeek();
  });
  document.querySelector('#week-prev').addEventListener('click', function () {
    if (offset <= 0) return;
    offset -= 1;
    loadWeek();
  });
  document.querySelector('#week-next').addEventListener('click', function () {
    offset += 1;
    loadWeek();
  });

  const origRender = window.renderBoard;
  window.renderBoard = function () {
    if (typeof origRender === 'function') origRender();
    if (state.range === 'library') {
      document.body.classList.add('layout-bar');
      document.body.classList.remove('layout-row');
    }
    reseat();
    paintActive();
  };

  paintActive();
})();
