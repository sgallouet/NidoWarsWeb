#!/usr/bin/env python3
"""Prepare an isometric unit animation strip for Nido Wars-style sheets."""

from __future__ import annotations

import argparse
import json
from collections import deque
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter


def parse_color(value: str | None) -> tuple[int, int, int] | None:
    if not value:
        return None
    text = value.strip()
    if text.startswith("#"):
        text = text[1:]
    if len(text) != 6:
        raise ValueError(f"expected #rrggbb color, got {value!r}")
    return tuple(int(text[i : i + 2], 16) for i in range(0, 6, 2))


def parse_crop(value: str | None) -> tuple[int, int, int, int] | None:
    if not value:
        return None
    parts = [int(part.strip()) for part in value.split(",")]
    if len(parts) != 4:
        raise ValueError("--crop must be left,top,right,bottom")
    return tuple(parts)


def color_distance(a: tuple[int, int, int], b: tuple[int, int, int]) -> int:
    return abs(a[0] - b[0]) + abs(a[1] - b[1]) + abs(a[2] - b[2])


def guess_border_key(image: Image.Image) -> tuple[int, int, int]:
    rgb = image.convert("RGB")
    samples: dict[tuple[int, int, int], int] = {}
    w, h = rgb.size
    px = rgb.load()
    for x in range(w):
        for y in (0, h - 1):
            samples[px[x, y]] = samples.get(px[x, y], 0) + 1
    for y in range(h):
        for x in (0, w - 1):
            samples[px[x, y]] = samples.get(px[x, y], 0) + 1
    return max(samples.items(), key=lambda item: item[1])[0]


def border_is_mostly_transparent(image: Image.Image) -> bool:
    rgba = image.convert("RGBA")
    w, h = rgba.size
    px = rgba.load()
    transparent = 0
    total = 0
    for x in range(w):
        for y in (0, h - 1):
            total += 1
            transparent += 1 if px[x, y][3] == 0 else 0
    for y in range(h):
        for x in (0, w - 1):
            total += 1
            transparent += 1 if px[x, y][3] == 0 else 0
    return transparent / max(1, total) > 0.85


def remove_edge_key(image: Image.Image, key: tuple[int, int, int], threshold: int) -> Image.Image:
    rgba = image.convert("RGBA")
    w, h = rgba.size
    px = rgba.load()
    seen: set[tuple[int, int]] = set()
    queue: deque[tuple[int, int]] = deque()

    for x in range(w):
        queue.append((x, 0))
        queue.append((x, h - 1))
    for y in range(h):
        queue.append((0, y))
        queue.append((w - 1, y))

    while queue:
        x, y = queue.popleft()
        if (x, y) in seen:
            continue
        seen.add((x, y))
        r, g, b, a = px[x, y]
        if a == 0 or color_distance((r, g, b), key) > threshold:
            continue
        px[x, y] = (r, g, b, 0)
        if x > 0:
            queue.append((x - 1, y))
        if x + 1 < w:
            queue.append((x + 1, y))
        if y > 0:
            queue.append((x, y - 1))
        if y + 1 < h:
            queue.append((x, y + 1))
    return rgba


def add_outline(frame: Image.Image, radius: int, color: tuple[int, int, int, int]) -> Image.Image:
    if radius <= 0:
        return frame

    alpha = frame.getchannel("A")
    outline_alpha = alpha.filter(ImageFilter.MaxFilter(radius * 2 + 1))
    outline = Image.new("RGBA", frame.size, color)
    outline.putalpha(outline_alpha)
    return Image.alpha_composite(outline, frame)


def trim_and_fit(
    frame: Image.Image,
    cell: int,
    baseline_y: int,
    padding: int,
    max_subject_width: int,
    max_subject_height: int,
    outline_radius: int,
    outline_color: tuple[int, int, int, int],
) -> Image.Image:
    alpha = frame.getchannel("A")
    bbox = alpha.getbbox()
    out = Image.new("RGBA", (cell, cell), (0, 0, 0, 0))
    if not bbox:
        return out

    crop = frame.crop(bbox)
    max_w = max_subject_width if max_subject_width > 0 else cell - padding * 2
    max_h = max_subject_height if max_subject_height > 0 else baseline_y - padding
    scale = min(max_w / crop.width, max_h / crop.height, 1.0)
    fitted = crop.resize(
        (max(1, round(crop.width * scale)), max(1, round(crop.height * scale))),
        Image.Resampling.LANCZOS,
    )
    fitted = add_outline(fitted, outline_radius, outline_color)
    x = (cell - fitted.width) // 2
    y = baseline_y - fitted.height
    out.alpha_composite(fitted, (x, y))
    return out


def remove_small_components(image: Image.Image, min_area: int) -> Image.Image:
    if min_area <= 0:
        return image

    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A")
    w, h = rgba.size
    visited: set[tuple[int, int]] = set()
    remove: list[tuple[int, int]] = []
    alpha_px = alpha.load()

    for start_y in range(h):
        for start_x in range(w):
            if (start_x, start_y) in visited or alpha_px[start_x, start_y] == 0:
                continue

            component: list[tuple[int, int]] = []
            queue: deque[tuple[int, int]] = deque([(start_x, start_y)])
            visited.add((start_x, start_y))
            while queue:
                x, y = queue.popleft()
                component.append((x, y))
                for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                    if nx < 0 or nx >= w or ny < 0 or ny >= h or (nx, ny) in visited:
                        continue
                    visited.add((nx, ny))
                    if alpha_px[nx, ny] > 0:
                        queue.append((nx, ny))

            if len(component) < min_area:
                remove.extend(component)

    if remove:
        px = rgba.load()
        for x, y in remove:
            r, g, b, _a = px[x, y]
            px[x, y] = (r, g, b, 0)
    return rgba


