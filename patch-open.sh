#!/usr/bin/env python3
"""Insert /api/open into widget.py if this checkout does not have it."""
from pathlib import Path
import sys

p = Path(__file__).resolve().parent / "widget.py"
text = p.read_text()
if 'parsed.path == "/api/open"' in text:
    print("widget.py already has /api/open")
    sys.exit(0)

needle = "body = self._read_json()"
if needle not in text:
    print("Could not find do_POST body read in widget.py", file=sys.stderr)
    sys.exit(1)

insert = '''body = self._read_json()
            if parsed.path == "/api/open":
                url = str((body or {}).get("url") or "")
                if url.startswith("https://anime.nexus/") or url.startswith("http://anime.nexus/"):
                    from shutil import which
                    import subprocess
                    import webbrowser
                    if which("xdg-open"):
                        subprocess.Popen(["xdg-open", url], start_new_session=True)
                    elif which("kde-open5"):
                        subprocess.Popen(["kde-open5", url], start_new_session=True)
                    else:
                        webbrowser.open(url)
                    self._send(200, {"ok": True})
                else:
                    self._send(400, {"error": "blocked url"})
                return'''

p.write_text(text.replace(needle, insert, 1))
print("Patched", p)
