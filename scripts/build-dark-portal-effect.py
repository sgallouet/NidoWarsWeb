from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
ART_DIR = ROOT / "src" / "content" / "objects" / "dark-portal" / "art"
SOURCE_PORTAL = ART_DIR / "source" / "portal_source.png"
RUNTIME_PORTAL = ART_DIR / "portal.png"
RUNTIME_PORTAL_OFF = ART_DIR / "portal_off.png"
TELEPORT_SHEET = ART_DIR / "teleport_fire_sheet.png"

FRAME_W = 192
FRAME_H = 160
FRAME_COUNT = 24
SHEET_COLS = 6


def ease_out_cubic(value: float) -> float:
    return 1 - (1 - value) ** 3


def pulse(value: float) -> float:
    return math.sin(value * math.pi)


def rgba(color: tuple[int, int, int], alpha: float) -> tuple[int, int, int, int]:
    return (*color, max(0, min(255, round(alpha * 255))))


def save_runtime_portal() -> None:
    source = Image.open(SOURCE_PORTAL).convert("RGBA")
    width = 640
    height = round(source.height * (width / source.width))
    runtime = source.resize((width, height), Image.Resampling.LANCZOS)
    runtime.save(RUNTIME_PORTAL, optimize=True)

    off = runtime.copy()
    pixels = off.load()

    for y in range(off.height):
        for x in range(off.width):
            r, g, b, a = pixels[x, y]

            if a == 0:
                continue

            is_rune_glow = r > 82 and r > g * 1.22 and r > b * 1.18
            base = int(r * 0.27 + g * 0.39 + b * 0.34)
            muted = (
                max(12, round(base * 0.58)),
                max(10, round(base * 0.5)),
                max(9, round(base * 0.46)),
                a,
            )

            if is_rune_glow:
                pixels[x, y] = (
                    max(24, round(base * 0.9)),
                    max(12, round(base * 0.38)),
                    max(12, round(base * 0.34)),
                    min(a, 190),
                )
            else:
                pixels[x, y] = muted

    off.save(RUNTIME_PORTAL_OFF, optimize=True)


def draw_blurred_ellipse(
    image: Image.Image,
    bounds: tuple[float, float, float, float],
    color: tuple[int, int, int],
    alpha: float,
    blur: float,
) -> None:
    layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    draw.ellipse(bounds, fill=rgba(color, alpha))
    if blur > 0:
        layer = layer.filter(ImageFilter.GaussianBlur(blur))
    image.alpha_composite(layer)


def draw_ring(
    image: Image.Image,
    cx: float,
    cy: float,
    rx: float,
    ry: float,
    color: tuple[int, int, int],
    alpha: float,
    width: int,
    blur: float,
) -> None:
    layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    draw.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), outline=rgba(color, alpha), width=width)
    if blur > 0:
        layer = layer.filter(ImageFilter.GaussianBlur(blur))
    image.alpha_composite(layer)


def draw_flame_wisp(
    image: Image.Image,
    rng: random.Random,
    cx: float,
    cy: float,
    radius_x: float,
    radius_y: float,
    progress: float,
    index: int,
) -> None:
    angle = -math.pi + index * (math.tau / 13.0) + progress * math.tau * (0.18 + index * 0.006)
    lift = pulse(progress)
    base_x = cx + math.cos(angle) * radius_x * (0.42 + rng.random() * 0.42)
    base_y = cy + math.sin(angle) * radius_y * (0.42 + rng.random() * 0.35)
    height = (34 + rng.random() * 48) * (0.42 + lift * 0.8)
    sway = math.sin(progress * math.tau * 1.7 + index) * (8 + rng.random() * 8)
    width = 6 + rng.random() * 11
    tip = (base_x + sway, base_y - height)
    left = (base_x - width, base_y + rng.random() * 5)
    right = (base_x + width, base_y + rng.random() * 5)
    core = (base_x + sway * 0.3, base_y - height * 0.45)

    layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    alpha = (0.16 + lift * 0.42) * (1 - max(0, progress - 0.82) / 0.18)
    draw.polygon([left, core, right, tip], fill=rgba((255, 78, 24), alpha))
    draw.line([left, core, tip], fill=rgba((255, 180, 72), alpha * 0.9), width=max(1, round(width * 0.35)))
    layer = layer.filter(ImageFilter.GaussianBlur(1.1 + rng.random() * 1.6))
    image.alpha_composite(layer)


