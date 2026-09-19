(function () {
  const WEEKS = [
    { range: 'this_week', name: 'This week' },
    { range: 'next_week', name: 'Next week' },
    { range: 'week_after', name: 'Following' }
  ];
  let offset = 0;

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
    return state.range === 'this_week' || state.range === 'next_week' || state.range === 'week_after';
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
      else label.textContent = WEEKS[offset].name;
    }
    const prev = document.querySelector('#week-prev');
    const next = document.querySelector('#week-next');
    if (prev) prev.disabled = offset <= 0;
    if (next) next.disabled = offset >= WEEKS.length - 1;
  }
  function go(range) {
    state.range = range;
    if (range === 'this_week') offset = 0;
    if (range === 'next_week') offset = 1;
    if (range === 'week_after') offset = 2;
    paintActive();
    loadSchedule().then(paintActive).catch(function (e) {
      if (typeof toast === 'function') toast(e.message);
    });
  }

  document.querySelector('#btn-today').addEventListener('click', function () { go('today'); });
  nav.querySelector('[data-range="library"]').addEventListener('click', function () { go('library'); });
  document.querySelector('#week-now').addEventListener('click', function () { go('this_week'); });
  document.querySelector('#week-prev').addEventListener('click', function () {
    if (offset <= 0) return;
    offset -= 1;
    go(WEEKS[offset].range);
  });
  document.querySelector('#week-next').addEventListener('click', function () {
    if (offset >= WEEKS.length - 1) return;
    offset += 1;
    go(WEEKS[offset].range);
  });

  const orig = window.renderBoard;
  window.renderBoard = function () {
    if (typeof orig === 'function') orig();
    paintActive();
  };
  paintActive();
})();
