# Seasonal Tracker

Desktop widget for **Nobara Linux** (and other Linux desktops) that tracks the seasonal anime you actually care about.

Pin shows from the current season, then see **today / this week / next week / the following week** with posters, remaining episode counts, and separate **sub** and **English dub** progress.

## Features

- Add shows from AniList seasonal catalogs (MAL ids stored on every title)
- Filter the schedule to *your* list only
- Views: Today, This week, Next week, Following week, My shows
- Two layouts: horizontal rows or vertical stacks (poster at the bottom)
- Episode pips: aired, remaining, next up, locally watched
- Dub lag badge when the English dub is behind the sub
- Local library at `~/.config/seasonal-tracker/`

## Run

```bash
git clone https://github.com/LIQUIDNEON/seasonal-tracker.git
cd seasonal-tracker
chmod +x launch.sh
./launch.sh
```

Or:

```bash
python3 widget.py
```

Opens `http://127.0.0.1:8765/` in an app-style window when Chrome/Chromium is available.

- `--no-browser` — server only
- `--port 9000` — change the port

Needs Python 3.10+ and internet access. No pip packages.

## Nobara / KDE

1. Run `./launch.sh`
2. Resize the window to the slice of desktop you want
3. Title bar → More Actions → Keep Above Others
4. Optional autostart: copy `seasonal-tracker.desktop` to `~/.local/share/applications/`, set `Exec=` and `Path=` to this folder, then add it in System Settings → Autostart

## Data sources

- Titles, posters, sub air times: [AniList](https://anilist.co)
- English dub air times and dubbed episode counts: [AniSchedule](https://github.com/RockinChaos/AniSchedule) / AnimeSchedule.net
- Your pins and watch counts stay on disk: `~/.config/seasonal-tracker/library.json`

## Status

First pass. Layout and tracking behavior are expected to change as we iterate.
