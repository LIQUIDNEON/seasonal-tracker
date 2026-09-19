/* Week strip owner.
 *
 * chrome.js / app.js paint whatever day columns they like. This file then
 * throws those columns away and builds exactly seven lanes for the week
 * in state.weekOffset.
 *
 * Rules we locked with the user:
 *   - Pager range is always the calendar week (Sun 13 Sep – Sat 19 Sep).
 *   - This week (offset 0) DISPLAYS starting on local today, then wraps.
 *   - A show sits on its Japan broadcast weekday (Sun 02:00 JST = Sunday),
 *     not the local evening the stream drops.
 *   - Never keep leftover columns — that was the duplicate Mon 14.
 */
(function () {
  var WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function pad(n) { return String(n).padStart(2, '0'); }

  function localKey(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  // Calendar week origin for the configured week start, used for the full-week
  // ranges (next week / following). This week is a rolling slice anchored on the
  // current local day and clipped to the end of the configured week.
  function weekOrigin(off) {
    var wantSun = (state.settings.weekStart || 'sunday') !== 'monday';
    var now = new Date();
    var target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (Number(off) || 0) * 7);
    var startWeekday = wantSun ? 0 : 1;
    var daysSince = (target.getDay() - startWeekday + 7) % 7;
    var start = new Date(target.getFullYear(), target.getMonth(), target.getDate() - daysSince);
    return start;
  }

  function thisWeekBounds() {
    var today = new Date();
    var wantSun = (state.settings.weekStart || 'sunday') !== 'monday';
    var startWeekday = wantSun ? 0 : 1;
    var daysSince = (today.getDay() - startWeekday + 7) % 7;
    var weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysSince);
    var end = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6);
    return { start: new Date(today.getFullYear(), today.getMonth(), today.getDate()), end: end };
  }

  function fmtLane(d) {
    return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  }

  function fmtRange(off) {
    var s;
    var e;
    if (off === 0 && state.range === 'this_week') {
      var bounds = thisWeekBounds();
      s = bounds.start;
      e = bounds.end;
    } else {
      s = weekOrigin(off);
      e = new Date(s.getFullYear(), s.getMonth(), s.getDate() + 6);
    }
    function bit(d) {
      return d.getDate() + ' ' + d.toLocaleDateString(undefined, { month: 'short' });
    }
    return bit(s) + ' – ' + bit(e);
  }

  // Japan weekday 0=Sun … 6=Sat. Broadcast calendars use JST, not BST.
  function jstDow(at) {
    var d = new Date(at);
    if (Number.isNaN(d.getTime())) return null;
    try {
      var name = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Tokyo',
        weekday: 'short'
      }).format(d);
      var i = WEEKDAYS.indexOf(name);
      return i < 0 ? d.getDay() : i;
    } catch (err) {
      return d.getDay();
    }
  }

  function showDow(show) {
    if (!show) return null;
    var samples = [];
    if (show.focus && show.focus.at) samples.push(show.focus.at);
    if (show.nextSubAt) samples.push(show.nextSubAt);
    (show.nextEvents || []).forEach(function (e) { if (e && e.at) samples.push(e.at); });
    (show.upcomingSub || []).forEach(function (e) { if (e && e.at) samples.push(e.at); });
    for (var i = 0; i < samples.length; i += 1) {
      var dow = jstDow(samples[i]);
      if (dow != null) return dow;
    }
    if (show.airDow != null && show.airDow !== '') return Number(show.airDow);
    return null;
  }

  function findShow(id) {
    var lib = state.library || [];
    var hit = lib.find(function (s) { return String(s.id) === String(id); });
    if (hit) return hit;
    var days = (state.schedule && state.schedule.days) || [];
    for (var i = 0; i < days.length; i += 1) {
      hit = (days[i].shows || []).find(function (s) { return String(s.id) === String(id); });
      if (hit) return hit;
    }
    return null;
  }

  function rebuild() {
    var strip = document.querySelector('.week-strip');
    if (!strip) return;
    if (state.range === 'today' || state.range === 'library') return;

    var off = Number(state.weekOffset || 0);
    var origin = weekOrigin(off);

    // Keep live card nodes (listeners stay attached). Drop every column.
    var cards = [].slice.call(strip.querySelectorAll('[data-sid]'));
    var seen = {};
    cards = cards.filter(function (card) {
      var id = String(card.dataset.sid || '');
      if (!id || seen[id]) {
        card.remove();
        return false;
      }
      seen[id] = true;
      return true;
    });
    var sampleCards = strip.querySelector('.cards');
    var cardsClass = sampleCards ? sampleCards.className : 'cards';
    while (strip.firstChild) strip.removeChild(strip.firstChild);

    var laneStart = origin;
    var laneEnd = new Date(origin.getFullYear(), origin.getMonth(), origin.getDate() + 6);
    if (off === 0 && state.range === 'this_week') {
      var rolling = thisWeekBounds();
      laneStart = rolling.start;
      laneEnd = rolling.end;
    }

    // Exactly seven lanes, ordered from the current local day through the end of
    // the configured week. For "This week" we never backfill stale dates from the
    // earlier calendar week.
    var lanes = [];
    var i;
    for (i = 0; i < 7; i += 1) {
      var day = new Date(laneStart.getFullYear(), laneStart.getMonth(), laneStart.getDate() + i);
      if (off === 0 && state.range === 'this_week' && day > laneEnd) break;
      var col = document.createElement('section');
      col.className = 'day-col';
      col.dataset.date = localKey(day);
      col.dataset.dow = String(day.getDay());
      col.innerHTML = '<h3><span>' + fmtLane(day) + '</span></h3>';
      var box = document.createElement('div');
      box.className = cardsClass;
      col.appendChild(box);
      lanes.push(col);
    }

    // Seat each card on its JST weekday. Unknown → first lane rather than a ghost column.
    cards.forEach(function (card) {
      var show = findShow(card.dataset.sid);
      var dow = showDow(show);
      var dest = lanes[0];
      if (dow != null) {
        for (i = 0; i < lanes.length; i += 1) {
          if (Number(lanes[i].dataset.dow) === dow) dest = lanes[i];
        }
      }
      dest.querySelector('.cards').appendChild(card);
    });

    // This week only: start on local today, wrap the days already past.
    // Next / following weeks stay Sun…Sat (or Mon…Sun).
    if (off === 0) {
      var todayKey = localKey(new Date());
      var idx = -1;
      for (i = 0; i < lanes.length; i += 1) {
        if (lanes[i].dataset.date === todayKey) idx = i;
      }
      if (idx > 0) lanes = lanes.slice(idx).concat(lanes.slice(0, idx));
    }

    lanes.forEach(function (col) { strip.appendChild(col); });

    var label = document.querySelector('#week-label');
    if (label) label.textContent = fmtRange(off);
  }

  var orig = window.renderBoard;
  window.renderBoard = function () {
    if (typeof orig === 'function') orig();
    rebuild();
  };
  rebuild();
})();
