# Seasonal Tracker

A desktop widget for **Nobara Linux** that tracks the seasonal anime you actually watch.

Pin this season’s shows, then use **Today / This week / Next week / Following / My shows** to see posters and how many episodes are left — sub and English dub separately.

## Install

```bash
git clone https://github.com/LIQUIDNEON/seasonal-tracker.git
cd seasonal-tracker
chmod +x install-desktop.sh launch.sh launch-window.sh
./install-desktop.sh
```

That starts the backend at login and, on KDE, installs the desktop widget.

### KDE Plasma (Nobara Official / KDE spin)

1. Right-click the desktop → **Add Widgets…**
2. Find **Seasonal Tracker** and drag it onto the desktop
3. Unlock widgets if needed, then drag the widget edges to resize
4. Click **Add shows** and pin the titles you care about

If the widget does not appear:

```bash
kquitapp6 plasmashell
kstart plasmashell
# or: systemctl --user restart plasma-plasmashell.service
sudo dnf install -y qt6-qtwebengine
```

### GNOME and other desktops

```bash
./launch-window.sh
```

Resize that window like any other app. Pin it to a workspace or set it always-on-top from the window menu.

## Using it

1. **Add shows** — pick the current season or search
2. Switch **Today / This week / Next week / Following / My shows**
3. **Rows / Stacks** — two layouts for remaining episodes
4. **Compact** — poster + remaining-count tiles only
5. Click an episode square to mark it watched
6. Bottom bar — ranges on the left, compact / layout / minimal / float / settings on the right

Finished series get a green card border.

Your pins stay in `~/.config/seasonal-tracker/` if you uninstall the widget.

```bash
./install-desktop.sh uninstall
```

## After an update

```bash
git pull --ff-only
```

Then **Settings → Reload widget**, or:

```bash
systemctl --user restart seasonal-tracker.service
```

How the backend, Plasma wrapper, and data sources fit together is in [TECH.md](TECH.md).
