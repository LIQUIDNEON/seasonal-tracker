#!/usr/bin/env bash
# Open Seasonal Tracker as a dedicated app window (GNOME / fallback).
# Starts the user service if it is not already listening.
set -euo pipefail

REPO="$(cd "$(dirname "$0")" && pwd)"
HOST="${SEASONAL_TRACKER_HOST:-127.0.0.1}"
PORT="${SEASONAL_TRACKER_PORT:-8765}"
URL="http://${HOST}:${PORT}/"
PROFILE="${XDG_CONFIG_HOME:-$HOME/.config}/seasonal-tracker/chrome-profile"

wait_for_server() {
  local i
  for i in $(seq 1 30); do
    if curl -fsS "$URL" >/dev/null 2>&1; then
      return 0
    fi
    sleep 0.2
  done
  return 1
}

if ! curl -fsS "$URL" >/dev/null 2>&1; then
  if systemctl --user start seasonal-tracker.service 2>/dev/null; then
    :
  else
    # Service not installed yet — run the server in the background for this session.
    "$REPO/launch.sh" --no-browser >/tmp/seasonal-tracker.log 2>&1 &
  fi
  wait_for_server || {
    echo "Backend did not start on $URL" >&2
    exit 1
  }
fi

mkdir -p "$PROFILE"

# Isolated profile so this window is not tied to the user's main browser session.
# --app hides the tab strip. --class is what KWin / GNOME match against.
CHROME_FLAGS=(
  "--app=$URL"
  "--window-size=1180,760"
  "--class=SeasonalTracker"
  "--user-data-dir=$PROFILE"
  "--no-first-run"
  "--no-default-browser-check"
)

pick() { command -v "$1" >/dev/null 2>&1; }

if pick google-chrome-stable; then
  exec google-chrome-stable "${CHROME_FLAGS[@]}"
elif pick google-chrome; then
  exec google-chrome "${CHROME_FLAGS[@]}"
elif pick chromium-browser; then
  exec chromium-browser "${CHROME_FLAGS[@]}"
elif pick chromium; then
  exec chromium "${CHROME_FLAGS[@]}"
elif pick brave-browser; then
  exec brave-browser "${CHROME_FLAGS[@]}"
elif pick firefox; then
  exec firefox --new-window "$URL"
else
  echo "Open $URL in a browser. Install Chromium for an app-style window." >&2
  exit 1
fi
