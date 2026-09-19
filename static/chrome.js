(function () {
  if (!document.getElementById('st-layout-css')) {
    const css = document.createElement('style');
    css.id = 'st-layout-css';
    css.textContent = [
      'body.layout-bar .week-strip{display:flex!important;flex-direction:row!important;width:100%!important;}',
      'body.layout-bar .week-strip .day-col{flex:1 1 0!important;min-width:150px!important;overflow:hidden!important;}',
      'body.layout-row .week-strip{display:flex!important;flex-direction:column!important;width:100%!important;}',
      'body.layout-row .week-strip .day-col{width:100%!important;max-width:100%!important;overflow:hidden!important;}',
      'body.layout-bar .week-strip .cards,body.layout-row .week-strip .cards{display:flex!important;flex-wrap:wrap!important;width:100%!important;gap:8px!important;}',
      '.remain-tiles{display:flex!important;flex-direction:row!important;flex-wrap:nowrap!important;justify-content:center!important;align-items:stretch!important;gap:6px!important;}',
      '.remain-tile{display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;min-width:44px!important;flex:1 1 0!important;max-width:64px!important;padding:4px 6px!important;border-radius:10px!important;}',
      '.remain-tile b{font-size:15px!important;font-weight:750!important;display:block!important;}',
      '.remain-tile small{font-size:8px!important;letter-spacing:.06em!important;text-transform:uppercase!important;display:block!important;}',
      '.remain-tile.sub{background:color-mix(in srgb,#ff8a5b 22%,var(--card-2,#1c2430))!important;color:#ff8a5b!important;}',
      '.remain-tile.dub{background:color-mix(in srgb,#3dd68c 22%,var(--card-2,#1c2430))!important;color:#3dd68c!important;}',
      '.remain-tile.done{background:color-mix(in srgb,#3dd68c 22%,var(--card-2,#1c2430))!important;color:#3dd68c!important;}',
      '.statusbar{display:flex!important;align-items:center!important;height:32px!important;}',
      '.statusbar .tools{display:flex!important;align-items:center!important;gap:4px!important;margin-left:auto!important;}',
      '.statusbar .icon-btn{width:26px!important;height:26px!important;display:grid!important;place-items:center!important;padding:0!important;}',
      '#btn-layout .i-bar{display:none!important;fill:currentColor;}',
      '#btn-layout.is-bar .i-row{display:none!important;}',
      '#btn-layout.is-bar .i-bar{display:block!important;}'
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
      const bucket = buckets[day.date] || null;
      (day.shows || []).forEach(function (s) {
        const target = bucket || Object.values(buckets).find(function (b) { return (b.label || '').indexOf((day.label || '').slice(0, 3)) === 0; }) || null;
        if (!target) return;
        if (target.shows.some(function (x) { return Number(x.id) === Number(s.id); })) return;
        target.shows.push(s);
        used.add(Number(s.id));
      });
    });
    (library || []).forEach(function (show) {
      if (used.has(Number(show.id))) return;
      const samples = (show.nextEvents || []).concat(show.upcomingSub || []);
      if (show.nextSubAt) samples.push({ at: show.nextSubAt });
      samples.forEach(function (ev) {
        if (!ev.at) return;
        const sample = new Date(ev.at);
        if (Number.isNaN(sample.getTime())) return;
        Object.keys(buckets).forEach(function (key) {
          const bucket = buckets[key];
          const day = new Date(key + 'T12:00:00');
          if (day.getDay() !== sample.getDay()) return;
          if (bucket.shows.some(function (s) { return Number(s.id) === Number(show.id); })) return;
          bucket.shows.push(Object.assign({}, show, { focus: ev, focusAll: [ev] }));
        });
      });
    });
    return Object.assign({}, sched, { days: Object.keys(buckets).sort().map(function (k) { return buckets[k]; }) });
  }

  const originalApply = window.applyTheme;
  window.applyTheme = function () {
    if (typeof originalApply === 'function') originalApply();
    state.settings.compact = true;
    document.body.classList.add('compact');
    document.body.classList.toggle('layout-bar', isBar());
    document.body.classList.toggle('layout-row', !isBar());
    const layoutBtn = document.querySelector('#btn-layout');
    if (layoutBtn) {
      layoutBtn.classList.toggle('is-bar', isBar());
      layoutBtn.title = isBar() ? 'Bar mode' : 'Row mode';
      layoutBtn.innerHTML = '<svg class="i-row" viewBox="0 0 20 20" width="16" height="16"><rect x="1" y="3" width="18" height="3" rx="1"/><rect x="1" y="8.5" width="18" height="3" rx="1"/><rect x="1" y="14" width="18" height="3" rx="1"/></svg><svg class="i-bar" viewBox="0 0 20 20" width="16" height="16"><rect x="3" y="1" width="3" height="18" rx="1"/><rect x="8.5" y="1" width="3" height="18" rx="1"/><rect x="14" y="1" width="3" height="18" rx="1"/></svg>';
    }
  };

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
      tiles.appendChild(el);
    }
    if (state.settings.showSub !== false) add('sub');
    if ((show.dubAired || 0) > 0 || show.hasDubSchedule) add('dub');
    if (!tiles.childElementCount) add('sub');
    card.appendChild(img);
    card.appendChild(tiles);
    card.appendChild(title);
    card.addEventListener('mouseenter', function () {
      const tip = document.querySelector('#hover-tip');
      if (!tip) return;
      const bits = [];
      if (typeof showMeta === 'function') bits.push(showMeta(show));
      bits.push('<span class="chip sub">SUB ' + (show.subAired ?? '?') + '/' + total + ' \u00b7 ' + (show.remainingSub ?? '?') + ' left \u00b7 watched ' + (show.watchedSub || 0) + '</span>');
      if ((show.dubAired || 0) > 0 || show.hasDubSchedule) bits.push('<span class="chip dub">DUB ' + (show.dubAired ?? '?') + '/' + total + ' \u00b7 ' + (show.remainingDub ?? '?') + ' left \u00b7 watched ' + (show.watchedDub || 0) + '</span>');
      tip.innerHTML = '<strong>' + show.title + '</strong><div class="meta">' + bits.join('') + '</div>';
      tip.classList.remove('hidden');
      const r = card.getBoundingClientRect();
      tip.style.left = Math.max(8, Math.min(r.left, innerWidth - 300)) + 'px';
      tip.style.top = Math.min(r.bottom + 8, innerHeight - 150) + 'px';
    });
    card.addEventListener('mouseleave', function () {
      const tip = document.querySelector('#hover-tip');
      if (tip) tip.classList.add('hidden');
    });
    return card;
  }
  window.paintCard = function (show) { return compactCard(show); };

  function fitCards() {
    document.querySelectorAll('.cards').forEach(function (row) {
      const cards = [].slice.call(row.querySelectorAll('article'));
      if (!cards.length) return;
      cards.forEach(function (c) { c.style.zoom = '1'; c.style.width = '140px'; });
      const avail = row.clientWidth || 0;
      if (avail < 80) return;
      const base = 140, gap = 8;
      const perRow = Math.max(1, Math.floor((avail + gap) / (base + gap)));
      const slot = (avail - gap * (perRow - 1)) / perRow;
      const z = Math.max(0.7, Math.min(1.85, slot / base));
      cards.forEach(function (c) { c.style.zoom = String(z); });
    });
  }

  const originalRenderBoard = window.renderBoard;
  window.renderBoard = function () {
    if (typeof isWeekRange === 'function' && isWeekRange(state.range) && state.schedule) {
      state.schedule = projectWeek(state.schedule, state.library || []);
    }
    if (typeof originalRenderBoard === 'function') originalRenderBoard();
    document.body.classList.toggle('layout-bar', isBar());
    document.body.classList.toggle('layout-row', !isBar());
    requestAnimationFrame(fitCards);
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
  const floatBtn = document.querySelector('#btn-float');
  if (floatBtn) floatBtn.addEventListener('click', function () {
    fetch('/api/float', { method: 'POST', body: '{}' }).catch(function () {});
    window.open(location.origin + '/', 'seasonal-tracker-float', 'width=960,height=620');
  });
})();
