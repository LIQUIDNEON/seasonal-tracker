# Seasonal Tracker — internals

## Architecture

Two processes on purpose:

1. **Backend** — `widget.py`, a local Python HTTP server on `http://127.0.0.1:8765`
2. **Face** — a **KDE Plasma 6 plasmoid** (Qt WebEngine) or a **Chrome/Chromium `--app` window**

Catalog, schedule, and library logic stay in Python so KDE and GNOME share one UI.

```
plasmashell  ──WebEngine──►  127.0.0.1:8765  ──►  AniList + AniSchedule
     or                                      └──►  ~/.config/seasonal-tracker/
Chrome --app
```

The plasmoid is `plasmoid/com.liquidneon.seasonaltracker`. Install copies it to `~/.local/share/plasma/plasmoids/`.

## Dev launch (no install)

```bash
./launch.sh                 # server + app window
./launch.sh --no-browser    # server only
./launch.sh --port 9000
python3 widget.py --no-browser
```

Needs Python 3.10+ and internet. No pip packages.

## Service

```bash
systemctl --user status seasonal-tracker.service
systemctl --user restart seasonal-tracker.service
```

Unit template: `packaging/seasonal-tracker.service.in` (`Restart=always`).

`POST /api/reload` restarts that unit (or re-execs the process) so `widget.py` / `tracker_lib.py` pick up. Static HTML/CSS/JS are served with `Cache-Control: no-store`; **Reload UI** cache-busts the page.

## Data

| What | Where |
| --- | --- |
| Titles, posters, sub air times | [AniList](https://anilist.co) GraphQL (`idMal` stored on every show) |
| English dub air times / dubbed episode counts | [AniSchedule](https://github.com/RockinChaos/AniSchedule) readable JSON |
| Pins and watch counts | `~/.config/seasonal-tracker/library.json` |
| Settings | `~/.config/seasonal-tracker/settings.json` |
| HTTP cache | `~/.config/seasonal-tracker/cache/` |

## Layout notes

- **Rows** — poster + horizontal episode pips
- **Stacks** — poster + vertical pip columns; poster top/bottom is a toolbar control
- **Compact** — poster + remaining-count tiles (sub cyan, dub gold). No pip breakdown
- Week views scroll sideways; day columns size to their cards
- Finished shows (`status == FINISHED` or all known sub episodes aired) get a green card border

## Resizing

Plasma desktop widgets are resizable from the frame when widgets are **unlocked** (right-click desktop → Unlock Widgets). The plasmoid only sets a minimum size; it does not lock the box.

The Chrome `--app` window is a normal window and resizes with the window manager.

The web UI is container-aware: cards flex and wrap to the widget width. Extreme panel-thin sizes still work, but week strips will scroll sideways first.