def draw_sparks(image: Image.Image, rng: random.Random, progress: float) -> None:
    draw = ImageDraw.Draw(image)
    lift = pulse(progress)

    for i in range(38):
        seed_phase = (i * 0.137 + progress * 1.08) % 1
        angle = i * 2.399 + progress * 4.4
        orbit = 16 + seed_phase * 72
        x = FRAME_W / 2 + math.cos(angle) * orbit * (0.72 + rng.random() * 0.45)
        y = 105 + math.sin(angle) * orbit * 0.36 - seed_phase * 80 * (0.35 + lift * 0.65)
        size = 1 + rng.random() * 2.2
        alpha = (1 - seed_phase) * (0.18 + lift * 0.56)
        color = (255, 213, 118) if i % 3 else (255, 86, 34)
        draw.ellipse((x - size, y - size, x + size, y + size), fill=rgba(color, alpha))


def create_frame(index: int) -> Image.Image:
    progress = index / (FRAME_COUNT - 1)
    eased = ease_out_cubic(progress)
    lift = pulse(progress)
    rng = random.Random(90617 + index * 41)
    frame = Image.new("RGBA", (FRAME_W, FRAME_H), (0, 0, 0, 0))
    cx = FRAME_W / 2
    cy = 107

    draw_blurred_ellipse(frame, (cx - 72, cy - 25, cx + 72, cy + 25), (255, 63, 24), 0.1 + lift * 0.33, 10)
    draw_blurred_ellipse(frame, (cx - 42, cy - 17, cx + 42, cy + 17), (255, 220, 122), 0.08 + lift * 0.24, 6)

    for ring_index in range(4):
        phase = (progress + ring_index * 0.2) % 1
        ring_lift = pulse(phase)
        rx = 18 + ease_out_cubic(phase) * (56 + ring_index * 10)
        ry = 8 + ease_out_cubic(phase) * (20 + ring_index * 4)
        alpha = (1 - phase) * (0.16 + ring_lift * 0.38)
        draw_ring(frame, cx, cy, rx, ry, (255, 56, 27), alpha, 2 + ring_index % 2, 1.1)
        draw_ring(frame, cx, cy, rx * 0.76, ry * 0.74, (255, 211, 106), alpha * 0.62, 1, 0.6)

    for wisp_index in range(13):
        draw_flame_wisp(frame, rng, cx, cy, 58 + eased * 15, 19 + eased * 8, progress, wisp_index)

    column = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    column_draw = ImageDraw.Draw(column)
    column_alpha = lift * (0.2 + (1 - progress) * 0.2)
    column_draw.polygon(
        [(cx - 18, cy + 3), (cx + 18, cy + 2), (cx + 9, 28 - lift * 16), (cx - 7, 23 - lift * 10)],
        fill=rgba((255, 107, 39), column_alpha),
    )
    column_draw.line((cx, cy - 4, cx + math.sin(progress * math.tau) * 11, 21), fill=rgba((255, 231, 144), column_alpha), width=3)
    column = column.filter(ImageFilter.GaussianBlur(3.4))
    frame.alpha_composite(column)

    draw_sparks(frame, rng, progress)
    draw_ring(frame, cx, cy, 26 + lift * 34, 10 + lift * 12, (255, 238, 153), 0.18 + lift * 0.32, 1, 0)

    fade = 1 - max(0, progress - 0.88) / 0.12
    if fade < 1:
        alpha = frame.getchannel("A").point(lambda value: round(value * fade))
        frame.putalpha(alpha)

    return frame


def save_teleport_sheet() -> None:
    rows = math.ceil(FRAME_COUNT / SHEET_COLS)
    sheet = Image.new("RGBA", (FRAME_W * SHEET_COLS, FRAME_H * rows), (0, 0, 0, 0))

    for index in range(FRAME_COUNT):
        frame = create_frame(index)
        x = (index % SHEET_COLS) * FRAME_W
        y = (index // SHEET_COLS) * FRAME_H
        sheet.alpha_composite(frame, (x, y))

    sheet.save(TELEPORT_SHEET, optimize=True)


def main() -> None:
    ART_DIR.mkdir(parents=True, exist_ok=True)
    save_runtime_portal()
    save_teleport_sheet()
    print(f"Wrote {RUNTIME_PORTAL.relative_to(ROOT)}")
    print(f"Wrote {RUNTIME_PORTAL_OFF.relative_to(ROOT)}")
    print(f"Wrote {TELEPORT_SHEET.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
