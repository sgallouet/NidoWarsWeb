#!/usr/bin/env python3
import argparse
from pathlib import Path

from PIL import Image, ImageChops


def main():
    args = parse_args()
    frame_paths = sorted(
        path for path in Path(args.frames_dir).iterdir() if path.suffix.lower() in {".png", ".webp"}
    )

    if len(frame_paths) < args.min_frames:
        raise SystemExit(f"Need at least {args.min_frames} frames, found {len(frame_paths)}.")

    frames = [Image.open(path).convert("RGBA") for path in frame_paths]
    bboxes = [frame.getchannel("A").getbbox() for frame in frames]
    if any(bbox is None for bbox in bboxes):
        raise SystemExit("One or more frames are empty.")

    diffs = []
    for previous, current in zip(frames, frames[1:]):
        diff = ImageChops.difference(previous, current).getchannel("A")
        changed = sum(1 for value in diff.getdata() if value > args.alpha_threshold)
        subject = max(1, sum(1 for value in previous.getchannel("A").getdata() if value > args.alpha_threshold))
        diffs.append(changed / subject)

    mean_diff = sum(diffs) / len(diffs)
    bbox_variation = len(set(bboxes))

    print(f"frames={len(frames)} mean_alpha_diff={mean_diff:.3f} bbox_variants={bbox_variation}")

    if mean_diff < args.min_mean_diff:
        raise SystemExit("Frame motion is too small; likely idle-only or transform-lite.")

    if bbox_variation < args.min_bbox_variants:
        raise SystemExit("Bounding boxes barely vary; inspect for single-sprite transform animation.")


def parse_args():
    parser = argparse.ArgumentParser(description="Quick sanity check for UnitV2 frame motion.")
    parser.add_argument("--frames-dir", required=True, help="Directory containing transparent frame images.")
    parser.add_argument("--min-frames", type=int, default=3)
    parser.add_argument("--min-mean-diff", type=float, default=0.04)
    parser.add_argument("--min-bbox-variants", type=int, default=2)
    parser.add_argument("--alpha-threshold", type=int, default=16)
    return parser.parse_args()


if __name__ == "__main__":
    main()
