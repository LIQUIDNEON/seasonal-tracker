/* Extra HUD: minimal mode, poster flip, compact tiles, widget reload.
 * Loaded after app.js so it can wrap applyTheme / paintCard. */
(function () {
  const originalApply = window.applyTheme;
  window.applyTheme = function applyThemeHud() {
    if (typeof originalApply === "function") originalApply();
    document.body.classList.toggle("minimal", !!state.settings.minimal);
    document.body.classList.toggle("layout-stacks", state.settings.layout === "stacks");
    document.body.classList.toggle("compact", !!state.settings.compact);
    const posterBtn = document.querySelector("#btn-poster");
    if (posterBtn) {
      posterBtn.textContent = state.settings.stackPoster === "top" ? "Poster top" : "Poster bottom";
    }
    const miniBtn = document.querySelector("#btn-minimal");
    if (miniBtn) miniBtn.classList.toggle("active", !!state.settings.minimal);
    const compactBtn = document.querySelector("#btn-compact");
    if (compactBtn) compactBtn.classList.toggle("active", !!state.settings.compact);
  };

  const poster = document.querySelector("#btn-poster");
  if (poster) {
    poster.addEventListener("click", async () => {
      const next = state.settings.stackPoster === "top" ? "bottom" : "top";
      state.settings = await api("/api/settings", { method: "POST", body: JSON.stringify({ stackPoster: next }) });
      applyTheme();
      renderBoard();
    });
  }

  function bustReload() {
    const u = new URL(window.location.href);
    u.searchParams.set("_", String(Date.now()));
    window.location.replace(u.toString());
  }

  async function reloadWidget() {
    try {
      await api("/api/reload", { method: "POST", body: "{}" });
    } catch {
      /* process may die before the response arrives */
    }
    setTimeout(bustReload, 900);
  }

  const reloadUi = document.querySelector("#btn-reload-ui");
  if (reloadUi) reloadUi.addEventListener("click", bustReload);
  const reloadAll = document.querySelector("#btn-reload-widget");
  if (reloadAll) reloadAll.addEventListener("click", reloadWidget);

  function isFinished(show) {
    if (show.status === "FINISHED") return true;
    const total = show.episodes;
    return !!(total && show.subAired != null && Number(show.subAired) >= Number(total));
  }

  function compactTiles(show) {
    const wrap = document.createElement("div");
    wrap.className = "remain-tiles";
    const add = (kind, remaining) => {
      const el = document.createElement("span");
      el.className = `remain-tile ${kind}${remaining === 0 ? " done" : ""}`;
      el.innerHTML = `<b>${remaining == null ? "?" : remaining}</b><small>${kind === "dub" ? "DUB" : "SUB"} left</small>`;
      wrap.appendChild(el);
    };
    if (state.settings.showSub !== false) add("sub", show.remainingSub);
    if (state.settings.showDub !== false) add("dub", show.remainingDub);
    if (!wrap.childElementCount) add("sub", show.remainingSub);
    return wrap;
  }

  function renderCompactCard(show) {
    const layout = state.settings.layout || "rows";
    const card = document.createElement("article");
    card.className = (layout === "stacks" ? "stack-card compact" : "row-card compact") + (isFinished(show) ? " finished" : "");
    const img = document.createElement("img");
    img.className = "poster";
    img.src = show.cover || "";
    const title = document.createElement("h4");
    title.title = show.title;
    title.textContent = show.title;
    if (layout === "stacks") {
      card.appendChild(img);
      card.appendChild(title);
      card.appendChild(compactTiles(show));
      return card;
    }
    const body = document.createElement("div");
    body.className = "row-body";
    body.appendChild(title);
    body.appendChild(compactTiles(show));
    card.appendChild(img);
    card.appendChild(body);
    return card;
  }

  const originalPaint = window.paintCard;
  window.paintCard = function paintCardHud(show) {
    if (state.settings.compact) return renderCompactCard(show);
    const el = typeof originalPaint === "function" ? originalPaint(show) : null;
    if (el && isFinished(show)) el.classList.add("finished");
    return el;
  };

  const compactBtn = document.querySelector("#btn-compact");
  if (compactBtn) {
    compactBtn.addEventListener("click", async () => {
      const next = !state.settings.compact;
      try {
        state.settings = await api("/api/settings", { method: "POST", body: JSON.stringify({ compact: next }) });
      } catch {
        state.settings.compact = next;
      }
      state.settings.compact = next;
      applyTheme();
      renderBoard();
    });
  }

  const mini = document.querySelector("#btn-minimal");
  if (mini) {
    mini.addEventListener("click", async () => {
      const next = !state.settings.minimal;
      try {
        state.settings = await api("/api/settings", { method: "POST", body: JSON.stringify({ minimal: next }) });
      } catch {
        state.settings.minimal = next;
      }
      state.settings.minimal = next;
      applyTheme();
    });
  }
})();