def split_frames(image: Image.Image, frames: int) -> list[Image.Image]:
    w, h = image.size
    frame_w = w / frames
    return [
        image.crop((round(i * frame_w), 0, round((i + 1) * frame_w), h))
        for i in range(frames)
    ]


def count_alpha(image: Image.Image) -> int:
    return sum(image.getchannel("A").histogram()[1:])


def edge_alpha(image: Image.Image) -> int:
    alpha = image.getchannel("A")
    w, h = alpha.size
    boxes = ((0, 0, w, 1), (0, h - 1, w, h), (0, 0, 1, h), (w - 1, 0, w, h))
    return sum(sum(alpha.crop(box).histogram()[1:]) for box in boxes)


def diff_score(a: Image.Image, b: Image.Image) -> int:
    diff = ImageChops.difference(a, b).convert("RGBA")
    return sum(1 for _count, color in diff.getcolors(maxcolors=10_000_000) or [] if color != (0, 0, 0, 0))


def residue_count(image: Image.Image, key: tuple[int, int, int], threshold: int) -> int:
    total = 0
    for count, color in image.getcolors(maxcolors=10_000_000) or []:
        r, g, b, a = color
        if a and color_distance((r, g, b), key) <= threshold:
            total += count
    return total


def save_webp(sheet: Image.Image, path: Path, frames: int, cell: int, duration: int) -> None:
    preview_frames = [
        sheet.crop((i * cell, 0, (i + 1) * cell, cell)).convert("RGBA")
        for i in range(frames)
    ]
    path.parent.mkdir(parents=True, exist_ok=True)
    preview_frames[0].save(
        path,
        save_all=True,
        append_images=preview_frames[1:],
        duration=duration,
        loop=0,
        lossless=True,
        exact=True,
        method=6,
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--preview")
    parser.add_argument("--report")
    parser.add_argument("--frames", type=int, default=8)
    parser.add_argument("--cell", type=int, default=186)
    parser.add_argument("--baseline-y", type=int, default=180)
    parser.add_argument("--duration", type=int, default=125)
    parser.add_argument("--padding", type=int, default=3)
    parser.add_argument("--max-subject-width", type=int, default=0)
    parser.add_argument("--max-subject-height", type=int, default=0)
    parser.add_argument("--outline-radius", type=int, default=0)
    parser.add_argument("--outline-color", default="#0e0b09")
    parser.add_argument("--outline-alpha", type=int, default=235)
    parser.add_argument("--min-component-area", type=int, default=120)
    parser.add_argument("--key", default="")
    parser.add_argument("--key-threshold", type=int, default=90)
    parser.add_argument("--residue-threshold", type=int, default=50)
    parser.add_argument("--crop", default="")
    parser.add_argument("--min-pixels", type=int, default=700)
    args = parser.parse_args()

    source = Path(args.input)
    with Image.open(source) as opened:
        image = opened.convert("RGBA")

    crop = parse_crop(args.crop)
    if crop:
        image = image.crop(crop)

    explicit_key = parse_color(args.key)
    outline_rgb = parse_color(args.outline_color) or (14, 11, 9)
    outline_color = (*outline_rgb, max(0, min(255, args.outline_alpha)))
    transparent_input = border_is_mostly_transparent(image)
    key = explicit_key if explicit_key else (None if transparent_input else guess_border_key(image))
    cleaned = remove_edge_key(image, key, args.key_threshold) if key else image.convert("RGBA")
    fitted_frames = [
        remove_small_components(
            trim_and_fit(
                frame,
                args.cell,
                args.baseline_y,
                args.padding,
                args.max_subject_width,
                args.max_subject_height,
                args.outline_radius,
                outline_color,
            ),
            args.min_component_area,
        )
        for frame in split_frames(cleaned, args.frames)
    ]

    sheet = Image.new("RGBA", (args.frames * args.cell, args.cell), (0, 0, 0, 0))
    for i, frame in enumerate(fitted_frames):
        sheet.alpha_composite(frame, (i * args.cell, 0))

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output)

    warnings: list[str] = []
    cells = []
    previous = None
    for i, frame in enumerate(fitted_frames):
        pixels = count_alpha(frame)
        edges = edge_alpha(frame)
        residue = residue_count(frame, key, args.residue_threshold) if key else 0
        diff = None if previous is None else diff_score(previous, frame)
        if pixels < args.min_pixels:
            warnings.append(f"frame {i} is sparse ({pixels} opaque pixels)")
        if edges:
            warnings.append(f"frame {i} touches the cell edge ({edges} edge pixels)")
        if residue:
            warnings.append(f"frame {i} has {residue} near-key opaque pixels")
        if diff is not None and diff < 200:
            warnings.append(f"frame {i - 1}->{i} changes very little ({diff} pixels)")
        cells.append({"frame": i, "opaque_pixels": pixels, "edge_pixels": edges, "residue_pixels": residue, "diff_from_previous": diff})
        previous = frame

    report = {
        "ok": True,
        "input": str(source),
        "output": str(output),
        "size": [sheet.width, sheet.height],
        "frames": args.frames,
        "cell": args.cell,
        "key": f"#{key[0]:02x}{key[1]:02x}{key[2]:02x}" if key else None,
        "warnings": warnings,
        "cells": cells,
    }

    if args.preview:
        save_webp(sheet, Path(args.preview), args.frames, args.cell, args.duration)
        report["preview"] = args.preview

    report_path = Path(args.report) if args.report else output.with_suffix(".json")
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps({"ok": True, "output": str(output), "warnings": len(warnings)}, indent=2))


if __name__ == "__main__":
    main()
