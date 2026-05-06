from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]

UNITS = {
    "skeleton-enemy": {
        "source": ROOT / "src/content/units/skeleton-enemy/art/source/unitv2_atlas_source.png",
        "atlas": ROOT / "src/content/units/skeleton-enemy/art/unitv2_atlas.png",
        "groups": [("idle", 4), ("walk", 6), ("guard", 3), ("attack", 5), ("hit", 2), ("death", 5)],
    },
    "ranger": {
        "source": ROOT / "src/content/units/ranger/art/source/unitv2_atlas_source.png",
        "atlas": ROOT / "src/content/units/ranger/art/unitv2_atlas.png",
        "groups": [("idle", 4), ("walk", 6), ("guard", 3), ("attack", 5), ("hit", 2), ("death", 5)],
    },
    "monster-enemy": {
        "source": ROOT / "src/content/units/monster-enemy/art/source/unitv2_atlas_source.png",
        "atlas": ROOT / "src/content/units/monster-enemy/art/unitv2_atlas.png",
        "remove_checker": True,
        "groups": [("idle", 3), ("walk", 6), ("guard", 3), ("attack", 5), ("hit", 2), ("death", 5)],
    },
    "camp-wolf": {
        "source": ROOT / "src/content/units/camp-wolf/art/source/unitv2_atlas_source.png",
        "atlas": ROOT / "src/content/units/camp-wolf/art/unitv2_atlas.png",
        "groups": [("idle", 3), ("walk", 6), ("guard", 3), ("attack", 5), ("hit", 2), ("death", 5)],
    },
    "quadruped-monster": {
        "source": ROOT / "src/content/units/quadruped-monster/art/source/unitv2_atlas_source.png",
        "atlas": ROOT / "src/content/units/quadruped-monster/art/unitv2_atlas.png",
        "groups": [("idle", 3), ("walk", 6), ("guard", 3), ("attack", 5), ("hit", 2), ("death", 5)],
    },
    "dune-vanguard": {
        "source": ROOT / "src/content/units/dune-vanguard/art/source/unitv2_atlas_source.png",
        "atlas": ROOT / "src/content/units/dune-vanguard/art/unitv2_atlas.png",
        "groups": [("idle", 8), ("walk", 8), ("attack", 7), ("hit", 2), ("guard", 5), ("death", 6)],
    },
    "barbarian": {
        "source": ROOT / "src/content/units/barbarian/art/source/unitv2_atlas_source.png",
        "atlas": ROOT / "src/content/units/barbarian/art/unitv2_atlas.png",
        "groups": [("idle", 3), ("walk", 6), ("guard", 3), ("attack", 5), ("hit", 2), ("death", 5)],
    },
    "light-priest": {
        "source": ROOT / "src/content/units/light-priest/art/source/unitv2_atlas_source.png",
        "atlas": ROOT / "src/content/units/light-priest/art/unitv2_atlas.png",
        "groups": [("idle", 3), ("walk", 5), ("guard", 3), ("attack", 5), ("hit", 2), ("death", 5)],
        "manual_frames": [
            ("idle-1", (30, 5, 212, 222), (107.2, 222)),
            ("idle-2", (220, 5, 399, 222), (293.1, 222)),
            ("idle-3", (405, 6, 581, 222), (478.5, 222)),
            ("walk-1", (15, 242, 211, 435), (105.1, 435)),
            ("walk-2", (214, 247, 401, 437), (327.9, 437)),
            ("walk-3", (421, 247, 614, 431), (536.4, 431)),
            ("walk-4", (628, 240, 806, 435), (697.5, 435)),
            ("walk-5", (836, 243, 1021, 437), (906.7, 437)),
            ("guard-1", (18, 459, 191, 657), (98.2, 657)),
            ("guard-2", (209, 458, 391, 656), (298.5, 656)),
            ("guard-3", (420, 465, 605, 655), (497.6, 655)),
            ("attack-1", (11, 665, 179, 882), (77.9, 882)),
            ("attack-2", (202, 665, 382, 883), (266.8, 883)),
            ("attack-3", (390, 676, 607, 885), (461.0, 885)),
            ("attack-4", (606, 691, 899, 885), (679.9, 885)),
            ("attack-5", (875, 715, 1148, 886), (963.0, 886)),
            ("hit-1", (24, 903, 189, 1069), (76.9, 1069)),
            ("hit-2", (231, 915, 376, 1069), (290.1, 1069)),
            ("death-1", (13, 1101, 204, 1230), (96.6, 1230)),
            ("death-2", (221, 1094, 423, 1228), (315.2, 1228)),
            ("death-3", (422, 1118, 613, 1228), (516.1, 1228)),
            ("death-4", (643, 1163, 887, 1233), (764.2, 1233)),
            ("death-5", (917, 1154, 1161, 1230), (1071.1, 1230)),
        ],
    },
    "dwarf-guardian": {
        "source": ROOT / "src/content/units/dwarf-guardian/art/source/unitv2_atlas_source.png",
        "atlas": ROOT / "src/content/units/dwarf-guardian/art/unitv2_atlas.png",
        "groups": [("idle", 4), ("walk", 6), ("guard", 3), ("attack", 5), ("hit", 2), ("death", 5)],
    },
    "lava-serpent": {
        "source": ROOT / "src/content/units/lava-serpent/art/source/unitv2_atlas_source.png",
        "atlas": ROOT / "src/content/units/lava-serpent/art/unitv2_atlas.png",
        "groups": [("idle", 3), ("walk", 6), ("guard", 3), ("attack", 5), ("hit", 2), ("death", 5)],
        "manual_frames": [
            ("idle-1", (78, 21, 235, 229), (151.7, 229)),
            ("idle-2", (254, 21, 410, 229), (327.5, 229)),
            ("idle-3", (427, 21, 589, 229), (502.5, 229)),
            ("walk-1", (55, 250, 246, 436), (156.7, 436)),
            ("walk-2", (255, 254, 436, 437), (346.4, 437)),
            ("walk-3", (439, 251, 633, 436), (543.7, 436)),
            ("walk-4", (641, 260, 807, 437), (732.3, 437)),
            ("walk-5", (814, 256, 1002, 437), (930.7, 437)),
            ("walk-6", (1007, 273, 1198, 437), (1119.3, 437)),
            ("guard-1", (58, 461, 219, 639), (133.1, 639)),
            ("guard-2", (243, 460, 396, 641), (310.0, 641)),
            ("guard-3", (414, 462, 576, 641), (483.4, 641)),
            ("attack-1", (60, 665, 217, 837), (125.4, 837)),
            ("attack-2", (252, 665, 388, 837), (321.0, 837)),
            ("attack-3", (419, 667, 678, 837), (501.3, 837)),
            ("attack-4", (671, 663, 919, 837), (741.2, 837)),
            ("attack-5", (915, 658, 1096, 837), (990.2, 837)),
            ("hit-1", (60, 865, 214, 1033), (137.6, 1033)),
            ("hit-2", (247, 865, 393, 1035), (328.9, 1035)),
            ("death-1", (39, 1072, 222, 1206), (138.4, 1206)),
            ("death-2", (247, 1104, 463, 1204), (369.5, 1204)),
            ("death-3", (480, 1107, 724, 1205), (603.1, 1205)),
            ("death-4", (745, 1112, 987, 1208), (875.3, 1208)),
            ("death-5", (1015, 1143, 1237, 1212), (1142.2, 1212)),
        ],
    },
    "dune-rodent": {
        "source": ROOT / "src/content/units/dune-rodent/art/source/unitv2_atlas_source.png",
        "atlas": ROOT / "src/content/units/dune-rodent/art/unitv2_atlas.png",
        "groups": [("idle", 4), ("walk", 6), ("guard", 3), ("attack", 5), ("hit", 2), ("death", 5)],
    },
    "gentle-mammoth": {
        "source": ROOT / "src/content/units/gentle-mammoth/art/source/unitv2_atlas_source.png",
        "atlas": ROOT / "src/content/units/gentle-mammoth/art/unitv2_atlas.png",
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
        help="Rebuild unitv2_atlas.png from the configured repo-local source before generating QA artifacts.",
    )
    args = parser.parse_args()
    unit_ids = UNITS.keys() if args.unit == "all" else [args.unit]

    for unit_id in unit_ids:
        config = UNITS[unit_id]
        atlas = load_atlas(config, from_source=args.from_source)
        named_frames = make_manual_frames(config) if config.get("manual_frames") else name_frames(detect_frames(atlas), config["groups"])
        write_debug_image(unit_id, atlas, named_frames)
        write_webp_previews(unit_id, atlas, named_frames, config.get("preview_aliases", {}))
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


def make_manual_frames(config: dict) -> list[tuple[str, dict]]:
    return [
        (
            label,
            {
                "source": source,
                "anchor": anchor,
                "area": (source[2] - source[0]) * (source[3] - source[1]),
            },
        )
        for label, source, anchor in config["manual_frames"]
    ]


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


def write_webp_previews(unit_id: str, atlas: Image.Image, frames: list[tuple[str, dict]], aliases: dict[str, str]) -> None:
    groups: dict[str, list[dict]] = {}
    for label, frame in frames:
        action = label.rsplit("-", 1)[0]
        groups.setdefault(action, []).append(frame)

    for alias, source_action in aliases.items():
        if source_action in groups:
            groups[alias] = groups[source_action]

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
