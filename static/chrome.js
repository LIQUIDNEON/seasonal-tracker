(function () {
  function isBar() {
    const l = state.settings.layout;
    return l === "stacks" || l === "bar";
  }
  function isFinished(show) {
    if (show.status === "FINISHED") return true;
    return !!(show.episodes && show.subAired != null && Number(show.subAired) >= Number(show.episodes));
  }
  const originalApply = window.applyTheme;
  window.applyTheme = function () {
    if (typeof originalApply === "function") originalApply();
    state.settings.compact = true;
    state.settings.stackPoster = "top";
    document.body.classList.add("compact");
    document.body.classList.toggle("layout-bar", isBar());
    document.body.classList.toggle("layout-stacks", isBar());
    const layoutBtn = document.querySelector("#btn-layout");
    if (layoutBtn) {
      layoutBtn.classList.add("icon-btn");
      layoutBtn.classList.toggle("is-bar", isBar());
      layoutBtn.classList.toggle("is-stacks", isBar());
      layoutBtn.title = isBar() ? "Bar mode — click for rows" : "Row mode — click for bars";
      layoutBtn.innerHTML = '<svg class="i-row" viewBox="0 0 20 20" width="16" height="16"><rect x="1" y="3" width="18" height="3" rx="1"/><rect x="1" y="8.5" width="18" height="3" rx="1"/><rect x="1" y="14" width="18" height="3" rx="1"/></svg><svg class="i-bar" viewBox="0 0 20 20" width="16" height="16"><rect x="3" y="1" width="3" height="18" rx="1"/><rect x="8.5" y="1" width="3" height="18" rx="1"/><rect x="14" y="1" width="3" height="18" rx="1"/></svg>';
    }
  };
  function compactCard(show) {
    const card = document.createElement("article");
    card.className = "stack-card compact" + (isFinished(show) ? " finished" : "");
    card.dataset.sid = String(show.id);
    const img = document.createElement("img");
    img.className = "poster";
    img.src = show.cover || "";
    const title = document.createElement("h4");
    title.title = show.title;
    title.textContent = show.title;
    const tiles = document.createElement("div");
    tiles.className = "remain-tiles";
    function add(kind, remaining) {
      const el = document.createElement("span");
      el.className = "remain-tile " + kind + (remaining === 0 ? " done" : "");
      el.innerHTML = "<b>" + (remaining == null ? "?" : remaining) + "</b><small>" + (kind === "dub" ? "DUB" : "SUB") + " left</small>";
      tiles.appendChild(el);
    }
    if (state.settings.showSub !== false) add("sub", show.remainingSub);
    const dubOk = (show.dubAired || 0) > 0 || show.hasDubSchedule || (show.nextEvents || []).some(function (e) { return e.kind === "dub"; });
    if (state.settings.showDub !== false && dubOk) add("dub", show.remainingDub);
    if (!tiles.childElementCount) add("sub", show.remainingSub);
    card.appendChild(img);
    card.appendChild(tiles);
    card.appendChild(title);
    return card;
  }
  window.paintCard = function (show) { return compactCard(show); };
  const originalRenderBoard = window.renderBoard;
  window.renderBoard = function () {
    if (typeof originalRenderBoard === "function") originalRenderBoard();
    const strip = document.querySelector(".week-strip");
    if (strip && !isBar()) strip.classList.add("week-rows");
    const root = document.querySelector("#board");
    if (!root || state.range === "library" || !state.library) return;
    const seen = new Set([].slice.call(root.querySelectorAll("[data-sid]")).map(function (n) { return Number(n.dataset.sid); }));
    const leftover = state.library.filter(function (s) { return !seen.has(Number(s.id)); });
    if (!leftover.length) return;
    const wrap = document.createElement("section");
    wrap.className = "day-block";
    wrap.innerHTML = "<h3>Still on roster</h3>";
    const cards = document.createElement("div");
    cards.className = "cards rows";
    leftover.forEach(function (s) { cards.appendChild(compactCard(s)); });
    wrap.appendChild(cards);
    root.appendChild(wrap);
  };
  const floatBtn = document.querySelector("#btn-float");
  if (floatBtn) {
    floatBtn.addEventListener("click", function () {
      fetch("/api/float", { method: "POST", body: "{}" }).catch(function () {});
      window.open(window.location.origin + "/", "seasonal-tracker-float", "width=960,height=620");
    });
  }
  const reloadUi = document.querySelector("#btn-reload-ui");
  if (reloadUi) reloadUi.addEventListener("click", function () {
    const u = new URL(window.location.href);
    u.searchParams.set("_", String(Date.now()));
    window.location.replace(u.toString());
  });
})();
