"""Cut Caius and treat sprites out of the reference art and inline them into the game.

Why: the user wants the in-game dog to be the reference art itself, not a
redraw. The sheet (assets/art/reference/dog_2.jpg) is six poses on white in a
3 x 2 grid. This script removes the white, crops each pose, writes WebP files
to assets/art/caius/ and replaces the SPRITES block in src/index.html with
base64 data URIs, so the game stays one self-contained file.

The treat (assets/art/reference/banana_penguin.jpg, a penguin in a banana) is cut
the same way, except that only white touching the image border counts as paper:
the penguin's white face is enclosed by its outline and must stay.

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
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
SHEET = ROOT / "assets/art/reference/dog_2.jpg"
TREAT = ROOT / "assets/art/reference/banana_penguin.jpg"
TREAT_HEIGHT = 240      # px; the treat is never drawn taller than ~200 device px
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
MATTED: dict[str, np.ndarray] = {}  # name -> full-resolution RGBA, kept for rigging

# Sprites the game draws as whole pictures; the rest are only rigged or kept on disk.
INLINE = {"banana_penguin"}

# --- Rigs -----------------------------------------------------------------------
# A rig cuts one pose into pieces that the game moves separately (puppet animation),
# so Caius moves continuously instead of flipping between pictures.
#   piece: polygon of the pixels the piece carries (extends under the body at joints)
#   cut:   polygon the piece takes away from the body layer (stops short of joints,
#          so the body still covers the seam when the piece moves)
#   pivot: joint the piece rotates around, in sprite pixels
# "order" is back to front. Where cut polygons overlap, the piece drawn later owns
# the pixels; the piece behind gets that area inpainted from its own colours, so
# moving the front piece never reveals a hole.
RIGS = {
    "rig_run": {
        "sprite": "run_a",
        "order": ["legFR", "legFL", "legHR", "legHL", "tail", "head", "tongue", "body"],
        "pieces": {
            "head":   {"piece": [(0, 0), (135, 0), (132, 60), (118, 92), (95, 112), (65, 128), (30, 132), (0, 128)],
                       "cut":   [(0, 0), (135, 0), (130, 50), (112, 72), (90, 86), (62, 96), (38, 100), (0, 100)], "pivot": (80, 100),
                       "no_fill_from": ["tongue"]},  # behind the tongue is open air, not more head
            "tongue": {"piece": [(4, 66), (42, 64), (44, 94), (36, 120), (12, 120), (2, 100)],
                       "cut":   [(4, 66), (42, 64), (44, 94), (36, 120), (12, 120), (2, 100)], "pivot": (30, 74),
                       "keep": "pink"},  # only the tongue itself, not the mouth line behind it
            "tail":   {"piece": [(188, 92), (240, 98), (300, 138), (350, 158), (350, 200), (290, 202), (240, 196), (215, 180), (190, 150)],
                       "cut":   [(206, 96), (240, 98), (300, 138), (350, 158), (350, 200), (290, 202), (240, 196), (222, 182), (212, 150)], "pivot": (204, 112)},
            # Leg cuts start below the feathered "trousers", so that fur stays on the body.
            "legFL":  {"piece": [(48, 185), (98, 190), (100, 235), (102, 296), (72, 296), (50, 262)],
                       "cut":   [(50, 225), (96, 215), (100, 235), (102, 296), (72, 296), (50, 262)], "pivot": (74, 205)},
            "legHL":  {"piece": [(112, 190), (138, 192), (140, 245), (146, 265), (160, 290), (158, 318), (128, 318), (113, 280)],
                       "cut":   [(114, 218), (136, 218), (140, 245), (146, 265), (160, 290), (158, 318), (128, 318), (113, 280)], "pivot": (125, 210)},
            "legHR":  {"piece": [(148, 225), (192, 228), (190, 290), (180, 330), (178, 362), (142, 362), (150, 330), (162, 310), (150, 280)],
                       "cut":   [(150, 262), (190, 262), (190, 290), (180, 330), (178, 362), (142, 362), (150, 330), (162, 310), (150, 280)], "pivot": (170, 240)},
            "legFR":  {"piece": [(188, 205), (220, 205), (215, 270), (205, 300), (192, 308), (186, 280)],
                       "cut":   [(190, 240), (218, 236), (215, 270), (205, 300), (192, 308), (188, 280)], "pivot": (202, 220)},
        },
        "orphans": "(y >= 262) | ((x < 110) & (y >= 232))",
        # Caius's tongue has a dark spot on his left side (visible on the reference's
        # front pose); in this rear view his left is the viewer's left.
        "spots": [{"piece": "tongue", "center": (15, 106), "radius": (3.6, 4.6), "color": (120, 45, 52)}],
    },
    "rig_sit": {
        "sprite": "sit_front",
        "order": ["body", "head", "tongue"],
        "pieces": {
            "head":   {"piece": [(8, 0), (182, 0), (186, 112), (150, 138), (95, 146), (40, 138), (4, 112)],
                       "cut":   [(8, 0), (182, 0), (186, 112), (150, 138), (95, 146), (40, 138), (4, 112)], "pivot": (95, 135)},
            "tongue": {"piece": [(70, 76), (102, 76), (102, 129), (70, 129)],
                       "cut":   [(70, 76), (102, 76), (102, 129), (70, 129)], "pivot": (87, 80)},
        },
        "spots": [],
        "fill_body": True,  # the face sits in front of the chest: paint chest fur under it
    },
}


def label_background(white: np.ndarray, border_only: bool = False) -> np.ndarray:
    """White pixels in background components (4-connected).

    Default: every component larger than MIN_BG_COMPONENT. border_only: only
    components that touch the image border (keeps enclosed white like a face).
    """
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
        ys_, xs_ = zip(*comp)
        touches = min(ys_) == 0 or min(xs_) == 0 or max(ys_) == h - 1 or max(xs_) == w - 1
        if (touches if border_only else len(comp) >= MIN_BG_COMPONENT):
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


def encode(name: str, crop: np.ndarray, m: np.ndarray, pad: int, max_h: int | None = None) -> dict:
    """Matte one crop off white, save it as WebP and return its SPRITE_DATA entry."""
    # Alpha: solid inside the art; on its rim, un-blend from the white paper
    # using the darkest channel so anti-aliased outlines stay smooth.
    e = np.pad(m, 1, mode="edge")
    rim = m & (~e[2:, 1:-1] | ~e[:-2, 1:-1] | ~e[1:-1, 2:] | ~e[1:-1, :-2])
    a = np.where(m, 1.0, 0.0)
    edge_a = np.clip((255.0 - crop.min(axis=2)) / 200.0, 0.0, 1.0)
    a = np.where(rim, edge_a, a)
    safe = np.maximum(a, 1e-3)[..., None]
    color = np.clip((crop - 255.0 * (1.0 - a[..., None])) / safe, 0, 255)
    img = Image.fromarray(np.dstack([color, a * 255.0]).round().astype(np.uint8), "RGBA")
    MATTED[name] = np.asarray(img).copy()
    scale = 1.0
    if max_h and img.height > max_h:
        scale = max_h / img.height
        img = img.resize((round(img.width * scale), max_h), Image.LANCZOS)
        m = np.asarray(img)[..., 3] > 127
        pad = round(pad * scale)
    buf = io.BytesIO()
    img.save(buf, "WEBP", quality=WEBP_QUALITY, method=6)
    (OUT_DIR / f"{name}.webp").write_bytes(buf.getvalue())
    # Anchor: feet. x = median of the art's columns in its lowest 12% of rows.
    hh = m.shape[0]
    low = m[int(hh * 0.88):]
    fx = float(np.median(np.nonzero(low)[1])) if low.any() else m.shape[1] / 2
    print(f"{name:15s} {m.shape[1]}x{hh}  {len(buf.getvalue()) / 1024:.1f} KB  feet x={fx:.0f}")
    return {
        "w": int(m.shape[1]), "h": int(hh), "ax": round(fx, 1), "ay": int(hh - pad),
        "src": "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode("ascii"),
    }


def poly_mask(shape: tuple[int, int], poly: list[tuple[int, int]]) -> np.ndarray:
    """Boolean mask of a polygon (sprite pixel coordinates)."""
    im = Image.new("L", (shape[1], shape[0]), 0)
    ImageDraw.Draw(im).polygon(poly, fill=255)
    return np.asarray(im) > 0


def pink_mask(rgba: np.ndarray, grow: int = 2) -> np.ndarray:
    """Tongue-coloured pixels (pink to dark red), grown by `grow` px to take their outline."""
    r, g, b = (rgba[..., i].astype(np.int32) for i in range(3))
    m = (r > 120) & (r - g > 45) & (b > g - 10) & (rgba[..., 3] > 0)
    for _ in range(grow):
        m = m | np.roll(m, 1, 0) | np.roll(m, -1, 0) | np.roll(m, 1, 1) | np.roll(m, -1, 1)
    return m


def inpaint(rgba: np.ndarray, hole: np.ndarray, iters: int = 80) -> np.ndarray:
    """Fill `hole` pixels with the mean colour of filled neighbours, growing inward."""
    out = rgba.astype(np.float32).copy()
    known = (out[..., 3] > 0) & ~hole
    todo = hole.copy()
    for _ in range(iters):
        if not todo.any():
            break
        acc = np.zeros(out.shape[:2] + (3,), np.float32)
        cnt = np.zeros(out.shape[:2], np.float32)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            k = np.roll(known, (dy, dx), axis=(0, 1))
            c = np.roll(out[..., :3], (dy, dx), axis=(0, 1))
            acc += c * k[..., None]
            cnt += k
        grow = todo & (cnt > 0)
        out[grow, :3] = acc[grow] / cnt[grow][:, None]
        out[grow, 3] = 255
        known |= grow
        todo &= ~grow
    return out.round().clip(0, 255).astype(np.uint8)


def paint_spot(rgba: np.ndarray, center: tuple[float, float], radius: tuple[float, float], color: tuple[int, int, int]) -> None:
    """Anti-aliased ellipse painted onto opaque pixels only (in place)."""
    h, w = rgba.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    d = ((xx - center[0]) / radius[0]) ** 2 + ((yy - center[1]) / radius[1]) ** 2
    cover = np.clip((1.0 - d) * radius[0] * 0.9, 0, 1) * (rgba[..., 3] / 255.0)
    for ch in range(3):
        rgba[..., ch] = (rgba[..., ch] * (1 - cover) + color[ch] * cover).round().astype(np.uint8)


def webp_entry(img: Image.Image) -> str:
    buf = io.BytesIO()
    img.save(buf, "WEBP", quality=WEBP_QUALITY, method=6)
    return "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode("ascii"), len(buf.getvalue())


def build_rig(name: str, spec: dict, base_meta: dict) -> dict:
    """Cut a pose into rig pieces; returns the rig's SPRITE_DATA entry."""
    src = MATTED[spec["sprite"]]
    shape = src.shape[:2]
    fg = src[..., 3] > 0
    pieces = spec["pieces"]
    order = spec["order"]
    cuts = {n: poly_mask(shape, p["cut"]) & fg & (pink_mask(src) if p.get("keep") == "pink" else True) for n, p in pieces.items()}
    # owner of each cut pixel: the front-most piece whose cut covers it
    owner = np.full(shape, "body", dtype=object)
    for n in order:
        if n != "body":
            owner[cuts[n]] = n
    # Stray limb pixels outside every cut polygon (below the body's lower edge) would
    # stay behind on the body while the legs move: give each to the nearest leg.
    orphan_rule = spec.get("orphans")
    if orphan_rule:
        yy, xx = np.mgrid[0:shape[0], 0:shape[1]]
        orphan = fg & (owner == "body") & eval(orphan_rule, {"x": xx, "y": yy})
        legs = [n for n in order if n.startswith("leg")]
        for _ in range(80):
            if not orphan.any():
                break
            for n in legs:
                m = owner == n
                grow = (np.roll(m, 1, 0) | np.roll(m, -1, 0) | np.roll(m, 1, 1) | np.roll(m, -1, 1)) & orphan
                owner[grow] = n
                orphan &= ~grow
        for n in legs:
            cuts[n] = cuts[n] | (owner == n)
    out = {"w": base_meta["w"], "h": base_meta["h"], "ax": base_meta["ax"], "ay": base_meta["ay"], "order": order, "pieces": {}}
    total = 0
    for n in order:
        if n == "body":
            keep = fg & (owner == "body")
            layer = src.copy()
            layer[~keep] = 0
            # Feather the body's edge along leg and tail cuts over a few pixels, so a
            # straight cut through fur blends into the piece behind it instead of
            # showing as a hard line when that piece moves.
            cut_any = np.zeros(shape, bool)
            for m in pieces:
                if m.startswith("leg") or m == "tail":
                    cut_any |= cuts[m]
            ring = cut_any.copy()
            for fade in (0.35, 0.6, 0.85):
                grown = ring | np.roll(ring, 1, 0) | np.roll(ring, -1, 0) | np.roll(ring, 1, 1) | np.roll(ring, -1, 1)
                edge = grown & ~ring & keep
                layer[edge, 3] = (layer[edge, 3] * fade).astype(np.uint8)
                ring = grown
            if spec.get("fill_body"):
                hole = np.zeros(shape, bool)
                for m in pieces:
                    hole |= cuts[m]
                layer = inpaint(layer, hole & fg)
            pivot = (base_meta["ax"], base_meta["ay"])
        else:
            area = (poly_mask(shape, pieces[n]["piece"]) & fg) | (owner == n)
            if pieces[n].get("keep") == "pink":
                area &= pink_mask(src)
            front = set(order[order.index(n) + 1:]) - {"body"}
            covered = area & np.isin(owner, list(front)) if front else np.zeros(shape, bool)
            layer = src.copy()
            layer[~area] = 0
            layer[covered] = 0
            skip = pieces[n].get("no_fill_from", [])
            layer = inpaint(layer, covered & ~np.isin(owner, skip))
            for sp in spec.get("spots", []):
                if sp["piece"] == n:
                    paint_spot(layer, sp["center"], sp["radius"], sp["color"])
            pivot = pieces[n]["pivot"]
        ys, xs = np.nonzero(layer[..., 3] > 0)
        x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
        img = Image.fromarray(layer[y0:y1, x0:x1], "RGBA")
        img.save(OUT_DIR / f"{name}_{n}.webp", "WEBP", quality=WEBP_QUALITY, method=6)
        src_uri, size = webp_entry(img)
        total += size
        out["pieces"][n] = {"x": int(x0), "y": int(y0), "w": int(x1 - x0), "h": int(y1 - y0), "px": pivot[0], "py": pivot[1], "src": src_uri}
    print(f"{name:15s} {len(order)} pieces  {total / 1024:.1f} KB")
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
            name = NAMES[(r, c)]
            meta[name] = encode(name, crop, m, pad)

    # The treat: one figure on white.
    trgb = np.asarray(Image.open(TREAT).convert("RGB")).astype(np.float32)
    tfg = ~label_background((trgb > WHITE).all(axis=2), border_only=True)
    ys, xs = np.nonzero(tfg)
    pad = 3
    y0, y1 = max(0, ys.min() - pad), min(tfg.shape[0], ys.max() + 1 + pad)
    x0, x1 = max(0, xs.min() - pad), min(tfg.shape[1], xs.max() + 1 + pad)
    meta["banana_penguin"] = encode("banana_penguin", trgb[y0:y1, x0:x1], tfg[y0:y1, x0:x1], pad, TREAT_HEIGHT)

    for rig_name, spec in RIGS.items():
        meta[rig_name] = build_rig(rig_name, spec, meta[spec["sprite"]])
    inline = {k: v for k, v in meta.items() if k in INLINE or k in RIGS}

    (OUT_DIR / "sprites.json").write_text(json.dumps({k: {kk: vv for kk, vv in v.items() if kk not in ("src", "pieces")} for k, v in meta.items()}, indent=2))
    block = "/* SPRITES:BEGIN — generated by tools/art/build_caius_sprites.py from assets/art/reference/; do not edit by hand */\nconst SPRITE_DATA = " + json.dumps(inline) + ";\n/* SPRITES:END */"
    html = GAME.read_text()
    pat = re.compile(r"/\* SPRITES:BEGIN.*?/\* SPRITES:END \*/", re.S)
    if pat.search(html):
        html = pat.sub(lambda _: block, html)
    else:
        marker = '"use strict";\n'
        assert marker in html
        html = html.replace(marker, marker + "\n" + block + "\n", 1)
    GAME.write_text(html)
    print(f"inlined {len(inline)} sprites into {GAME.relative_to(ROOT)} ({GAME.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
