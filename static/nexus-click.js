(function () {
  const css = document.createElement('style');
  css.textContent = [
    'a.show-title,.stack-card.compact a{',
    'color:inherit!important;text-decoration:none!important;',
    'font-size:12px!important;font-weight:650!important;',
    'display:-webkit-box!important;-webkit-line-clamp:2!important;',
    '-webkit-box-orient:vertical!important;overflow:hidden!important;',
    'height:2.6em!important;line-height:1.3!important;cursor:pointer!important;',
    '}',
    'a.show-title:hover,a.show-title:visited,.stack-card.compact a:hover{',
    'color:inherit!important;text-decoration:none!important;',
    '}'
  ].join('');
  document.head.appendChild(css);

  function fmtWhen(at) {
    if (typeof fmtTime === 'function') return fmtTime(at);
    const d = new Date(at);
    if (Number.isNaN(d.getTime())) return String(at || '');
    return d.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  function nextAir(show, kind) {
    const now = Date.now() - 60 * 1000;
    const pool = (show.nextEvents || []).concat(kind === 'sub' ? (show.upcomingSub || []) : []);
    const hits = pool.filter(function (e) {
      if (!e || !e.at) return false;
      if (kind === 'dub' && e.kind !== 'dub') return false;
      if (kind === 'sub' && e.kind && e.kind !== 'sub') return false;
      return new Date(e.at).getTime() >= now;
    }).sort(function (a, b) { return new Date(a.at) - new Date(b.at); });
    if (hits[0]) return hits[0];
    if (kind === 'sub' && show.nextSubAt && new Date(show.nextSubAt).getTime() >= now) {
      return { at: show.nextSubAt, episode: show.nextSubEpisode };
    }
    return null;
  }
  function hasDub(show) {
    return (show.dubAired || 0) > 0 || !!show.hasDubSchedule || (show.nextEvents || []).some(function (e) { return e.kind === 'dub'; });
  }
  function titleHtml(show) {
    const bits = [];
    const sub = nextAir(show, 'sub');
    const dub = nextAir(show, 'dub');
    if (sub) bits.push('<span class="chip sub">SUB ep ' + (sub.episode || '?') + ' · ' + fmtWhen(sub.at) + '</span>');
    else bits.push('<span class="chip sub">SUB finished</span>');
    if (hasDub(show) || dub) {
      if (dub) bits.push('<span class="chip dub">DUB ep ' + (dub.episode || '?') + ' · ' + fmtWhen(dub.at) + '</span>');
      else bits.push('<span class="chip dub">DUB finished</span>');
    }
    return '<strong>' + show.title + '</strong><div class="meta">' + bits.join('') + '</div>';
  }
  function titleText(show) {
    const sub = nextAir(show, 'sub');
    const dub = nextAir(show, 'dub');
    const parts = [show.title];
    parts.push(sub ? ('SUB ' + fmtWhen(sub.at)) : 'SUB finished');
    if (hasDub(show) || dub) parts.push(dub ? ('DUB ' + fmtWhen(dub.at)) : 'DUB finished');
    return parts.join(' · ');
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
  function openNexus(title) {
    const url = 'https://anime.nexus/series?search=' + encodeURIComponent(title || '');
    fetch('/api/open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url })
    }).catch(function () {
      fetch('/api/open?url=' + encodeURIComponent(url)).catch(function () {});
    });
  }
  const orig = window.paintCard;
  if (typeof orig !== 'function') return;
  window.paintCard = function (show) {
    const card = orig(show);
    let title = card.querySelector('h4, a.show-title');
    if (!title) return card;
    if (title.tagName === 'A') {
      const h = document.createElement('h4');
      h.textContent = show.title;
      title.replaceWith(h);
      title = h;
    }
    title.title = titleText(show);
    title.style.cursor = 'pointer';
    title.addEventListener('mouseenter', function () { placeTip(titleHtml(show), title); });
    title.addEventListener('mouseleave', hideTip);
    title.addEventListener('click', function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      openNexus(show.title);
    });
    return card;
  };
})();
