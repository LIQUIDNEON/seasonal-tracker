(function () {
  const s = document.createElement('style');
  s.id = 'st-pill-colors';
  s.textContent = [
    '.remain-tile.sub,.remain-tile.dub{background:color-mix(in srgb,#ff8a5b 22%,var(--card-2,#1c2430))!important;color:#ff8a5b!important;}',
    '.remain-tile.done{background:color-mix(in srgb,#3dd68c 22%,var(--card-2,#1c2430))!important;color:#3dd68c!important;}',
    '.stack-card.finished,.row-card.finished{border:1px solid color-mix(in srgb,#3dd68c 50%,var(--card-2,#1c2430))!important;box-shadow:none!important;}',
    '.stack-card.sub-done,.row-card.sub-done{border:1px solid color-mix(in srgb,#ff8a5b 50%,var(--card-2,#1c2430))!important;box-shadow:none!important;}'
  ].join('');
  document.head.appendChild(s);
})();
