/*
 * Canonical schedule contract:
 * the server owns the week date layout. The browser renders it exactly as sent.
 * This file intentionally does not rebuild, rotate, or re-bucket the schedule.
 */
(function () {
  function syncWeekLabel() {
    const weekLabel = document.querySelector('#week-label');
    if (weekLabel && state.schedule && state.schedule.label) {
      weekLabel.textContent = state.schedule.label;
    }
  }

  const orig = window.renderBoard;
  window.renderBoard = function () {
    if (typeof orig === 'function') orig();
    syncWeekLabel();
  };
  syncWeekLabel();
})();
