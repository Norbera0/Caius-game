"""Cut Caius sprites out of the reference sheet and inline them into the game.

Why: the user wants the in-game dog to be the reference art itself, not a
redraw. The sheet (assets/art/reference/dog_2.jpg) is six poses on white in a
3 x 2 grid. This script removes the white, crops each pose, writes WebP files
to assets/art/caius/ and replaces the SPRITES block in src/index.html with
base64 data URIs, so the game stays one self-contained file.

Usage: python3 tools/art/build_caius_sprites.py
"""
from __future__ import annotations

import base64
import io
import json
import re
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SHEET = ROOT / "assets/art/reference/dog_2.jpg"
OUT_DIR = ROOT / "assets/art/caius"
GAME = ROOT / "src/index.html"

# Grid position -> sprite name (row, column), read off the reference sheet.
NAMES = {
    (0, 0): "run_a",       # rear view, mid-stride, tongue out on the left
    (0, 1): "run_b",       # rear three-quarter, mid-stride, head to the right
    (0, 2): "jump",        # leaping away, hind legs extended
    (1, 0): "stand_rear",  # rear view, standing
    (1, 1): "side",        # side profile, standing
    (1, 2): "sit_front",   # sitting, facing the camera, tongue out
}
WHITE = 228            # a pixel brighter than this in every channel counts as paper
MIN_BG_COMPONENT = 40   # white areas smaller than this are highlights inside the art (eye glints)
WEBP_QUALITY = 88


def label_background(white: np.ndarray) -> np.ndarray:
    """White pixels in components larger than MIN_BG_COMPONENT (4-connected)."""
    h, w = white.shape
    seen = np.zeros_like(white, dtype=bool)
    bg = np.zeros_like(white, dtype=bool)
    for y0, x0 in zip(*np.nonzero(white)):
        if seen[y0, x0]:
            continue
        comp = []
        q = deque([(y0, x0)])
        seen[y0, x0] = True
        while q:
            y, x = q.popleft()
            comp.append((y, x))
            for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if 0 <= ny < h and 0 <= nx < w and white[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    q.append((ny, nx))
        if len(comp) >= MIN_BG_COMPONENT:
            ys, xs = zip(*comp)
            bg[list(ys), list(xs)] = True
    return bg


def spans(occupied: np.ndarray) -> list[tuple[int, int]]:
    """Runs of True in a 1-D array, as (start, end) half-open spans."""
    out, start = [], None
    for i, v in enumerate(occupied):
        if v and start is None:
            start = i
        elif not v and start is not None:
            out.append((start, i))
            start = None
    if start is not None:
        out.append((start, len(occupied)))
    return out


def main() -> None:
    rgb = np.asarray(Image.open(SHEET).convert("RGB")).astype(np.float32)
    white = (rgb > WHITE).all(axis=2)
    bg = label_background(white)
    fg = ~bg

    rows = [s for s in spans(fg.any(axis=1)) if s[1] - s[0] > 40]
    assert len(rows) == 2, rows
    meta = {}
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for r, (y0, y1) in enumerate(rows):
        cols = [s for s in spans(fg[y0:y1].any(axis=0)) if s[1] - s[0] > 40]
        assert len(cols) == 3, (r, cols)
        for c, (x0, x1) in enumerate(cols):
            sub_fg = fg[y0:y1, x0:x1]
            ys = np.nonzero(sub_fg.any(axis=1))[0]
            pad = 3
            cy0, cy1 = max(0, y0 + ys[0] - pad), min(fg.shape[0], y0 + ys[-1] + 1 + pad)
            cx0, cx1 = max(0, x0 - pad), min(fg.shape[1], x1 + pad)
            crop = rgb[cy0:cy1, cx0:cx1]
            m = fg[cy0:cy1, cx0:cx1]
            # Alpha: solid inside the art; on its rim, un-blend from the white paper
            # using the darkest channel so anti-aliased outlines stay smooth.
            rim = m & ~np.pad(m, 1, mode="edge")[2:, 1:-1] | m & ~np.pad(m, 1, mode="edge")[:-2, 1:-1] \
                | m & ~np.pad(m, 1, mode="edge")[1:-1, 2:] | m & ~np.pad(m, 1, mode="edge")[1:-1, :-2]
            a = np.where(m, 1.0, 0.0)
            edge_a = np.clip((255.0 - crop.min(axis=2)) / 200.0, 0.0, 1.0)
            a = np.where(rim, edge_a, a)
            safe = np.maximum(a, 1e-3)[..., None]
            color = np.clip((crop - 255.0 * (1.0 - a[..., None])) / safe, 0, 255)
            rgba = np.dstack([color, a * 255.0]).round().astype(np.uint8)
            img = Image.fromarray(rgba, "RGBA")
            name = NAMES[(r, c)]
            buf = io.BytesIO()
            img.save(buf, "WEBP", quality=WEBP_QUALITY, method=6)
            (OUT_DIR / f"{name}.webp").write_bytes(buf.getvalue())
            # Anchor: feet. x = median of the art's columns in its lowest 12% of rows.
            hh = m.shape[0]
            low = m[int(hh * 0.88):]
            fx = float(np.median(np.nonzero(low)[1])) if low.any() else m.shape[1] / 2
            meta[name] = {
                "w": int(m.shape[1]), "h": int(hh), "ax": round(fx, 1), "ay": int(hh - pad),
                "src": "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode("ascii"),
            }
            print(f"{name:11s} {m.shape[1]}x{hh}  {len(buf.getvalue()) / 1024:.1f} KB  feet x={fx:.0f}")

    (OUT_DIR / "sprites.json").write_text(json.dumps({k: {kk: vv for kk, vv in v.items() if kk != "src"} for k, v in meta.items()}, indent=2))
    block = "/* SPRITES:BEGIN — generated by tools/art/build_caius_sprites.py from assets/art/reference/dog_2.jpg; do not edit by hand */\nconst SPRITE_DATA = " + json.dumps(meta) + ";\n/* SPRITES:END */"
    html = GAME.read_text()
    pat = re.compile(r"/\* SPRITES:BEGIN.*?/\* SPRITES:END \*/", re.S)
    if pat.search(html):
        html = pat.sub(lambda _: block, html)
    else:
        marker = '"use strict";\n'
        assert marker in html
        html = html.replace(marker, marker + "\n" + block + "\n", 1)
    GAME.write_text(html)
    print(f"inlined {len(meta)} sprites into {GAME.relative_to(ROOT)} ({GAME.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
