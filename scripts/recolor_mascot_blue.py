"""Recolor the orange triceratops to the Figma owl palette.

Owl reference: white feathers with cool-grey shading, cobalt gown and cap
(#286EC8 highlight, #1E5ABE mid, #0A3C8C shadow), sky-blue feather tips.

The cap shares its hue with the body frill, so garments are picked with
region masks rather than hue alone.
"""
from __future__ import annotations

import colorsys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

SRC = Path(r"d:\doan\frontend\src\assets\triceratops-class-mascot-orange.png")
OUT = Path(r"d:\doan\frontend\src\assets\triceratops-class-mascot.png")

H_COBALT = 0.600
H_COBALT_DEEP = 0.610
H_GREY = 0.640
H_SKY = 0.585


def clamp(x: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return lo if x < lo else hi if x > hi else x


def smoothstep(e0: float, e1: float, x: float) -> float:
    t = clamp((x - e0) / (e1 - e0))
    return t * t * (3.0 - 2.0 * t)


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def build_masks(size: tuple[int, int]) -> tuple[Image.Image, Image.Image]:
    """Return (always_garment, hoodie_zone) soft masks in L mode."""
    always = Image.new("L", size, 0)
    d = ImageDraw.Draw(always)
    # Mortarboard + tassel
    d.polygon([(76, 72), (140, 2), (268, 30), (222, 88), (150, 92)], fill=255)
    # Alarm clock
    d.ellipse((2, 196, 122, 356), fill=255)

    # Zones where only orange pixels are garment (tassel, hoodie)
    hoodie = Image.new("L", size, 0)
    hd = ImageDraw.Draw(hoodie)
    hd.rectangle((98, 40, 132, 128), fill=255)
    hd.polygon(
        [(118, 228), (172, 222), (205, 240), (252, 238), (292, 222), (312, 300),
         (300, 404), (126, 404), (108, 300)],
        fill=255,
    )
    blur = ImageFilter.GaussianBlur(2.5)
    return always.filter(blur), hoodie.filter(blur)


def main() -> None:
    src = Image.open(SRC).convert("RGBA")
    w, h = src.size
    px = src.load()
    always, hoodie = build_masks((w, h))
    am, hm = always.load(), hoodie.load()
    out = Image.new("RGBA", (w, h))
    op = out.load()

    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 6:
                op[x, y] = (0, 0, 0, 0)
                continue
            rf, gf, bf = r / 255, g / 255, b / 255
            hh, ss, vv = colorsys.rgb_to_hsv(rf, gf, bf)

            # Pink cheeks / tongue
            if (hh < 0.035 or hh > 0.92) and 0.18 < ss < 0.62 and vv > 0.55 and (rf - gf) < 0.38:
                op[x, y] = (r, g, b, a)
                continue
            # Dark brown iris and outlines
            if vv < 0.45 and ss < 0.6:
                op[x, y] = (r, g, b, a)
                continue
            # Warm greys (laptop, clock face, glasses): neutralise smoothly
            in_screen = 262 <= x <= 406 and 200 <= y <= 298
            in_laptop = 232 <= x <= 406 and 202 <= y <= 326
            grey_limit = 0.70 if in_screen else 0.45 if in_laptop else 0.28
            if ss < grey_limit:
                rr, gg, bb = colorsys.hsv_to_rgb(H_GREY, ss * 0.25, vv)
                op[x, y] = (int(rr * 255), int(gg * 255), int(bb * 255), a)
                continue
            if not (0.0 <= hh <= 0.16):
                op[x, y] = (r, g, b, a)
                continue

            # Orange (low g/r) vs golden body (high g/r)
            gr = gf / max(rf, 1e-3)
            orange = 1.0 - smoothstep(0.58, 0.70, gr)
            garment = clamp(max(am[x, y] / 255, hm[x, y] / 255 * orange))
            # Spots are clearly more orange than shaded body; stay subtle
            spot = (1.0 - smoothstep(0.52, 0.61, gr)) * (1.0 - garment) * smoothstep(0.62, 0.80, ss) * 0.8
            shade = 1.0 - vv

            # White body with cool-grey shading
            bh, bs, bv = H_GREY, clamp(0.015 + shade * 0.10), clamp(0.62 + 0.38 * vv)
            # Sky-blue spots like the owl's feather tips
            bh = lerp(bh, H_SKY, spot)
            bs = lerp(bs, 0.46, spot)
            bv = lerp(bv, clamp(0.55 + 0.40 * vv), spot)

            # Cobalt garments
            ch = lerp(H_COBALT, H_COBALT_DEEP, smoothstep(0.3, 0.8, shade))
            cs = clamp(0.80 + shade * 0.12)
            cv = clamp(0.38 + 0.42 * vv)

            nh, ns, nv = lerp(bh, ch, garment), lerp(bs, cs, garment), lerp(bv, cv, garment)
            rr, gg, bb = colorsys.hsv_to_rgb(nh, ns, nv)
            op[x, y] = (int(rr * 255), int(gg * 255), int(bb * 255), a)

    out.save(OUT, optimize=True)
    print(f"saved {OUT}")


if __name__ == "__main__":
    main()
