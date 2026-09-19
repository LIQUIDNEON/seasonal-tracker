#!/usr/bin/env python3
"""Seasonal Tracker data layer — AniList catalog and AniSchedule dub/sub feeds."""

from __future__ import annotations

import json
import os
import threading
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent
STATIC = ROOT / "static"
DATA_DIR = Path(os.environ.get("SEASONAL_TRACKER_HOME", Path.home() / ".config" / "seasonal-tracker"))
LIBRARY_PATH = DATA_DIR / "library.json"
SETTINGS_PATH = DATA_DIR / "settings.json"
CACHE_DIR = DATA_DIR / "cache"

ANILIST = "https://graphql.anilist.co"
ANISCHEDULE_RAW = "https://raw.githubusercontent.com/RockinChaos/AniSchedule/master/readable"
UA = "SeasonalTracker/0.1 (Nobara desktop widget; +local)"

DEFAULT_SETTINGS = {
    "layout": "rows",
    "theme": "dark",
    "compact": False,
    "showSub": True,
    "showDub": True,
    # split = separate SUB / DUB tracks; combined = one pip row, colour = air state
    "progressMode": "split",
    # stacks only: poster sits under the pips (bottom) or above them (top)
    "stackPoster": "bottom",
    "pickerLayout": "tiles",
    "weekStart": "sunday",
    "opacity": 0.97,
    "titleLanguage": "english",
}

SEASONS = ("WINTER", "SPRING", "SUMMER", "FALL")
