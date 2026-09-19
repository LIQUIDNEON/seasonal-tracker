const state = {
  range: "today",
  settings: {},
  meta: {},
  schedule: null,
  library: [],
  pickerPage: 1,
  pickerSeason: null,
  pickerYear: null,
  searchTimer: null,
};

const $ = (sel) => document.querySelector(sel);
const board = $("#board");

function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 2200);
}

async function api(path, opts) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

function fmtTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function countdown(iso) {
  if (!iso) return "";
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "aired";
  const s = Math.floor(diff / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function applyTheme() {
  document.documentElement.dataset.theme = state.settings.theme || "dark";
  document.body.classList.toggle("compact", !!state.settings.compact);
  $("#btn-layout").textContent = state.settings.layout === "stacks" ? "Stacks" : "Rows";
}

function pipClass(n, aired, watched, nextEp) {
  const cls = ["pip"];
  if (watched >= n) cls.push("watched");
  else if (aired >= n) cls.push("aired");
  else cls.push("future");
  if (nextEp === n) cls.push("next");
  return cls.join(" ");
}

function episodeTotal(show) {
  return show.episodes || Math.max(show.subAired || 0, show.dubAired || 0, show.nextSubEpisode || 0, 12);
}

function pips(show, kind) {
  const total = Math.min(episodeTotal(show), 26);
  const aired = kind === "dub" ? show.dubAired || 0 : show.subAired || 0;
  const watched = kind === "dub" ? show.watchedDub || 0 : show.watchedSub || 0;
  const nextEp =
    kind === "dub"
      ? (show.nextEvents || []).find((e) => e.kind === "dub")?.episode
      : show.nextSubEpisode;
  const wrap = document.createElement("div");
  wrap.className = "pips";
  for (let n = 1; n <= total; n += 1) {
    const el = document.createElement("button");
    el.className = pipClass(n, aired, watched, nextEp);
    el.textContent = n;
    el.title = `${kind.toUpperCase()} ep ${n}`;
    el.addEventListener("click", (ev) => {
      ev.stopPropagation();
      setProgress(show, kind, n === watched ? n - 1 : n);
    });
    wrap.appendChild(el);
  }
  if ((show.episodes || 0) > 26) {
    const more = document.createElement("span");
    more.className = "counts";
    more.textContent = `+${show.episodes - 26}`;
    wrap.appendChild(more);
  }
  return wrap;
}

function trackRow(show, kind) {
  const aired = kind === "dub" ? show.dubAired : show.subAired;
  const remaining = kind === "dub" ? show.remainingDub : show.remainingSub;
  const total = show.episodes;
  const row = document.createElement("div");
  row.className = "track";
  row.innerHTML = `<span class="lbl">${kind.toUpperCase()}</span>`;
  row.appendChild(pips(show, kind));
  const counts = document.createElement("span");
  counts.className = "counts";
  if (aired == null && remaining == null) counts.textContent = "\u2014";
  else counts.textContent = `${aired ?? "?"} / ${total ?? "?"} \u00b7 ${remaining == null ? "?" : remaining} left`;
  row.appendChild(counts);
  return row;
}

function stackCol(show, kind) {
  const total = Math.min(episodeTotal(show), 16);
  const aired = kind === "dub" ? show.dubAired || 0 : show.subAired || 0;
  const watched = kind === "dub" ? show.watchedDub || 0 : show.watchedSub || 0;
  const nextEp =
    kind === "dub"
      ? (show.nextEvents || []).find((e) => e.kind === "dub")?.episode
      : show.nextSubEpisode;
  const col = document.createElement("div");
  col.className = "stack-col";
  for (let n = 1; n <= total; n += 1) {
    const el = document.createElement("button");
    el.className = pipClass(n, aired, watched, nextEp);
    el.textContent = n;
    el.addEventListener("click", () => setProgress(show, kind, n === watched ? n - 1 : n));
    col.appendChild(el);
  }
  const tag = document.createElement("span");
  tag.className = "tag";
  tag.textContent = kind.toUpperCase();
  col.appendChild(tag);
  return col;
}

function showMeta(show) {
  const bits = [];
  const foci = show.focusAll && show.focusAll.length ? show.focusAll : (show.focus ? [show.focus] : []);
  if (foci.length) {
    foci.forEach((focus) => {
      bits.push(`<span class="chip next">${focus.kind.toUpperCase()} ${focus.episode} \u00b7 ${fmtTime(focus.at)} \u00b7 ${countdown(focus.at)}</span>`);
    });
  } else if (show.nextEvents && show.nextEvents[0]) {
    const n = show.nextEvents[0];
    bits.push(`<span class="chip next">${n.kind.toUpperCase()} ${n.episode} \u00b7 ${fmtTime(n.at)} \u00b7 ${countdown(n.at)}</span>`);
  }
  if (show.score) bits.push(`<span class="chip">${(show.score / 10).toFixed(1)}</span>`);
  if (show.dubLag) bits.push(`<span class="chip warn">Dub ${show.dubLag} behind</span>`);
  if (show.dubDelayed) bits.push(`<span class="chip warn">Dub delayed</span>`);
  if (show.format) bits.push(`<span class="chip">${show.format}</span>`);
  return bits.join("");
}

function renderRow(show) {
  const card = document.createElement("article");
  card.className = "row-card" + (state.settings.compact ? " compact" : "");
  card.innerHTML = `
    <img class="poster" src="${show.cover || ""}" alt="" />
    <div class="row-body">
      <div class="title-line">
        <h4 title="${show.title}">${show.title}</h4>
        <div class="progress-btns">
          <button data-act="remove">Remove</button>
        </div>
      </div>
      <div class="meta">${showMeta(show)}</div>
    </div>
  `;
  const body = card.querySelector(".row-body");
  if (state.settings.showSub !== false) body.appendChild(trackRow(show, "sub"));
  if (state.settings.showDub !== false) body.appendChild(trackRow(show, "dub"));
  card.querySelector("[data-act=remove]").addEventListener("click", () => removeShow(show.id));
  return card;
}

function renderStack(show) {
  const card = document.createElement("article");
  card.className = "stack-card";
  const cols = document.createElement("div");
  cols.className = "stack-cols";
  if (state.settings.showSub !== false) cols.appendChild(stackCol(show, "sub"));
  if (state.settings.showDub !== false) cols.appendChild(stackCol(show, "dub"));
  card.appendChild(cols);
  const img = document.createElement("img");
  img.className = "poster";
  img.src = show.cover || "";
  card.appendChild(img);
  const h = document.createElement("h4");
  h.textContent = show.title;
  card.appendChild(h);
  const meta = document.createElement("div");
  meta.className = "meta";
  meta.style.justifyContent = "center";
  meta.innerHTML = showMeta(show);
  card.appendChild(meta);
  return card;
}

function renderBoard() {
  board.innerHTML = "";
  const layout = state.settings.layout || "rows";
  if (state.range === "library") {
    const wrap = document.createElement("section");
    wrap.className = "day-block";
    wrap.innerHTML = `<h3>Pinned shows \u00b7 ${state.library.length}</h3>`;
    const cards = document.createElement("div");
    cards.className = "cards " + layout;
    if (!state.library.length) {
      wrap.innerHTML += `<div class="empty">Nothing pinned yet. Click <b>Add shows</b> and pick this season\u2019s titles.</div>`;
      board.appendChild(wrap);
      return;
    }
    state.library.forEach((s) => cards.appendChild(layout === "stacks" ? renderStack(s) : renderRow(s)));
    wrap.appendChild(cards);
    board.appendChild(wrap);
    return;
  }

  const days = state.schedule?.days || [];
  $("#range-label").textContent = `${state.schedule?.label || ""} \u00b7 ${state.schedule?.count || 0} airings`;
  if (!days.length) {
    board.innerHTML = `<div class="empty">None of your pinned shows air in this window. Add more from the season list, or switch to <b>My shows</b>.</div>`;
    return;
  }
  days.forEach((day) => {
    const wrap = document.createElement("section");
    wrap.className = "day-block";
    wrap.innerHTML = `<h3>${day.label}</h3>`;
    const cards = document.createElement("div");
    cards.className = "cards " + layout;
    day.shows.forEach((s) => cards.appendChild(layout === "stacks" ? renderStack(s) : renderRow(s)));
    wrap.appendChild(cards);
    board.appendChild(wrap);
  });
}

async function loadSchedule() {
  $("#range-label").textContent = "Refreshing\u2026";
  if (state.range === "library") {
    const data = await api("/api/library");
    state.library = data.shows;
    $("#range-label").textContent = `${data.shows.length} pinned shows`;
    renderBoard();
    return;
  }
  const [sched, lib] = await Promise.all([
    api(`/api/schedule?range=${state.range}`),
    api("/api/library"),
  ]);
  state.schedule = sched;
  state.library = lib.shows;
  renderBoard();
}

async function setProgress(show, kind, value) {
  const body = { id: show.id };
  if (kind === "dub") body.watchedDub = value;
  else body.watchedSub = value;
  const data = await api("/api/library/progress", { method: "POST", body: JSON.stringify(body) });
  state.library = data.shows;
  await loadSchedule();
}

async function removeShow(id) {
  await api("/api/library/remove", { method: "POST", body: JSON.stringify({ id }) });
  toast("Removed from widget");
  await loadPicker();
  await loadSchedule();
}

async function addShow(item) {
  await api("/api/library/add", { method: "POST", body: JSON.stringify(item) });
  toast(`Pinned ${item.title}`);
  await loadPicker();
  await loadSchedule();
}

function fillSeasonSelect() {
  const sel = $("#season-select");
  const seasons = ["WINTER", "SPRING", "SUMMER", "FALL"];
  const year = state.meta.year;
  const opts = [];
  for (let y = year - 1; y <= year + 1; y += 1) {
    seasons.forEach((s) => {
      opts.push(`<option value="${s}-${y}">${s} ${y}</option>`);
    });
  }
  sel.innerHTML = opts.join("");
  sel.value = `${state.pickerSeason}-${state.pickerYear}`;
}

async function loadPicker(query) {
  const grid = $("#picker-grid");
  grid.innerHTML = "<p class='hint'>Loading titles\u2026</p>";
  try {
    let media;
    if (query) {
      media = (await api(`/api/search?q=${encodeURIComponent(query)}`)).media;
      $("#page-info").textContent = `${media.length} results`;
    } else {
      const data = await api(`/api/season?season=${state.pickerSeason}&year=${state.pickerYear}&page=${state.pickerPage}`);
      media = data.media;
      const p = data.pageInfo || {};
      $("#page-info").textContent = `${state.pickerSeason} ${state.pickerYear} \u00b7 page ${p.currentPage || state.pickerPage}`;
    }
    grid.innerHTML = "";
    media.forEach((m) => {
      const el = document.createElement("button");
      el.className = "pick" + (m.inLibrary ? " in" : "");
      el.innerHTML = `<img src="${m.cover || ""}" alt="" /><span>${m.title}</span>`;
      el.addEventListener("click", () => {
        if (m.inLibrary) removeShow(m.id);
        else addShow(m);
      });
      grid.appendChild(el);
    });
    if (!media.length) grid.innerHTML = "<p class='hint'>No titles on this page.</p>";
  } catch (err) {
    grid.innerHTML = `<p class="hint">Could not load catalog: ${err.message}</p>`;
  }
}

function wire() {
  document.querySelectorAll("#ranges button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#ranges button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.range = btn.dataset.range;
      loadSchedule().catch((e) => toast(e.message));
    });
  });
  $("#btn-layout").addEventListener("click", async () => {
    const next = state.settings.layout === "stacks" ? "rows" : "stacks";
    state.settings = await api("/api/settings", { method: "POST", body: JSON.stringify({ layout: next }) });
    applyTheme();
    renderBoard();
  });
  $("#btn-add").addEventListener("click", () => {
    $("#drawer").classList.remove("hidden");
    loadPicker();
  });
  $("#drawer-close").addEventListener("click", () => $("#drawer").classList.add("hidden"));
  $("#btn-settings").addEventListener("click", () => {
    const form = $("#settings-form");
    form.layout.value = state.settings.layout;
    form.theme.value = state.settings.theme;
    form.titleLanguage.value = state.settings.titleLanguage;
    form.weekStart.value = state.settings.weekStart;
    form.showSub.checked = state.settings.showSub !== false;
    form.showDub.checked = state.settings.showDub !== false;
    form.compact.checked = !!state.settings.compact;
    $("#settings").classList.remove("hidden");
  });
  $("#settings-close").addEventListener("click", () => $("#settings").classList.add("hidden"));
  $("#settings-form").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const form = ev.target;
    const payload = {
      layout: form.layout.value,
      theme: form.theme.value,
      titleLanguage: form.titleLanguage.value,
      weekStart: form.weekStart.value,
      showSub: form.showSub.checked,
      showDub: form.showDub.checked,
      compact: form.compact.checked,
    };
    state.settings = await api("/api/settings", { method: "POST", body: JSON.stringify(payload) });
    applyTheme();
    $("#settings").classList.add("hidden");
    toast("Settings saved");
    loadSchedule();
  });
  $("#season-select").addEventListener("change", (ev) => {
    const [s, y] = ev.target.value.split("-");
    state.pickerSeason = s;
    state.pickerYear = Number(y);
    state.pickerPage = 1;
    loadPicker();
  });
  $("#search").addEventListener("input", (ev) => {
    clearTimeout(state.searchTimer);
    const q = ev.target.value.trim();
    state.searchTimer = setTimeout(() => loadPicker(q.length >= 2 ? q : null), 280);
  });
  $("#page-prev").addEventListener("click", () => {
    state.pickerPage = Math.max(1, state.pickerPage - 1);
    loadPicker();
  });
  $("#page-next").addEventListener("click", () => {
    state.pickerPage += 1;
    loadPicker();
  });
}

async function boot() {
  wire();
  state.meta = await api("/api/meta");
  state.settings = state.meta.settings || {};
  state.pickerSeason = state.meta.season;
  state.pickerYear = state.meta.year;
  $("#season-chip").textContent = `${state.meta.season} ${state.meta.year}`;
  fillSeasonSelect();
  applyTheme();
  await loadSchedule();
  setInterval(() => loadSchedule().catch(() => {}), 5 * 60 * 1000);
}

boot().catch((err) => {
  board.innerHTML = `<div class="empty">${err.message}</div>`;
});
