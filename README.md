# Anime Seasonal Tracker

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
2. Find **Anime Seasonal Tracker** and drag it onto the desktop
3. Unlock widgets if needed, then drag the widget edges to resize
4. Click **Add shows** and pin the titles you care about

If the widget does not appear:

```bash
plasmashell --replace &
```

Then add the widget again.

Pins stay in `~/.config/seasonal-tracker/` if you uninstall.
