(function () {
  function isBar() {
    const l = state.settings.layout;
    return l === "stacks" || l === "bar";
  }
  function isFinished(show) {
    if (show.status === "FINISHED") return true;
    return !!(show.episodes && show.subAired != null && Number(show.subAired) >= Number(show.episodes));
  }
  function localKey(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function projectWeek(sched, library) {
    const start = new Date(sched.start);
    const end = new Date(sched.end);
    if (Number.isNaN(start.getTime())) return sched;
    const buckets = {};
    for (let t = new Date(start.getTime()); t < end; t.setDate(t.getDate() + 1)) {
      const key = localKey(t);
      buckets[key] = { date: key, label: t.toLocaleDateString(undefined, { weekday: "short", day: "numeric" }), shows: [] };
    }
    const used = new Set();
    (sched.days || []).forEach(function (day) {
      const bucket = buckets[day.date] || (buckets[day.date] = { date: day.date, label: day.label, shows: [] });
      (day.shows || []).forEach(function (s) { bucket.shows.push(s); used.add(Number(s.id)); });
    });
    (library || []).forEach(function (show) {
      if (used.has(Number(show.id))) return;
      const samples = (show.nextEvents || []).concat(show.upcomingSub || []);
      if (!samples.length && show.nextSubAt) samples.push({ kind: "sub", at: show.nextSubAt });
      samples.forEach(function (ev) {
        if (!ev.at) return;
        const sample = new Date(ev.at);
        if (Number.isNaN(sample.getTime())) return;
        Object.keys(buckets).forEach(function (key) {
          const bucket = buckets[key];
          const day = new Date(key + "T12:00:00");
          if (day.getDay() !== sample.getDay()) return;
          if (bucket.shows.some(function (s) { return Number(s.id) === Number(show.id); })) return;
          bucket.shows.push(Object.assign({}, show, { focus: ev, focusAll: [ev] }));
        });
      });
    });
    const days = Object.keys(buckets).sort().map(function (k) { return buckets[k]; });
    return Object.assign({}, sched, { days: days, count: days.reduce(function (n, d) { return n + d.shows.length; }, 0) });
  }

  const originalApply = window.applyTheme;
  window.applyTheme = function () {
    if (typeof originalApply === "function") originalApply();
    state.settings.compact = true;
    state.settings.stackPoster = "top";
    document.body.classList.add("compact");
    document.body.classList.toggle("layout-bar", isBar());
    const layoutBtn = document.querySelector("#btn-layout");
    if (layoutBtn) {
      layoutBtn.classList.add("icon-btn");
      layoutBtn.classList.toggle("is-bar", isBar());
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
    const total = show.episodes || Math.max(show.subAired || 0, show.dubAired || 0, 12);
    function add(kind) {
      const aired = kind === "dub" ? show.dubAired : show.subAired;
      const remaining = kind === "dub" ? show.remainingDub : show.remainingSub;
      const watched = kind === "dub" ? show.watchedDub : show.watchedSub;
      const el = document.createElement("span");
      el.className = "remain-tile " + kind + (Number(aired) >= Number(total) ? " done" : "");
      const label = kind === "dub" ? "DUB" : "SUB";
      const a = aired == null ? "?" : aired;
      el.innerHTML = "<b>" + a + "/" + total + "</b><small>" + label + "</small>";
      el.title = label + " " + a + " aired / " + total + " total \u00b7 " + (remaining == null ? "?" : remaining) + " left \u00b7 watched " + (watched || 0);
      tiles.appendChild(el);
    }
    if (state.settings.showSub !== false) add("sub");
    const dubOk = (show.dubAired || 0) > 0 || show.hasDubSchedule || (show.nextEvents || []).some(function (e) { return e.kind === "dub"; });
    if (state.settings.showDub !== false && dubOk) add("dub");
    if (!tiles.childElementCount) add("sub");
    card.appendChild(img);
    card.appendChild(tiles);
    card.appendChild(title);
    return card;
  }
  window.paintCard = function (show) { return compactCard(show); };

  function seatOnAirDay(root) {
    if (!root || state.range === "library" || !state.library) return;
    const seen = new Set([].slice.call(root.querySelectorAll("[data-sid]")).map(function (n) { return Number(n.dataset.sid); }));
    const leftover = state.library.filter(function (s) { return !seen.has(Number(s.id)); });
    const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    leftover.forEach(function (show) {
      const samples = (show.nextEvents || []).concat(show.upcomingSub || []);
      if (show.nextSubAt) samples.push({ at: show.nextSubAt });
      let wd = null;
      for (let i = 0; i < samples.length; i += 1) {
        if (!samples[i].at) continue;
        const d = new Date(samples[i].at);
        if (!Number.isNaN(d.getTime())) { wd = d.getDay(); break; }
      }
      if (wd == null) return;
      const cols = [].slice.call(root.querySelectorAll(".day-col, .day-block"));
      const target = cols.find(function (col) {
        const text = ((col.querySelector("h3") || {}).textContent || "").trim();
        return text.indexOf(names[wd]) === 0;
      });
      if (!target) return;
      let cards = target.querySelector(".cards");
      if (!cards) {
        cards = document.createElement("div");
        cards.className = "cards rows";
        target.appendChild(cards);
      }
      cards.appendChild(compactCard(show));
    });
  }

  const originalRenderBoard = window.renderBoard;
  window.renderBoard = function () {
    if (typeof isWeekRange === "function" && isWeekRange(state.range) && state.schedule) {
      state.schedule = projectWeek(state.schedule, state.library || []);
    }
    if (typeof originalRenderBoard === "function") originalRenderBoard();
    const strip = document.querySelector(".week-strip");
    if (strip && !isBar()) strip.classList.add("week-rows");
    seatOnAirDay(document.querySelector("#board"));
  };

  const floatBtn = document.querySelector("#btn-float");
  if (floatBtn) {
    floatBtn.addEventListener("click", function () {
      fetch("/api/float", { method: "POST", body: "{}" }).catch(function () {});
      window.open(location.origin + "/", "seasonal-tracker-float", "width=960,height=620");
    });
  }
  const reloadUi = document.querySelector("#btn-reload-ui");
  if (reloadUi) {
    reloadUi.addEventListener("click", function () {
      const u = new URL(location.href);
      u.searchParams.set("_", String(Date.now()));
      location.replace(u.toString());
    });
  }
})();
