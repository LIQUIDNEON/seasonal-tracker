/* HUD: layout icons, week-rows, float, compact cards. */
(function () {
  const originalApply = window.applyTheme;
  window.applyTheme = function applyThemeHud() {
    if (typeof originalApply === "function") originalApply();
    document.body.classList.remove("minimal");
    document.documentElement.classList.remove("minimal");
    document.body.classList.toggle("layout-stacks", state.settings.layout === "stacks");
    const compactBtn = document.querySelector("#btn-compact");
    if (compactBtn) compactBtn.classList.toggle("active", !!state.settings.compact);
    const layoutBtn = document.querySelector("#btn-layout");
    if (layoutBtn) {
      layoutBtn.classList.add("icon-btn");
      layoutBtn.classList.toggle("is-stacks", state.settings.layout === "stacks");
      layoutBtn.title = state.settings.layout === "stacks" ? "Stacks" : "Rows";
      layoutBtn.innerHTML = '<svg class="i-rows" viewBox="0 0 20 20" width="16" height="16"><rect x="1" y="1" width="8" height="8" rx="1.5"/><rect x="11" y="1" width="8" height="8" rx="1.5"/><rect x="1" y="11" width="8" height="8" rx="1.5"/><rect x="11" y="11" width="8" height="8" rx="1.5"/></svg><svg class="i-stacks" viewBox="0 0 20 20" width="16" height="16"><rect x="1" y="6" width="5" height="13" rx="1.2"/><rect x="7.5" y="1" width="5" height="18" rx="1.2"/><rect x="14" y="4" width="5" height="15" rx="1.2"/></svg>';
    }
  };

  const floatBtn = document.querySelector("#btn-float");
  if (floatBtn) {
    floatBtn.addEventListener("click", function () {
      fetch("/api/float", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(function () {});
      window.open(window.location.origin + "/", "seasonal-tracker-float", "width=960,height=620");
    });
  }

  function bustReload() {
    const u = new URL(window.location.href);
    u.searchParams.set("_", String(Date.now()));
    window.location.replace(u.toString());
  }
  const reloadUi = document.querySelector("#btn-reload-ui");
  if (reloadUi) reloadUi.addEventListener("click", bustReload);
  const reloadAll = document.querySelector("#btn-reload-widget");
  if (reloadAll) {
    reloadAll.addEventListener("click", function () {
      fetch("/api/reload", { method: "POST", body: "{}" }).catch(function () {});
      setTimeout(bustReload, 900);
    });
  }

  const originalRenderBoard = window.renderBoard;
  window.renderBoard = function renderBoardHud() {
    if (typeof originalRenderBoard === "function") originalRenderBoard();
    const strip = document.querySelector(".week-strip");
    if (strip && state.settings.layout !== "stacks") strip.classList.add("week-rows");
  };

  const originalPaint = window.paintCard;
  window.paintCard = function paintCardHud(show) {
    if (state.settings.compact) {
      const layout = state.settings.layout || "rows";
      const card = document.createElement("article");
      card.className = (layout === "stacks" ? "stack-card compact" : "row-card compact") + (show.status === "FINISHED" ? " finished" : "");
      const img = document.createElement("img");
      img.className = "poster";
      img.src = show.cover || "";
      const title = document.createElement("h4");
      title.title = show.title;
      title.textContent = show.title;
      const tiles = document.createElement("div");
      tiles.className = "remain-tiles";
      const add = function (kind, remaining) {
        const el = document.createElement("span");
        el.className = "remain-tile " + kind + (remaining === 0 ? " done" : "");
        el.innerHTML = "<b>" + (remaining == null ? "?" : remaining) + "</b><small>" + (kind === "dub" ? "DUB" : "SUB") + " left</small>";
        tiles.appendChild(el);
      };
      if (state.settings.showSub !== false) add("sub", show.remainingSub);
      const dubOk = (show.dubAired || 0) > 0 || show.hasDubSchedule || (show.nextEvents || []).some(function (e) { return e.kind === "dub"; });
      if (state.settings.showDub !== false && dubOk) add("dub", show.remainingDub);
      if (!tiles.childElementCount) add("sub", show.remainingSub);
      if (layout === "stacks") {
        card.appendChild(img);
        card.appendChild(tiles);
        card.appendChild(title);
        return card;
      }
      const body = document.createElement("div");
      body.className = "row-body";
      body.appendChild(title);
      body.appendChild(tiles);
      card.appendChild(img);
      card.appendChild(body);
      return card;
    }
    const el = typeof originalPaint === "function" ? originalPaint(show) : null;
    return el;
  };

  const compactBtn = document.querySelector("#btn-compact");
  if (compactBtn) {
    compactBtn.addEventListener("click", async function () {
      const next = !state.settings.compact;
      try { state.settings = await api("/api/settings", { method: "POST", body: JSON.stringify({ compact: next }) }); } catch (e) {}
      state.settings.compact = next;
      applyTheme();
      renderBoard();
    });
  }
})();
