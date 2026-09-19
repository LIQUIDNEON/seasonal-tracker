/* Extra HUD: minimal mode, stack poster flip, widget reload.
 * Loaded after app.js so it can wrap applyTheme and reuse state/api. */
(function () {
  const originalApply = window.applyTheme;
  window.applyTheme = function applyThemeHud() {
    if (typeof originalApply === "function") originalApply();
    document.body.classList.toggle("minimal", !!state.settings.minimal);
    document.body.classList.toggle("layout-stacks", state.settings.layout === "stacks");
    const posterBtn = document.querySelector("#btn-poster");
    if (posterBtn) {
      posterBtn.textContent = state.settings.stackPoster === "top" ? "Poster top" : "Poster bottom";
    }
    const miniBtn = document.querySelector("#btn-minimal");
    if (miniBtn) miniBtn.classList.toggle("active", !!state.settings.minimal);
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
      /* process may die before the response arrives — that is the point */
    }
    setTimeout(bustReload, 900);
  }

  const reloadUi = document.querySelector("#btn-reload-ui");
  if (reloadUi) reloadUi.addEventListener("click", bustReload);
  const reloadAll = document.querySelector("#btn-reload-widget");
  if (reloadAll) reloadAll.addEventListener("click", reloadWidget);

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
