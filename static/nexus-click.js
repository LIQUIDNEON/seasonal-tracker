(function () {
  const orig = window.paintCard;
  if (typeof orig !== 'function') return;
  window.paintCard = function (show) {
    const card = orig(show);
    const title = card.querySelector('h4');
    if (!title) return card;
    title.style.cursor = 'pointer';
    title.addEventListener('click', function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      const url = 'https://anime.nexus/series?search=' + encodeURIComponent(show.title || '');
      fetch('/api/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url })
      }).catch(function () {});
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
    });
    return card;
  };
})();
