from datetime import datetime, timezone

from tracker_lib import enrich_show, jst_weekday, rolling_week_bounds, schedule_window


def test_rolling_week_starts_today_and_runs_to_week_end() -> None:
    # Saturday 2026-09-19, Sunday-start week should only include today and the
    # remaining days in the same week, never the past days from the same week.
    start, end = rolling_week_bounds("sunday", datetime(2026, 9, 19, 12, 0, tzinfo=timezone.utc))
    assert start.isoformat() == "2026-09-19T00:00:00+00:00"
    assert end.isoformat() == "2026-09-27T00:00:00+00:00"


def test_jst_weekday_tracks_tokyo_broadcast_day() -> None:
    # 2026-09-20 17:00 JST is Sunday local time in Tokyo, even though it is
    # Saturday 2026-09-19 09:00 UTC.
    d = datetime(2026, 9, 19, 9, 0, tzinfo=timezone.utc)
    assert jst_weekday(d) == 0


def test_schedule_window_respects_offset_for_weekly_views() -> None:
    start, end, label = schedule_window("this_week", "sunday", offset=1, now=datetime(2026, 9, 19, 12, 0, tzinfo=timezone.utc))
    assert start.isoformat() == "2026-09-20T00:00:00+01:00"
    assert end.isoformat() == "2026-09-27T00:00:00+01:00"
    assert label == "20 Sep – 26 Sep"


def test_finished_show_keeps_its_last_known_airing_event() -> None:
    show = {
        "id": 1,
        "title": "Test Show",
        "episodes": 2,
        "status": "FINISHED",
        "nextSubEpisode": 2,
        "nextSubAt": "2020-01-01T12:00:00+00:00",
    }
    out = enrich_show(show, {}, {}, {})
    assert len(out["nextEvents"]) == 1
    assert out["nextEvents"][0]["episode"] == 2
