#!/usr/bin/env python3
import argparse
from pathlib import Path

from PIL import Image


def main():
    args = parse_args()
    frames = load_frames(args)

    if not frames:
      raise SystemExit("No frames found.")

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    frames[0].save(
        output,
        "WEBP",
        save_all=True,
        append_images=frames[1:],
        duration=args.duration,
        loop=0,
        lossless=True,
        method=6,
    )
    print(f"Wrote {output} ({len(frames)} frames).")


def parse_args():
    parser = argparse.ArgumentParser(description="Export transparent UnitV2 animation frames as animated WebP.")
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--frames-dir", help="Directory containing frame PNG/WebP files sorted by filename.")
    source.add_argument("--strip", help="Horizontal strip image containing equal-width frames.")
    parser.add_argument("--output", required=True, help="Output animated WebP path.")
    parser.add_argument("--duration", type=int, default=120, help="Frame duration in milliseconds.")
    parser.add_argument("--scale", type=int, default=1, help="Nearest-neighbor preview scale.")
    parser.add_argument("--columns", type=int, help="Frame count for --strip. Defaults to strip width / height.")
    return parser.parse_args()


def load_frames(args):
    if args.frames_dir:
        paths = sorted(
            path
            for path in Path(args.frames_dir).iterdir()
            if path.suffix.lower() in {".png", ".webp"}
        )
        return [prepare_frame(Image.open(path), args.scale) for path in paths]

    strip = Image.open(args.strip).convert("RGBA")
    columns = args.columns or max(1, strip.width // strip.height)
    cell_width = strip.width // columns
    frames = []

    for index in range(columns):
        frame = strip.crop((index * cell_width, 0, (index + 1) * cell_width, strip.height))
        frames.append(prepare_frame(frame, args.scale))

    return frames


def prepare_frame(frame, scale):
    prepared = frame.convert("RGBA")

    if scale > 1:
        prepared = prepared.resize((prepared.width * scale, prepared.height * scale), Image.Resampling.NEAREST)

    return prepared


if __name__ == "__main__":
    main()
