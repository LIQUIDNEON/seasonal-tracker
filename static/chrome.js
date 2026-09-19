(function () {
  if (!document.getElementById('st-layout-css')) {
    const css = document.createElement('style');
    css.id = 'st-layout-css';
    css.textContent = [
      '.board{overflow-y:auto!important;}',
      'body.layout-bar .week-strip{display:flex!important;flex-direction:row!important;align-items:flex-start!important;width:100%!important;height:auto!important;}',
      'body.layout-bar .week-strip .day-col{flex:1 1 0!important;min-width:160px!important;overflow:hidden!important;height:auto!important;}',
      'body.layout-row .week-strip{display:flex!important;flex-direction:column!important;width:100%!important;height:auto!important;min-height:0!important;}',
      'body.layout-row .week-strip .day-col{flex:0 0 auto!important;width:100%!important;max-width:100%!important;overflow:visible!important;height:auto!important;}',
      'body.layout-bar .week-strip .cards,body.layout-row .week-strip .cards{display:flex!important;flex-direction:row!important;flex-wrap:wrap!important;width:100%!important;gap:8px!important;height:auto!important;}',
      '.remain-tiles{display:flex!important;flex-direction:row!important;flex-wrap:nowrap!important;justify-content:center!important;gap:6px!important;}',
      '.remain-tile{display:flex!important;flex-direction:column!important;align-items:center!important;min-width:44px!important;flex:1 1 0!important;max-width:64px!important;padding:4px 6px!important;border-radius:10px!important;cursor:default!important;}',
      '.remain-tile b{font-size:15px!important;display:block!important;}',
      '.remain-tile small{font-size:8px!important;text-transform:uppercase!important;display:block!important;}',
      '.remain-tile.sub{background:color-mix(in srgb,#ff8a5b 22%,var(--card-2,#1c2430))!important;color:#ff8a5b!important;}',
      '.remain-tile.dub{background:color-mix(in srgb,#3dd68c 22%,var(--card-2,#1c2430))!important;color:#3dd68c!important;}',
      '.remain-tile.done{background:color-mix(in srgb,#3dd68c 22%,var(--card-2,#1c2430))!important;color:#3dd68c!important;}',
      '.hover-tip{position:fixed!important;z-index:90!important;max-width:min(360px,80vw)!important;background:var(--bg-2,#151b24)!important;color:var(--text,#e8eef6)!important;border:1px solid var(--line,#2a3340)!important;border-radius:12px!important;padding:10px 12px!important;box-shadow:0 8px 24px rgba(0,0,0,.4)!important;}',
      '.hover-tip .meta{display:flex!important;flex-wrap:wrap!important;gap:6px!important;margin-top:6px!important;}',
      '.hover-tip.hidden{display:none!important;}',
      '.statusbar{display:flex!important;align-items:center!important;height:32px!important;}',
      '.statusbar .tools{margin-left:auto!important;display:flex!important;align-items:center!important;gap:4px!important;}',
      '.statusbar .icon-btn{width:26px!important;height:26px!important;display:grid!important;place-items:center!important;}'
    ].join('');
    document.head.appendChild(css);
  }
  function isBar() {
    const l = state.settings.layout;
    return l === 'stacks' || l === 'bar';
  }
  function isFinished(show) {
    return show.status === 'FINISHED' || !!(show.episodes && show.subAired != null && Number(show.subAired) >= Number(show.episodes));
  }
  function localKey(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function airDow(show) {
    if (show.airDow != null && show.airDow !== '') return Number(show.airDow);
    const samples = (show.nextEvents || []).concat(show.upcomingSub || []);
    if (show.nextSubAt) samples.push({ at: show.nextSubAt });
    for (let i = 0; i < samples.length; i += 1) {
      if (!samples[i] || !samples[i].at) continue;
      const d = new Date(samples[i].at);
      if (!Number.isNaN(d.getTime())) return d.getDay();
    }
    return null;
  }
  function weekBuckets() {
    const wantSun = (state.settings.weekStart || 'sunday') !== 'monday';
    const now = new Date();
    const startWeekday = wantSun ? 0 : 1;
    const daysSince = (now.getDay() - startWeekday + 7) % 7;
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSince);
    const extra = state.range === 'next_week' ? 7 : state.range === 'week_after' ? 14 : 0;
    start.setDate(start.getDate() + extra);
    const buckets = {};
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const key = localKey(d);
      buckets[key] = { date: key, label: d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' }), shows: [] };
    }
    return buckets;
  }
  function projectWeek(sched, library) {
    const buckets = weekBuckets();
    const used = new Set();
    (sched.days || []).forEach(function (day) {
      (day.shows || []).forEach(function (s) {
        const dow = airDow(s);
        const target = Object.values(buckets).find(function (b) {
          return dow != null && new Date(b.date + 'T12:00:00').getDay() === dow;
        }) || buckets[day.date];
        if (!target) return;
        if (target.shows.some(function (x) { return Number(x.id) === Number(s.id); })) return;
        target.shows.push(s);
        used.add(Number(s.id));
      });
    });
    (library || []).forEach(function (show) {
      if (used.has(Number(show.id))) return;
      const dow = airDow(show);
      if (dow == null) return;
      Object.values(buckets).forEach(function (bucket) {
        if (new Date(bucket.date + 'T12:00:00').getDay() !== dow) return;
        if (bucket.shows.some(function (s) { return Number(s.id) === Number(show.id); })) return;
        bucket.shows.push(show);
      });
    });
    return Object.assign({}, sched, { days: Object.keys(buckets).sort().map(function (k) { return buckets[k]; }) });
  }
  function pillTip(show, kind) {
    const total = show.episodes || Math.max(show.subAired || 0, show.dubAired || 0, 12);
    const aired = kind === 'dub' ? show.dubAired : show.subAired;
    const left = kind === 'dub' ? show.remainingDub : show.remainingSub;
    const watched = kind === 'dub' ? show.watchedDub : show.watchedSub;
    const label = kind === 'dub' ? 'DUB' : 'SUB';
    const color = kind === 'dub' ? 'dub' : 'sub';
    return '<strong>' + show.title + '</strong><div class="meta">' +
      '<span class="chip ' + color + '">' + label + ' ' + (aired == null ? '?' : aired) + ' / ' + total + ' aired</span>' +
      '<span class="chip ' + color + '">' + (left == null ? '?' : left) + ' left</span>' +
      '<span class="chip">watched ' + (watched || 0) + '</span></div>';
  }
  function placeTip(html, el) {
    const tip = document.querySelector('#hover-tip');
    if (!tip) return;
    tip.innerHTML = html;
    tip.classList.remove('hidden');
    const r = el.getBoundingClientRect();
    tip.style.left = Math.max(8, Math.min(r.left, innerWidth - 320)) + 'px';
    tip.style.top = Math.min(r.bottom + 8, innerHeight - 120) + 'px';
  }
  function hideTip() {
    const tip = document.querySelector('#hover-tip');
    if (tip) tip.classList.add('hidden');
  }
  function compactCard(show) {
    const card = document.createElement('article');
    card.className = 'stack-card compact' + (isFinished(show) ? ' finished' : '');
    card.dataset.sid = String(show.id);
    const img = document.createElement('img');
    img.className = 'poster';
    img.src = show.cover || '';
    const title = document.createElement('h4');
    title.textContent = show.title;
    const tiles = document.createElement('div');
    tiles.className = 'remain-tiles';
    const total = show.episodes || Math.max(show.subAired || 0, show.dubAired || 0, 12);
    function add(kind) {
      const aired = kind === 'dub' ? show.dubAired : show.subAired;
      const el = document.createElement('span');
      el.className = 'remain-tile ' + kind + (Number(aired) >= Number(total) ? ' done' : '');
      el.innerHTML = '<b>' + (aired == null ? '?' : aired) + '/' + total + '</b><small>' + (kind === 'dub' ? 'DUB' : 'SUB') + '</small>';
      el.addEventListener('mouseenter', function (ev) {
        ev.stopPropagation();
        placeTip(pillTip(show, kind), el);
      });
      el.addEventListener('mouseleave', hideTip);
      tiles.appendChild(el);
    }
    if (state.settings.showSub !== false) add('sub');
    if ((show.dubAired || 0) > 0 || show.hasDubSchedule) add('dub');
    if (!tiles.childElementCount) add('sub');
    card.appendChild(img);
    card.appendChild(tiles);
    card.appendChild(title);
    return card;
  }
  window.paintCard = function (show) { return compactCard(show); };
  function fitCards() {
    document.querySelectorAll('.cards').forEach(function (row) {
      const cards = [].slice.call(row.querySelectorAll('article'));
      if (!cards.length) return;
      cards.forEach(function (c) { c.style.zoom = '1'; c.style.width = '140px'; });
      const avail = row.clientWidth || 0;
      if (avail < 60) return;
      const base = 140, gap = 8;
      const perRow = isBar() ? 2 : Math.max(1, Math.floor((avail + gap) / (base + gap)));
      const slot = (avail - gap * Math.max(0, perRow - 1)) / perRow;
      const z = Math.max(0.55, Math.min(2.4, slot / base));
      cards.forEach(function (c) { c.style.zoom = String(z); });
    });
  }
  const originalApply = window.applyTheme;
  window.applyTheme = function () {
    if (typeof originalApply === 'function') originalApply();
    document.body.classList.toggle('layout-bar', isBar());
    document.body.classList.toggle('layout-row', !isBar());
    const layoutBtn = document.querySelector('#btn-layout');
    if (layoutBtn) {
      layoutBtn.classList.toggle('is-bar', isBar());
      layoutBtn.innerHTML = '<svg class="i-row" viewBox="0 0 20 20" width="16" height="16"><rect x="1" y="3" width="18" height="3" rx="1"/><rect x="1" y="8.5" width="18" height="3" rx="1"/><rect x="1" y="14" width="18" height="3" rx="1"/></svg><svg class="i-bar" viewBox="0 0 20 20" width="16" height="16"><rect x="3" y="1" width="3" height="18" rx="1"/><rect x="8.5" y="1" width="3" height="18" rx="1"/><rect x="14" y="1" width="3" height="18" rx="1"/></svg>';
    }
  };
  const originalRenderBoard = window.renderBoard;
  window.renderBoard = function () {
    if (typeof isWeekRange === 'function' && isWeekRange(state.range) && state.schedule) {
      state.schedule = projectWeek(state.schedule, state.library || []);
    }
    if (typeof originalRenderBoard === 'function') originalRenderBoard();
    document.body.classList.toggle('layout-bar', isBar());
    document.body.classList.toggle('layout-row', !isBar());
    requestAnimationFrame(function () { requestAnimationFrame(fitCards); });
  };
  window.addEventListener('resize', function () { requestAnimationFrame(fitCards); });
  function bustReload() {
    const u = new URL(location.href);
    u.searchParams.set('_', String(Date.now()));
    location.replace(u.toString());
  }
  const reloadUi = document.querySelector('#btn-reload-ui');
  if (reloadUi) reloadUi.addEventListener('click', bustReload);
  const reloadAll = document.querySelector('#btn-reload-widget');
  if (reloadAll) reloadAll.addEventListener('click', function () {
    fetch('/api/reload', { method: 'POST', body: '{}' }).catch(function () {});
    setTimeout(bustReload, 900);
  });
})();
