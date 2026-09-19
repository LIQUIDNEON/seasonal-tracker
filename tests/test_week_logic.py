from datetime import datetime, timezone

from tracker_lib import rolling_week_bounds, jst_weekday


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
