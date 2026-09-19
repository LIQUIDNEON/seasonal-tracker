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
    "weekStart": "sunday",
    "opacity": 0.97,
    "titleLanguage": "english",
}

SEASONS = ("WINTER", "SPRING", "SUMMER", "FALL")


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def season_of(dt: datetime | None = None) -> tuple[str, int]:
    dt = dt or now_utc()
    m = dt.month
    if m <= 3:
        return "WINTER", dt.year
    if m <= 6:
        return "SPRING", dt.year
    if m <= 9:
        return "SUMMER", dt.year
    return "FALL", dt.year


def next_season(season: str, year: int) -> tuple[str, int]:
    i = SEASONS.index(season)
    if i == 3:
        return "WINTER", year + 1
    return SEASONS[i + 1], year


def week_bounds(offset: int, week_start: str = "sunday") -> tuple[datetime, datetime]:
    local = datetime.now().astimezone()
    start_weekday = 6 if week_start == "sunday" else 0
    days_since = (local.weekday() - start_weekday) % 7
    start = (local - timedelta(days=days_since)).replace(hour=0, minute=0, second=0, microsecond=0)
    start = start + timedelta(days=7 * offset)
    return start, start + timedelta(days=7)


def today_bounds() -> tuple[datetime, datetime]:
    local = datetime.now().astimezone()
    start = local.replace(hour=0, minute=0, second=0, microsecond=0)
    return start, start + timedelta(days=1)


def parse_airing(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(int(value), tz=timezone.utc)
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    return None


def http_json(url: str, payload: dict | None = None, timeout: int = 25) -> Any:
    body = None if payload is None else json.dumps(payload).encode()
    headers = {"User-Agent": UA, "Accept": "application/json"}
    if body is not None:
        headers["Content-Type"] = "application/json"
    req = Request(url, data=body, headers=headers)
    with urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode())


def cache_get(name: str, ttl: int) -> Any | None:
    path = CACHE_DIR / name
    if not path.exists():
        return None
    age = time.time() - path.stat().st_mtime
    if age > ttl:
        return None
    try:
        return json.loads(path.read_text())
    except json.JSONDecodeError:
        return None


def cache_set(name: str, data: Any) -> None:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    path = CACHE_DIR / name
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(data))
    tmp.replace(path)


def load_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text())
    except json.JSONDecodeError:
        return default


def save_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, indent=2))
    tmp.replace(path)


def load_library() -> list[dict]:
    data = load_json(LIBRARY_PATH, {"shows": []})
    if isinstance(data, list):
        return data
    return data.get("shows", [])


def save_library(shows: list[dict]) -> None:
    save_json(LIBRARY_PATH, {"shows": shows})


def load_settings() -> dict:
    stored = load_json(SETTINGS_PATH, {})
    out = dict(DEFAULT_SETTINGS)
    out.update(stored if isinstance(stored, dict) else {})
    return out


