"""Recover original air weekday for finished pins.

AniList drops nextAiringEpisode when a title ends. Read historical
airingSchedule (cached) and write airDow (Sunday=0) into library.json.
"""
from __future__ import annotations
from tracker_lib import air_dow_from_history, load_library, save_library
def backfill() -> int:
    shows = load_library()
    wrote = 0
    for show in shows:
        if show.get("airDow") is not None or show.get("id") is None:
            continue
        dow = air_dow_from_history(int(show["id"]))
        if dow is None:
            continue
        show["airDow"] = int(dow)
        wrote += 1
    if wrote:
        save_library(shows)
    return wrote
