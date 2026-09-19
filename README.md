# Seasonal Tracker

Desktop widget for **Nobara Linux** that tracks the seasonal anime you actually care about.

Pin shows from the current season, then see **today / this week / next week / the following week** with posters, remaining episode counts, and separate **sub** and **English dub** progress.

## How the widget is put together

This is two processes on purpose:

1. **Backend** — `widget.py`, a local Python HTTP server on `http://127.0.0.1:8765`
2. **Face** — either a **KDE Plasma 6 plasmoid** (true desktop widget) or a **Chrome/Chromium `--app` window**

The plasmoid is a thin Qt WebEngine wrapper around that local UI. All catalog, schedule, and library logic stays in Python so GNOME and KDE can share it.

```
plasmashell  ──WebEngine──►  127.0.0.1:8765  ──►  AniList + AniSchedule
     or                                      └──►  ~/.config/seasonal-tracker/
Chrome --app
```

## Install as a desktop widget (Nobara)

```bash
git clone https://github.com/LIQUIDNEON/seasonal-tracker.git
cd seasonal-tracker
chmod +x install-desktop.sh launch.sh launch-window.sh
./install-desktop.sh
```

That will:

- start a **systemd user service** for the backend (`seasonal-tracker.service`)
- install a `.desktop` launcher
- on **KDE Plasma**, copy the plasmoid into `~/.local/share/plasma/plasmoids/`

### KDE Plasma 6 (Nobara Official / KDE spin)

1. Right-click the desktop → **Add Widgets…**
2. Search **Seasonal Tracker** and drag it onto the desktop
3. Resize it to the slice of screen you want
4. Optional: right-click the widget → **Configure Seasonal Tracker…** to change the backend URL

If the widget is missing after install:

```bash
kquitapp6 plasmashell && kstart6 plasmashell
sudo dnf install -y qt6-qtwebengine
```

### GNOME (Nobara Workstation) and other desktops

There is no GNOME “plasmoid” API that matches Plasma widgets. Use a dedicated app window:

```bash
./launch-window.sh
```

Then keep it on top / pin it to a workspace from the window menu. Add `seasonal-tracker` to Startup Applications if you want it at login. The backend service already autostarts via systemd.

## Dev launch (no install)

```bash
./launch.sh                 # server + app window
./launch.sh --no-browser    # server only
./launch.sh --port 9000
```

Needs Python 3.10+ and internet access. No pip packages.

## First-time use

1. Click **Add shows**
2. Pick the current or next season (or search)
3. Click posters to pin them
4. Switch **Today / This week / Next week / Following / My shows**
5. Click an episode square to mark it watched
6. **Rows ↔ Stacks** toggles the two remaining-episode layouts

## Uninstall the widget bits

```bash
./install-desktop.sh uninstall
```

Pins and watch progress in `~/.config/seasonal-tracker/` are left alone.

## Data sources

- Titles, posters, sub air times: [AniList](https://anilist.co)
- English dub air times and dubbed episode counts: [AniSchedule](https://github.com/RockinChaos/AniSchedule) / AnimeSchedule.net
- Your pins and watch counts: `~/.config/seasonal-tracker/library.json`

## Status

First pass plus a Plasma wrapper. Layout and tracking behavior will keep changing as we iterate.