class DataHub:
    def anilist(self, query: str, variables: dict | None = None) -> dict:
        return http_json(ANILIST, {"query": query, "variables": variables or {}})

    def fetch_season(self, season: str, year: int, page: int = 1) -> dict:
        key = f"season-{season}-{year}-p{page}.json"
        cached = cache_get(key, ttl=6 * 3600)
        if cached is not None:
            return cached
        query = """
        query ($page: Int, $season: MediaSeason, $seasonYear: Int) {
          Page(page: $page, perPage: 50) {
            pageInfo { currentPage hasNextPage lastPage total }
            media(season: $season, seasonYear: $seasonYear, type: ANIME, sort: POPULARITY_DESC) {
              id idMal title { romaji english native }
              episodes format status season seasonYear genres averageScore duration isAdult siteUrl
              coverImage { large medium color }
              nextAiringEpisode { episode airingAt timeUntilAiring }
              startDate { year month day }
            }
          }
        }
        """
        raw = self.anilist(query, {"page": page, "season": season, "seasonYear": year})
        cache_set(key, raw)
        return raw

    def search(self, q: str) -> dict:
        query = """
        query ($q: String) {
          Page(page: 1, perPage: 20) {
            media(search: $q, type: ANIME, sort: SEARCH_MATCH) {
              id idMal title { romaji english native }
              episodes format status season seasonYear genres averageScore isAdult siteUrl
              coverImage { large medium color }
              nextAiringEpisode { episode airingAt timeUntilAiring }
            }
          }
        }
        """
        return self.anilist(query, {"q": q})

    def media_details(self, media_id: int) -> dict:
        key = f"media-{media_id}.json"
        cached = cache_get(key, ttl=30 * 60)
        if cached is not None:
            return cached
        query = """
        query ($id: Int) {
          Media(id: $id, type: ANIME) {
            id idMal title { romaji english native }
            episodes format status season seasonYear genres averageScore duration isAdult siteUrl
            description(asHtml: false)
            coverImage { large medium color }
            bannerImage
            nextAiringEpisode { episode airingAt timeUntilAiring }
            airingSchedule(notYetAired: false, perPage: 25) { nodes { episode airingAt } }
          }
        }
        """
        raw = self.anilist(query, {"id": media_id})
        cache_set(key, raw)
        return raw

    def sub_schedule(self) -> list[dict]:
        cached = cache_get("sub-schedule.json", ttl=20 * 60)
        if cached is not None:
            return cached
        data = http_json(f"{ANISCHEDULE_RAW}/sub-schedule-readable.json")
        cache_set("sub-schedule.json", data)
        return data

    def dub_schedule(self) -> list[dict]:
        cached = cache_get("dub-schedule.json", ttl=20 * 60)
        if cached is not None:
            return cached
        data = http_json(f"{ANISCHEDULE_RAW}/dub-schedule-readable.json")
        cache_set("dub-schedule.json", data)
        return data

    def dub_feed_index(self) -> dict[int, dict]:
        cached = cache_get("dub-feed-index.json", ttl=20 * 60)
        if cached is not None:
            return {int(k): v for k, v in cached.items()}
        raw = http_json(f"{ANISCHEDULE_RAW}/dub-episode-feed-readable.json")
        index: dict[int, dict] = {}
        if isinstance(raw, list):
            for item in raw:
                mid = item.get("id")
                if mid is None:
                    continue
                prev = index.get(int(mid))
                aired = ((item.get("episode") or {}).get("aired")) or 0
                if prev is None or aired >= ((prev.get("episode") or {}).get("aired") or 0):
                    index[int(mid)] = item
        cache_set("dub-feed-index.json", {str(k): v for k, v in index.items()})
        return index


HUB = DataHub()


def pick_title(title: dict | None, lang: str) -> str:
    title = title or {}
    if lang == "romaji":
        return title.get("romaji") or title.get("english") or title.get("native") or "Untitled"
    return title.get("english") or title.get("romaji") or title.get("native") or "Untitled"


def compact_media(media: dict, lang: str) -> dict:
    nxt = media.get("nextAiringEpisode") or {}
    cover = media.get("coverImage") or {}
    return {
        "id": media.get("id"),
        "idMal": media.get("idMal"),
        "title": pick_title(media.get("title"), lang),
        "titles": media.get("title") or {},
        "episodes": media.get("episodes"),
        "format": media.get("format"),
        "status": media.get("status"),
        "season": media.get("season"),
        "seasonYear": media.get("seasonYear"),
        "genres": media.get("genres") or [],
        "score": media.get("averageScore"),
        "duration": media.get("duration"),
        "isAdult": media.get("isAdult"),
        "siteUrl": media.get("siteUrl"),
        "cover": cover.get("large") or cover.get("medium"),
        "color": cover.get("color"),
        "nextSubEpisode": nxt.get("episode"),
        "nextSubAt": nxt.get("airingAt"),
    }


