(function () {
  const KEY = 'st-card-sort';
  const OPTIONS = [
    { id: 'name', label: 'Name' },
    { id: 'air', label: 'Air time' },
    { id: 'left', label: 'Episodes left' },
    { id: 'progress', label: 'Progress' },
    { id: 'score', label: 'Score' }
  ];

  let mode = localStorage.getItem(KEY) || 'name';
  if (!OPTIONS.some(function (o) { return o.id === mode; })) mode = 'name';

  const css = document.createElement('style');
  css.textContent = [
    '.sort-wrap{display:inline-flex;align-items:center;gap:4px;margin-right:4px;}',
    '.sort-wrap label{font-size:10px;opacity:.7;text-transform:uppercase;letter-spacing:.04em;}',
    '.sort-wrap select{height:22px;font-size:11px;background:var(--card-2,#1c2430);',
    'color:var(--text,#e8eef6);border:1px solid var(--line,#2a3340);border-radius:6px;padding:0 4px;}'
  ].join('');
  document.head.appendChild(css);

  const tools = document.querySelector('.statusbar .tools');
  if (!tools) return;
  const wrap = document.createElement('span');
  wrap.className = 'sort-wrap';
  wrap.innerHTML = '<label for="card-sort">Sort</label>';
  const sel = document.createElement('select');
  sel.id = 'card-sort';
  OPTIONS.forEach(function (o) {
    const opt = document.createElement('option');
    opt.value = o.id;
    opt.textContent = o.label;
    if (o.id === mode) opt.selected = true;
    sel.appendChild(opt);
  });
  wrap.appendChild(sel);
  tools.insertBefore(wrap, tools.firstChild);

  function findShow(card) {
    const id = card.dataset.sid;
    const lib = state.library || [];
    let show = lib.find(function (s) { return String(s.id) === String(id); });
    if (show) return show;
    const days = (state.schedule && state.schedule.days) || [];
    for (let i = 0; i < days.length; i += 1) {
      const hit = (days[i].shows || []).find(function (s) { return String(s.id) === String(id); });
      if (hit) return hit;
    }
    return null;
  }
  function value(card) {
    const show = findShow(card) || {};
    const title = (show.title || (card.querySelector('h4') || {}).textContent || '').toLowerCase();
    const total = show.episodes || 12;
    const sub = typeof airedNow === 'function' ? airedNow(show, 'sub') : (show.subAired || 0);
    if (mode === 'air') {
      const ev = show.focus || (show.nextEvents || [])[0];
      if (ev && ev.ts) return ev.ts;
      if (show.nextSubAt) return Date.parse(show.nextSubAt) || 0;
      return Number.MAX_SAFE_INTEGER;
    }
    if (mode === 'left') return Math.max(0, total - sub);
    if (mode === 'progress') return sub / total;
    if (mode === 'score') return -(show.averageScore || show.score || 0);
    return title;
  }
  function sortLanes() {
    document.querySelectorAll('.cards').forEach(function (box) {
      const kids = [].slice.call(box.querySelectorAll(':scope > [data-sid], :scope > .stack-card, :scope > .row-card'));
      if (!kids.length) return;
      kids.sort(function (a, b) {
        const va = value(a);
        const vb = value(b);
        if (va < vb) return -1;
        if (va > vb) return 1;
        return Number(a.dataset.sid) - Number(b.dataset.sid);
      });
      kids.forEach(function (k) { box.appendChild(k); });
    });
  }

  sel.addEventListener('change', function () {
    mode = sel.value;
    localStorage.setItem(KEY, mode);
    sortLanes();
  });

  const orig = window.renderBoard;
  window.renderBoard = function () {
    if (typeof orig === 'function') orig();
    sortLanes();
  };
  sortLanes();
})();
