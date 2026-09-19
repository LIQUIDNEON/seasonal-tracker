(function () {
  const orig = window.paintCard;
  if (typeof orig !== 'function') return;
  window.paintCard = function (show) {
    const card = orig(show);
    if (state.range === 'next_week' || state.range === 'week_after') return card;
    const total = show.episodes || 12;
    card.querySelectorAll('.remain-tile').forEach(function (el) {
      const kind = el.classList.contains('dub') ? 'dub' : 'sub';
      let aired = Number(kind === 'dub' ? show.dubAired : show.subAired);
      if (!Number.isFinite(aired)) aired = 0;
      const b = el.querySelector('b');
      if (b) b.textContent = aired + '/' + total;
      el.classList.toggle('done', aired >= Number(total));
    });
    return card;
  };
})();