def enrich_show(show: dict, sub_map: dict[int, dict], dub_map: dict[int, dict], dub_feed: dict[int, dict]) -> dict:
    sid = int(show["id"])
    sub = sub_map.get(sid) or {}
    dub = dub_map.get(sid)
    feed = dub_feed.get(sid) or {}
    total = show.get("episodes")
    next_sub_ep = show.get("nextSubEpisode")
    next_sub_at = parse_airing(show.get("nextSubAt"))
    sub_nodes = ((sub.get("airingSchedule") or {}).get("nodes")) or []
    upcoming_sub = []
    latest_sub_aired = None
    for node in sub_nodes:
        when = parse_airing(node.get("airingAt"))
        ep = node.get("episode")
        if when is None or ep is None:
            continue
        upcoming_sub.append({"episode": ep, "at": when.isoformat(), "ts": int(when.timestamp())})
        if when <= now_utc():
            latest_sub_aired = ep if latest_sub_aired is None else max(latest_sub_aired, ep)
    if next_sub_ep and latest_sub_aired is None:
        latest_sub_aired = max(0, int(next_sub_ep) - 1)
    if show.get("nextSubAt") and show.get("nextSubEpisode"):
        when = parse_airing(show.get("nextSubAt"))
        if when:
            upcoming_sub = [{"episode": show["nextSubEpisode"], "at": when.isoformat(), "ts": int(when.timestamp())}] + [
                n for n in upcoming_sub if n.get("episode") != show["nextSubEpisode"]
            ]
    sub_aired = latest_sub_aired
    if sub_aired is None and next_sub_ep:
        sub_aired = max(0, int(next_sub_ep) - 1)
    if sub_aired is None and total and show.get("status") == "FINISHED":
        sub_aired = total
    dub_ep_num = None
    dub_at = None
    dub_delayed = False
    if dub:
        dub_ep_num = dub.get("episodeNumber")
        dub_at = parse_airing(dub.get("episodeDate"))
        dub_delayed = bool(dub.get("delayedIndefinitely") or dub.get("delayedText"))
        inner = ((dub.get("media") or {}).get("media")) or {}
        if not show.get("cover"):
            cover = inner.get("coverImage") or {}
            show["cover"] = cover.get("extraLarge") or cover.get("medium")
            show["color"] = show.get("color") or cover.get("color")
    feed_aired = ((feed.get("episode") or {}).get("aired"))
    dub_aired = feed_aired
    if dub_aired is None and dub_ep_num is not None:
        if dub_at and dub_at > now_utc():
            dub_aired = max(0, int(dub_ep_num) - 1)
        else:
            dub_aired = int(dub_ep_num)
    remaining_sub = None
    remaining_dub = None
    if total is not None and sub_aired is not None:
        remaining_sub = max(0, int(total) - int(sub_aired))
    if total is not None and dub_aired is not None:
        remaining_dub = max(0, int(total) - int(dub_aired))
    lag = None
    if sub_aired is not None and dub_aired is not None:
        lag = max(0, int(sub_aired) - int(dub_aired))
    next_events = []
    if next_sub_at:
        when = next_sub_at if isinstance(next_sub_at, datetime) else parse_airing(next_sub_at)
        if when:
            next_events.append({"kind": "sub", "episode": next_sub_ep, "at": when.isoformat(), "ts": int(when.timestamp())})
    if not any(e["kind"] == "sub" for e in next_events):
        future_sub = [n for n in upcoming_sub if n.get("ts") and n["ts"] >= time.time() - 3600]
        if future_sub:
            nxt = min(future_sub, key=lambda n: n["ts"])
            next_events.append({"kind": "sub", "episode": nxt["episode"], "at": nxt["at"], "ts": nxt["ts"]})
    if dub_at and dub_ep_num and not (dub.get("delayedIndefinitely") if dub else False):
        next_events.append({"kind": "dub", "episode": dub_ep_num, "at": dub_at.isoformat(), "ts": int(dub_at.timestamp())})
    out = dict(show)
    out.update({
        "subAired": sub_aired,
        "dubAired": dub_aired,
        "remainingSub": remaining_sub,
        "remainingDub": remaining_dub,
        "dubLag": lag,
        "dubDelayed": dub_delayed,
        "nextEvents": sorted(next_events, key=lambda e: e["ts"]),
        "upcomingSub": upcoming_sub[:8],
        "hasDubSchedule": dub is not None,
    })
    return out


def build_maps() -> tuple[dict[int, dict], dict[int, dict], dict[int, dict]]:
    sub_map: dict[int, dict] = {}
    try:
        for item in HUB.sub_schedule():
            if item.get("id") is not None:
                sub_map[int(item["id"])] = item
    except (URLError, HTTPError, TimeoutError, json.JSONDecodeError):
        pass
    dub_map: dict[int, dict] = {}
    try:
        for item in HUB.dub_schedule():
            inner = ((item.get("media") or {}).get("media")) or {}
            mid = inner.get("id")
            if mid is not None:
                dub_map[int(mid)] = item
    except (URLError, HTTPError, TimeoutError, json.JSONDecodeError):
        pass
    try:
        dub_feed = HUB.dub_feed_index()
    except (URLError, HTTPError, TimeoutError, json.JSONDecodeError):
        dub_feed = {}
    return sub_map, dub_map, dub_feed


def event_in_range(events: list[dict], start: datetime, end: datetime) -> list[dict]:
    hits = []
    for ev in events:
        when = parse_airing(ev.get("at"))
        if when is None:
            continue
        local = when.astimezone()
        if start <= local < end:
            hits.append(ev)
    return hits
