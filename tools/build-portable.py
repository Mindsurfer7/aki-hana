#!/usr/bin/env python3
"""Create one self-contained HTML with all story voices embedded as data URIs.

Standard-library only. The normal index.html remains small for hosted use.
Run: python3 tools/build-portable.py --output dist/aki-hana-full.html
"""
import argparse
import base64
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MARKER = "\n<script>\n'use strict';"


def build(output: Path) -> None:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    assert html.count(MARKER) == 1, "Director script insertion point changed"
    voices = {}
    for i in range(22):
        path = ROOT / "voice" / f"{i:02}.mp3"
        if not path.is_file():
            raise FileNotFoundError(f"Missing recorded narration: {path}")
        voices[f"{i:02}"] = "data:audio/mpeg;base64," + base64.b64encode(path.read_bytes()).decode("ascii")
    # Inline before the director script so the voice loader sees embedded data on file:// URLs.
    bundled = "<script>\nwindow.AKI_HANA_VOICE = " + json.dumps(voices, separators=(",", ":")) + ";\n</script>\n"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(html.replace(MARKER, "\n" + bundled + MARKER, 1), encoding="utf-8")
    print(f"Wrote {output} with {len(voices)} narration tracks ({output.stat().st_size:,} bytes)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / "dist" / "aki-hana-full.html")
    build(parser.parse_args().output)
