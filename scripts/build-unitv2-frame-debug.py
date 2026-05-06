from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]

UNITS = {
    "skeleton-enemy": {
        "source": Path("C:/Users/Simon/Downloads/Skeleton.png"),
        "atlas": ROOT / "src/content/units/skeleton-enemy/art/unitv2_atlas.png",
        "groups": [("idle", 4), ("walk", 6), ("guard", 3), ("attack", 5), ("hit", 2), ("death", 5)],
    },
    "ranger": {
        "source": Path("C:/Users/Simon/Downloads/Ranger.png"),
        "atlas": ROOT / "src/content/units/ranger/art/unitv2_atlas.png",
        "groups": [("idle", 4), ("walk", 6), ("guard", 3), ("attack", 5), ("hit", 2), ("death", 5)],
    },
    "monster-enemy": {
        "source": Path("C:/Users/Simon/Downloads/Monster1.png"),
        "atlas": ROOT / "src/content/units/monster-enemy/art/unitv2_atlas.png",
        "remove_checker": True,
        "groups": [("idle", 3), ("walk", 6), ("guard", 3), ("attack", 5), ("hit", 2), ("death", 5)],
    },
}

COLORS = [
    "#ff4d4d",
    "#43e36d",
    "#42a5ff",
    "#ffe066",
    "#d66bff",
    "#ff9f43",
    "#7df9ff",
    "#ff66b3",
]


def main() -> None:
    parser = argparse.ArgumentParser(description="Refresh UnitV2 frame debug overlays and magenta WebP previews.")
    parser.add_argument("--unit", choices=[*UNITS.keys(), "all"], default="all")
    parser.add_argument(
        "--from-source",
        action="store_true",
        help="Rebuild unitv2_atlas.png from the configured external source before generating QA artifacts.",
    )
    args = parser.parse_args()
    unit_ids = UNITS.keys() if args.unit == "all" else [args.unit]

    for unit_id in unit_ids:
        config = UNITS[unit_id]
        atlas = load_atlas(config, from_source=args.from_source)
        frames = detect_frames(atlas)
        named_frames = name_frames(frames, config["groups"])
        write_debug_image(unit_id, atlas, named_frames)
        write_webp_previews(unit_id, atlas, named_frames)
        print(f"{unit_id}: {len(named_frames)} frames")
        for label, frame in named_frames:
            left, top, right, bottom = frame["source"]
            anchor_x, anchor_y = frame["anchor"]
            print(f"  {label}: f({left}, {top}, {right}, {bottom}, {anchor_x:.1f}, {anchor_y:.1f})")


def load_atlas(config: dict, from_source: bool) -> Image.Image:
    if not from_source and config["atlas"].exists():
        image = Image.open(config["atlas"]).convert("RGBA")
        if config.get("remove_checker"):
            image = remove_light_checkerboard(image)
            image.save(config["atlas"])
        return image

    image = Image.open(config["source"]).convert("RGBA")

    if config.get("remove_checker"):
        image = remove_light_checkerboard(image)

    config["atlas"].parent.mkdir(parents=True, exist_ok=True)
    image.save(config["atlas"])
    return image


def remove_light_checkerboard(image: Image.Image) -> Image.Image:
    pixels = image.load()
    width, height = image.size
    visited = bytearray(width * height)
    queue: deque[tuple[int, int]] = deque()

    def index(x: int, y: int) -> int:
        return y * width + x

    def is_background_pixel(x: int, y: int) -> bool:
        r, g, b, a = pixels[x, y]
        return a > 0 and r >= 224 and g >= 224 and b >= 224 and max(r, g, b) - min(r, g, b) <= 16

    for x in range(width):
        for y in (0, height - 1):
            if is_background_pixel(x, y) and not visited[index(x, y)]:
                visited[index(x, y)] = 1
                queue.append((x, y))

    for y in range(height):
        for x in (0, width - 1):
            if is_background_pixel(x, y) and not visited[index(x, y)]:
                visited[index(x, y)] = 1
                queue.append((x, y))

    while queue:
        x, y = queue.popleft()
        pixels[x, y] = (255, 255, 255, 0)
        for nx in range(max(0, x - 1), min(width, x + 2)):
            for ny in range(max(0, y - 1), min(height, y + 2)):
                idx = index(nx, ny)
                if visited[idx] or not is_background_pixel(nx, ny):
                    continue
                visited[idx] = 1
                queue.append((nx, ny))

    return image


def detect_frames(image: Image.Image) -> list[dict]:
    alpha = image.getchannel("A")
    width, height = image.size
    seen = bytearray(width * height)
    frames = []
    min_area = 450

    def index(x: int, y: int) -> int:
        return y * width + x

    for start_y in range(height):
        for start_x in range(width):
            start_index = index(start_x, start_y)
            if seen[start_index] or alpha.getpixel((start_x, start_y)) <= 24:
                continue

            seen[start_index] = 1
            queue: deque[tuple[int, int]] = deque([(start_x, start_y)])
            left = right = start_x
            top = bottom = start_y
            area = 0

            while queue:
                x, y = queue.popleft()
                area += 1
                left = min(left, x)
                right = max(right, x)
                top = min(top, y)
                bottom = max(bottom, y)

                for nx in range(max(0, x - 1), min(width, x + 2)):
                    for ny in range(max(0, y - 1), min(height, y + 2)):
                        idx = index(nx, ny)
                        if seen[idx] or alpha.getpixel((nx, ny)) <= 24:
                            continue
                        seen[idx] = 1
                        queue.append((nx, ny))

            frame_width = right - left + 1
            frame_height = bottom - top + 1

            if area < min_area or frame_width < 35 or frame_height < 35:
                continue

            frames.append(make_frame(alpha, left, top, right + 1, bottom + 1, area))

    frames.sort(key=lambda frame: (row_bucket(frame), frame["source"][0]))
    return frames


