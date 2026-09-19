#!/usr/bin/env bash
# Foreground launcher used while developing.
# For the always-on desktop widget, prefer ./install-desktop.sh
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
export SEASONAL_TRACKER_PORT="${SEASONAL_TRACKER_PORT:-8765}"
cd "$DIR"
exec python3 "$DIR/widget.py" "$@"
