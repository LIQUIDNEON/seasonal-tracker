#!/usr/bin/env bash
# Install Seasonal Tracker as a desktop widget on Nobara / Fedora.
#
# KDE Plasma 6:
#   copies the plasmoid into ~/.local/share/plasma/plasmoids
#   and starts the Python backend as a systemd --user service.
#
# GNOME (or any DE):
#   still installs the user service so the UI is at 127.0.0.1:8765
#   then use ./launch-window.sh for a dedicated Chrome/Chromium app window.
set -euo pipefail

REPO="$(cd "$(dirname "$0")" && pwd)"
PLASMOID_ID="com.liquidneon.seasonaltracker"
PLASMOID_SRC="$REPO/plasmoid/$PLASMOID_ID"
PLASMOID_DST="${XDG_DATA_HOME:-$HOME/.local/share}/plasma/plasmoids/$PLASMOID_ID"
UNIT_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
APP_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/applications"
MODE="${1:-install}"

need() {
  command -v "$1" >/dev/null 2>&1
}

install_service() {
  mkdir -p "$UNIT_DIR"
  sed "s|@REPO@|$REPO|g" "$REPO/packaging/seasonal-tracker.service.in" \
    > "$UNIT_DIR/seasonal-tracker.service"
  systemctl --user daemon-reload
  systemctl --user enable --now seasonal-tracker.service
}

install_desktop_entry() {
  mkdir -p "$APP_DIR"
  cat > "$APP_DIR/seasonal-tracker.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Seasonal Tracker
Comment=Seasonal anime episode tracker
Exec=$REPO/launch-window.sh
Path=$REPO
Icon=video-x-generic
Terminal=false
Categories=AudioVideo;Utility;
StartupWMClass=SeasonalTracker
EOF
}

install_plasmoid() {
  if [[ ! -d "$PLASMOID_SRC" ]]; then
    echo "Missing plasmoid at $PLASMOID_SRC" >&2
    exit 1
  fi
  mkdir -p "$(dirname "$PLASMOID_DST")"
  rm -rf "$PLASMOID_DST"
  cp -a "$PLASMOID_SRC" "$PLASMOID_DST"
}

uninstall() {
  systemctl --user disable --now seasonal-tracker.service 2>/dev/null || true
  rm -f "$UNIT_DIR/seasonal-tracker.service"
  rm -rf "$PLASMOID_DST"
  rm -f "$APP_DIR/seasonal-tracker.desktop"
  systemctl --user daemon-reload 2>/dev/null || true
  echo "Removed user service, desktop entry, and plasmoid."
  echo "Library data in ~/.config/seasonal-tracker was left in place."
}

if [[ "$MODE" == "uninstall" ]]; then
  uninstall
  exit 0
fi

if [[ "$MODE" != "install" ]]; then
  echo "Usage: $0 [install|uninstall]" >&2
  exit 1
fi

if ! need python3; then
  echo "python3 is required." >&2
  exit 1
fi

chmod +x "$REPO/launch.sh" "$REPO/launch-window.sh" "$REPO/install-desktop.sh"
install_service
install_desktop_entry

SESSION="${XDG_CURRENT_DESKTOP:-}"
if [[ "$SESSION" == *KDE* || "$SESSION" == *Plasma* ]]; then
  install_plasmoid
  echo
  echo "Installed Plasma widget: Seasonal Tracker"
  echo "  1. Right-click the desktop → Add Widgets…"
  echo "  2. Search for “Seasonal Tracker” and drag it onto the desktop"
  echo "  3. Resize it to the slice of screen you want"
  echo
  echo "If it does not appear yet:"
  echo "  kquitapp6 plasmashell && kstart6 plasmashell"
  echo
  echo "Needs Qt WebEngine (usually already on Nobara KDE):"
  echo "  sudo dnf install -y qt6-qtwebengine"
else
  echo
  echo "Non-Plasma session detected (${SESSION:-unknown})."
  echo "Backend is running. Open a dedicated window with:"
  echo "  $REPO/launch-window.sh"
  echo
  echo "On GNOME: use the window’s title-bar menu to keep it on top,"
  echo "or add this .desktop to Startup Applications."
fi

echo
echo "Backend:  systemctl --user status seasonal-tracker.service"
echo "UI:       http://127.0.0.1:8765/"
echo "Library:  ~/.config/seasonal-tracker/"