def row_bucket(frame: dict) -> int:
    left, top, right, bottom = frame["source"]
    return round(((top + bottom) / 2) / 160)


def make_frame(alpha: Image.Image, left: int, top: int, right: int, bottom: int, area: int) -> dict:
    band_top = max(top, bottom - 18)
    total_x = 0
    count = 0

    for y in range(band_top, bottom):
        for x in range(left, right):
            if alpha.getpixel((x, y)) > 24:
                total_x += x
                count += 1

    anchor_x = total_x / count if count else (left + right) / 2
    return {
        "source": (left, top, right, bottom),
        "anchor": (anchor_x, bottom),
        "area": area,
    }


def name_frames(frames: list[dict], groups: list[tuple[str, int]]) -> list[tuple[str, dict]]:
    named = []
    index = 0
    for group_name, count in groups:
        for frame_number in range(count):
            if index >= len(frames):
                return named
            named.append((f"{group_name}-{frame_number + 1}", frames[index]))
            index += 1
    return named


def write_debug_image(unit_id: str, atlas: Image.Image, frames: list[tuple[str, dict]]) -> None:
    debug = atlas.convert("RGBA")
    overlay = Image.new("RGBA", debug.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    font = ImageFont.load_default()

    for index, (label, frame) in enumerate(frames):
        left, top, right, bottom = frame["source"]
        anchor_x, anchor_y = frame["anchor"]
        color = COLORS[index % len(COLORS)]
        draw.rectangle((left, top, right - 1, bottom - 1), outline=color, width=3)
        draw.line((anchor_x - 10, anchor_y, anchor_x + 10, anchor_y), fill=color, width=2)
        draw.line((anchor_x, anchor_y - 10, anchor_x, anchor_y + 10), fill=color, width=2)
        label_bounds = draw.textbbox((0, 0), label, font=font)
        label_width = label_bounds[2] - label_bounds[0] + 6
        label_height = label_bounds[3] - label_bounds[1] + 4
        draw.rectangle((left, max(0, top - label_height), left + label_width, top), fill=(0, 0, 0, 185))
        draw.text((left + 3, max(0, top - label_height + 2)), label, fill=color, font=font)

    debug = Image.alpha_composite(debug, overlay)
    out_path = ROOT / f"src/content/units/{unit_id}/art/frame_selection_debug.png"
    debug.save(out_path)


def write_webp_previews(unit_id: str, atlas: Image.Image, frames: list[tuple[str, dict]]) -> None:
    groups: dict[str, list[dict]] = {}
    for label, frame in frames:
        action = label.rsplit("-", 1)[0]
        groups.setdefault(action, []).append(frame)

    out_dir = ROOT / f"src/content/units/{unit_id}/art/previews"
    out_dir.mkdir(parents=True, exist_ok=True)

    for action, action_frames in groups.items():
        preview_frames = make_preview_frames(atlas, action_frames)
        out_path = out_dir / f"{action}.webp"
        preview_frames[0].save(
            out_path,
            save_all=True,
            append_images=preview_frames[1:],
            duration=120,
            loop=0,
            lossless=True,
            quality=95,
            method=6,
        )


def make_preview_frames(atlas: Image.Image, frames: list[dict]) -> list[Image.Image]:
    magenta = (255, 0, 255, 255)
    padding = 16
    max_left = 0.0
    max_right = 0.0
    max_top = 0.0
    max_bottom = 0.0
    cropped_frames = []

    for frame in frames:
        left, top, right, bottom = frame["source"]
        anchor_x, anchor_y = frame["anchor"]
        crop = atlas.crop((left, top, right, bottom)).convert("RGBA")
        rel_anchor_x = anchor_x - left
        rel_anchor_y = anchor_y - top
        cropped_frames.append((crop, rel_anchor_x, rel_anchor_y))
        max_left = max(max_left, rel_anchor_x)
        max_right = max(max_right, crop.width - rel_anchor_x)
        max_top = max(max_top, rel_anchor_y)
        max_bottom = max(max_bottom, crop.height - rel_anchor_y)

    canvas_width = int(max_left + max_right + padding * 2)
    canvas_height = int(max_top + max_bottom + padding * 2)
    canvas_anchor_x = int(max_left + padding)
    canvas_anchor_y = int(max_top + padding)
    preview_frames = []

    for crop, rel_anchor_x, rel_anchor_y in cropped_frames:
        preview = Image.new("RGBA", (canvas_width, canvas_height), magenta)
        x = int(round(canvas_anchor_x - rel_anchor_x))
        y = int(round(canvas_anchor_y - rel_anchor_y))
        preview.alpha_composite(crop, (x, y))
        preview_frames.append(preview.convert("RGB"))

    return preview_frames


if __name__ == "__main__":
    main()
