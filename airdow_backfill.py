"""Recover original air weekday for finished pins.

AniList drops nextAiringEpisode when a title ends. Read historical
airingSchedule and write airDow (Sunday=0) into library.json.
"""
from __future__ import annotations
from urllib.error import HTTPError, URLError
from tracker_lib import HUB, load_library, parse_airing, save_library

def dow_from_history(media_id: int):
    try:
        raw = HUB.media_details(int(media_id))
    except (URLError, HTTPError, TimeoutError, TypeError, ValueError):
        return None
    media = ((raw or {}).get("data") or {}).get("Media") or {}
    nodes = ((media.get("airingSchedule") or {}).get("nodes")) or []
    for node in nodes:
        when = parse_airing(node.get("airingAt"))
        if when:
            return (when.astimezone().weekday() + 1) % 7
    return None

def backfill() -> int:
    shows = load_library()
    wrote = 0
    for show in shows:
        if show.get("airDow") is not None or show.get("id") is None:
            continue
        dow = dow_from_history(int(show["id"]))
        if dow is None:
            continue
        show["airDow"] = int(dow)
        wrote += 1
    if wrote:
        save_library(shows)
    return wrote

if __name__ == "__main__":
    n = backfill()
    print(f"Stored weekday for {n} pinned show(s)")
