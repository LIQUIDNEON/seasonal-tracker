/* HUD: compact, minimal, poster flip, dub gating, week projection. */
(function () {
  const originalApply = window.applyTheme;
  window.applyTheme = function applyThemeHud() {
    if (typeof originalApply === "function") originalApply();
    document.body.classList.toggle("minimal", !!state.settings.minimal);
    document.body.classList.toggle("layout-stacks", state.settings.layout === "stacks");
    document.body.classList.toggle("compact", !!state.settings.compact);
    const posterBtn = document.querySelector("#btn-poster");
    if (posterBtn) {
      posterBtn.classList.toggle("is-top", state.settings.stackPoster === "top");
      posterBtn.title = state.settings.stackPoster === "top" ? "Poster on top" : "Poster on bottom";
    }
    const miniBtn = document.querySelector("#btn-minimal");
    if (miniBtn) miniBtn.classList.toggle("active", !!state.settings.minimal);
    const compactBtn = document.querySelector("#btn-compact");
    if (compactBtn) compactBtn.classList.toggle("active", !!state.settings.compact);
    const layoutBtn = document.querySelector("#btn-layout");
    if (layoutBtn) layoutBtn.classList.toggle("is-stacks", state.settings.layout === "stacks");
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
    try { await api("/api/reload", { method: "POST", body: "{}" }); } catch {}
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
  function dubConfirmed(show) {
    return (show.dubAired || 0) > 0 || !!show.hasDubSchedule || (show.nextEvents || []).some((e) => e.kind === "dub");
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
    if (state.settings.showDub !== false && dubConfirmed(show)) add("dub", show.remainingDub);
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

  window.appendTracks = function (target, show, mode) {
    if (state.settings.progressMode === "combined") {
      target.appendChild(mode === "stack" ? stackCol(show, "combined") : trackRow(show, "combined"));
      return;
    }
    if (state.settings.showSub !== false) {
      target.appendChild(mode === "stack" ? stackCol(show, "sub") : trackRow(show, "sub"));
    }
    if (state.settings.showDub !== false && dubConfirmed(show)) {
      target.appendChild(mode === "stack" ? stackCol(show, "dub") : trackRow(show, "dub"));
    }
  };

  function localKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  function projectWeek(sched, library) {
    const start = new Date(sched.start);
    const end = new Date(sched.end);
    if (Number.isNaN(start.getTime())) return sched;
    const buckets = {};
    for (let t = new Date(start); t < end; t.setDate(t.getDate() + 1)) {
      const key = localKey(t);
      buckets[key] = { date: key, label: t.toLocaleDateString(undefined, { weekday: "short", day: "numeric" }), shows: [] };
    }
    const used = new Set();
    (sched.days || []).forEach((day) => {
      const bucket = buckets[day.date] || (buckets[day.date] = { date: day.date, label: day.label, shows: [] });
      day.shows.forEach((s) => { bucket.shows.push(s); used.add(Number(s.id)); });
    });
    (library || []).forEach((show) => {
      if (used.has(Number(show.id))) return;
      const samples = (show.nextEvents || []).concat(show.upcomingSub || []);
      if (!samples.length && show.nextSubAt) samples.push({ kind: "sub", at: show.nextSubAt });
      samples.forEach((ev) => {
        if (!ev.at) return;
        const sample = new Date(ev.at);
        if (Number.isNaN(sample.getTime())) return;
        Object.values(buckets).forEach((bucket) => {
          const day = new Date(`${bucket.date}T12:00:00`);
          if (day.getDay() !== sample.getDay()) return;
          if (bucket.shows.some((s) => Number(s.id) === Number(show.id))) return;
          bucket.shows.push(Object.assign({}, show, { focus: ev, focusAll: [ev] }));
        });
      });
    });
    const days = Object.keys(buckets).sort().map((k) => buckets[k]);
    return Object.assign({}, sched, { days, count: days.reduce((n, d) => n + d.shows.length, 0) });
  }
  const originalRenderBoard = window.renderBoard;
  window.renderBoard = function () {
    if (typeof isWeekRange === "function" && isWeekRange(state.range) && state.schedule) {
      state.schedule = projectWeek(state.schedule, state.library || []);
    }
    if (typeof originalRenderBoard === "function") originalRenderBoard();
  };

  const originalPaint = window.paintCard;
  window.paintCard = function (show) {
    if (state.settings.compact) return renderCompactCard(show);
    const el = typeof originalPaint === "function" ? originalPaint(show) : null;
    if (el && isFinished(show)) el.classList.add("finished");
    return el;
  };

  const compactBtn = document.querySelector("#btn-compact");
  if (compactBtn) {
    compactBtn.addEventListener("click", async () => {
      const next = !state.settings.compact;
      try { state.settings = await api("/api/settings", { method: "POST", body: JSON.stringify({ compact: next }) }); } catch { state.settings.compact = next; }
      state.settings.compact = next;
      applyTheme();
      renderBoard();
    });
  }
  const mini = document.querySelector("#btn-minimal");
  if (mini) {
    mini.addEventListener("click", async () => {
      const next = !state.settings.minimal;
      try { state.settings = await api("/api/settings", { method: "POST", body: JSON.stringify({ minimal: next }) }); } catch { state.settings.minimal = next; }
      state.settings.minimal = next;
      applyTheme();
    });
  }
})();
