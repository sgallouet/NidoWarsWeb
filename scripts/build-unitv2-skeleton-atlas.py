#!/usr/bin/env python3
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import math

CELL = 112
SCALE = 4
W = H = CELL * SCALE
DRAW_H = 58
OUT_ATLAS = Path("src/content/units/skeleton-enemy/art/unitv2_atlas.png")
ROOT = Path("src/content/units/skeleton-enemy/art/source")
FRAMES_ROOT = ROOT / "frames"

PALETTE = {
    "outline": (34, 28, 23, 255),
    "bone_dark": (112, 105, 91, 255),
    "bone_mid": (178, 170, 148, 255),
    "bone": (222, 214, 185, 255),
    "bone_light": (245, 238, 206, 255),
    "socket": (12, 10, 9, 255),
    "rust_dark": (72, 41, 30, 255),
    "rust": (137, 77, 51, 255),
    "steel": (126, 132, 127, 255),
    "steel_light": (185, 188, 176, 255),
    "hit": (255, 96, 80, 42),
}

ROWS = ["idle", "walk", "guard", "attack", "hit", "death"]
POSES = {
    "idle": [
        {"lean": -0.03, "bob": 0, "head": -0.04, "jaw": 0.0, "l_arm": 0.82, "r_arm": -0.2, "l_leg": -0.18, "r_leg": 0.1, "sword": 0.18},
        {"lean": 0.02, "bob": -0.7, "head": 0.02, "jaw": 0.08, "l_arm": 0.72, "r_arm": -0.12, "l_leg": -0.12, "r_leg": 0.05, "sword": 0.1},
        {"lean": 0.04, "bob": -0.2, "head": 0.05, "jaw": 0.03, "l_arm": 0.76, "r_arm": -0.08, "l_leg": -0.08, "r_leg": 0.08, "sword": 0.05},
        {"lean": -0.01, "bob": 0.2, "head": -0.02, "jaw": 0.02, "l_arm": 0.84, "r_arm": -0.16, "l_leg": -0.16, "r_leg": 0.12, "sword": 0.16},
    ],
    "walk": [
        {"lean": -0.08, "bob": 0, "head": -0.04, "jaw": 0.03, "l_arm": 0.55, "r_arm": 0.18, "l_leg": -0.55, "r_leg": 0.52, "sword": 0.24, "footPhase": "left"},
        {"lean": -0.03, "bob": -1.4, "head": 0.02, "jaw": 0.08, "l_arm": 0.62, "r_arm": 0.04, "l_leg": -0.22, "r_leg": 0.18, "sword": 0.16},
        {"lean": 0.04, "bob": -0.7, "head": 0.04, "jaw": 0.02, "l_arm": 0.84, "r_arm": -0.16, "l_leg": 0.34, "r_leg": -0.32, "sword": 0.0, "footPhase": "right"},
        {"lean": 0.08, "bob": 0, "head": 0.02, "jaw": 0.05, "l_arm": 0.96, "r_arm": -0.28, "l_leg": 0.58, "r_leg": -0.5, "sword": -0.08, "footPhase": "right"},
        {"lean": 0.02, "bob": -1.3, "head": -0.03, "jaw": 0.1, "l_arm": 0.82, "r_arm": -0.1, "l_leg": 0.2, "r_leg": -0.14, "sword": 0.02},
        {"lean": -0.05, "bob": -0.6, "head": -0.06, "jaw": 0.02, "l_arm": 0.64, "r_arm": 0.12, "l_leg": -0.36, "r_leg": 0.3, "sword": 0.2, "footPhase": "left"},
    ],
    "guard": [
        {"lean": -0.14, "bob": -0.2, "head": -0.08, "jaw": 0.04, "l_arm": 0.35, "r_arm": -0.55, "l_leg": -0.22, "r_leg": 0.22, "sword": -0.55},
        {"lean": -0.12, "bob": -0.8, "head": -0.02, "jaw": 0.1, "l_arm": 0.28, "r_arm": -0.62, "l_leg": -0.18, "r_leg": 0.18, "sword": -0.62},
    ],
    "attack": [
        {"lean": -0.2, "bob": -0.5, "head": -0.12, "jaw": 0.08, "l_arm": 0.18, "r_arm": -0.9, "l_leg": -0.25, "r_leg": 0.26, "sword": -0.95, "phase": "anticipate"},
        {"lean": -0.24, "bob": -1.5, "head": -0.15, "jaw": 0.16, "l_arm": 0.02, "r_arm": -1.12, "l_leg": -0.2, "r_leg": 0.16, "sword": -1.18, "phase": "windup"},
        {"lean": 0.22, "bob": 1.1, "head": 0.08, "jaw": 0.22, "l_arm": 1.14, "r_arm": 0.78, "l_leg": 0.45, "r_leg": -0.15, "sword": 0.92, "phase": "contact"},
        {"lean": 0.1, "bob": 0.1, "head": 0.04, "jaw": 0.08, "l_arm": 0.96, "r_arm": 0.32, "l_leg": 0.22, "r_leg": -0.04, "sword": 0.38, "phase": "recover"},
        {"lean": -0.02, "bob": 0, "head": 0.0, "jaw": 0.02, "l_arm": 0.78, "r_arm": -0.08, "l_leg": -0.06, "r_leg": 0.1, "sword": 0.1, "phase": "recover"},
    ],
    "hit": [
        {"lean": 0.28, "bob": 1.0, "head": -0.28, "jaw": 0.25, "l_arm": 1.2, "r_arm": 0.38, "l_leg": -0.35, "r_leg": 0.5, "sword": 0.5, "hit": True},
        {"lean": 0.08, "bob": 0.1, "head": -0.1, "jaw": 0.08, "l_arm": 0.96, "r_arm": 0.06, "l_leg": -0.12, "r_leg": 0.24, "sword": 0.16, "hit": True},
    ],
    "death": [
        {"collapse": 0.18, "lean": 0.45, "bob": 7, "head": -0.4, "jaw": 0.3, "l_arm": 1.25, "r_arm": 0.5, "l_leg": 0.1, "r_leg": 0.7, "sword": 0.8},
        {"collapse": 0.48, "lean": 1.1, "bob": 17, "head": -0.9, "jaw": 0.45, "l_arm": 1.6, "r_arm": 1.0, "l_leg": 0.9, "r_leg": 1.2, "sword": 1.2},
        {"collapse": 0.78, "lean": 1.45, "bob": 27, "head": -1.25, "jaw": 0.4, "l_arm": 1.9, "r_arm": 1.4, "l_leg": 1.2, "r_leg": 1.5, "sword": 1.4},
        {"collapse": 1.0, "lean": 1.57, "bob": 34, "head": -1.45, "jaw": 0.35, "l_arm": 2.1, "r_arm": 1.7, "l_leg": 1.45, "r_leg": 1.75, "sword": 1.55},
    ],
}

BASE = {
    "neck": (58, 43),
    "spine": (56, 58),
    "pelvis": (55, 74),
    "l_shoulder": (47, 48),
    "r_shoulder": (66, 49),
    "l_hip": (49, 76),
    "r_hip": (61, 76),
}


def sc(value):
    return int(round(value * SCALE))


def point(x, y):
    return (sc(x), sc(y))


def rotate(px, py, cx, cy, angle):
    dx = px - cx
    dy = py - cy
    c = math.cos(angle)
    s = math.sin(angle)
    return cx + dx * c - dy * s, cy + dx * s + dy * c


def transform(pose, x, y):
    cx, cy = BASE["pelvis"]
    angle = pose.get("lean", 0) * (0.9 if pose.get("collapse") else 0.42)
    rx, ry = rotate(x, y, cx, cy, angle)
    return rx + pose.get("shift_x", 0), ry + pose.get("bob", 0)


def limb_end(start, base_angle, pose_angle, length):
    angle = base_angle + pose_angle
    return start[0] + math.cos(angle) * length, start[1] + math.sin(angle) * length


def draw_line(draw, xy, fill, width):
    draw.line([point(x, y) for x, y in xy], fill=fill, width=max(1, sc(width)), joint="curve")


def ellipse(draw, cx, cy, rx, ry, fill):
    draw.ellipse((sc(cx - rx), sc(cy - ry), sc(cx + rx), sc(cy + ry)), fill=fill)


def polygon(draw, points, fill):
    draw.polygon([point(x, y) for x, y in points], fill=fill)


def draw_bone(draw, a, b, width=3.2, knob=True):
    ax, ay = a
    bx, by = b
    draw_line(draw, [a, b], PALETTE["outline"], width + 2.7)
    draw_line(draw, [a, b], PALETTE["bone_dark"], width + 1.3)
    draw_line(draw, [a, b], PALETTE["bone"], width)
    draw_line(
        draw,
        [(ax + (bx - ax) * 0.08, ay + (by - ay) * 0.08), (bx, by)],
        PALETTE["bone_light"],
        max(0.9, width * 0.35),
    )
    if not knob:
        return
    radius = width * 0.72
    for x, y in (a, b):
        ellipse(draw, x, y, radius + 1.1, radius + 0.8, PALETTE["outline"])
        ellipse(draw, x, y, radius, radius * 0.82, PALETTE["bone_mid"])
        ellipse(draw, x - radius * 0.25, y - radius * 0.22, radius * 0.35, radius * 0.25, PALETTE["bone_light"])


def draw_ribs(draw, pose):
    spine_top = transform(pose, 56, 48)
    spine_bottom = transform(pose, 55, 68)
    draw_bone(draw, spine_top, spine_bottom, 3.5, knob=False)
    draw_line(draw, [spine_top, spine_bottom], PALETTE["bone_light"], 1.1)
    for index in range(5):
        y = 50 + index * 4.3
        for side in (-1, 1):
            start = transform(pose, 56 + side * 1.8, y)
            mid = transform(pose, 56 + side * (11 + index * 0.5), y - 2.5 + index * 0.7)
            end = transform(pose, 56 + side * (14 + index * 0.4), y + 2.8 + index * 0.7)
            draw_line(draw, [start, mid, end], PALETTE["outline"], 3.0)
            draw_line(draw, [start, mid, end], PALETTE["bone"], 1.65)
            if index < 3:
                draw_line(draw, [start, mid], PALETTE["bone_light"], 0.7)
    draw_bone(draw, transform(pose, 48, 45), transform(pose, 64, 46), 2.4, knob=True)
    pelvis_points = [
        transform(pose, 43, 72),
        transform(pose, 51, 68),
        transform(pose, 56, 72),
        transform(pose, 63, 68),
        transform(pose, 70, 73),
        transform(pose, 63, 81),
        transform(pose, 55, 80),
        transform(pose, 47, 81),
    ]
    polygon(draw, pelvis_points, PALETTE["outline"])
    inner = [
        transform(pose, 46, 73),
        transform(pose, 52, 70),
        transform(pose, 56, 74),
        transform(pose, 62, 70),
        transform(pose, 67, 74),
        transform(pose, 61, 78),
        transform(pose, 55, 78),
        transform(pose, 49, 78),
    ]
    polygon(draw, inner, PALETTE["bone_dark"])


def draw_skull(draw, pose):
    cx, cy = transform(pose, 59, 35)
    ellipse(draw, cx, cy - 1, 12.3, 13.7, PALETTE["outline"])
    ellipse(draw, cx, cy - 2, 10.2, 11.4, PALETTE["bone_mid"])
    ellipse(draw, cx + 2.5, cy - 6.8, 5.2, 4.6, PALETTE["bone_light"])
    ellipse(draw, cx - 5.0, cy - 2.3, 3.8, 4.1, PALETTE["socket"])
    ellipse(draw, cx + 4.0, cy - 2.2, 3.4, 3.9, PALETTE["socket"])
    ellipse(draw, cx + 7.4, cy + 2.8, 2.1, 2.6, PALETTE["socket"])
    jaw = pose.get("jaw", 0)
    polygon(
        draw,
        [
            (cx - 5.3, cy + 7.0 + jaw * 3),
            (cx + 4.5, cy + 7.3 + jaw * 3),
            (cx + 3.3, cy + 13 + jaw * 3),
            (cx - 4.3, cy + 12.5 + jaw * 3),
        ],
        PALETTE["outline"],
    )
    polygon(
        draw,
        [
            (cx - 3.9, cy + 7.5 + jaw * 3),
            (cx + 3.2, cy + 7.7 + jaw * 3),
            (cx + 2.2, cy + 11.5 + jaw * 3),
            (cx - 3.2, cy + 11.1 + jaw * 3),
        ],
        PALETTE["bone"],
    )
    for dx in (-2.3, 0, 2.1):
        draw_line(draw, [(cx + dx, cy + 8.0 + jaw * 3), (cx + dx - 0.2, cy + 11.2 + jaw * 3)], PALETTE["outline"], 0.8)
    draw_line(draw, [(cx - 7.8, cy - 11.0), (cx - 2.2, cy - 7.0), (cx - 4.8, cy - 3.2)], PALETTE["bone_dark"], 1.0)
    draw_line(draw, [(cx + 1.5, cy - 12.5), (cx + 5.6, cy - 8.2), (cx + 3.8, cy - 5.4)], PALETTE["bone_dark"], 1.0)


def draw_foot(draw, p, forward=1):
    x, y = p
    polygon(draw, [(x - 1.5, y - 1.0), (x + 8.0 * forward, y - 0.2), (x + 10.5 * forward, y + 2.4), (x + 1.0, y + 3.2), (x - 2.5, y + 1.6)], PALETTE["outline"])
    polygon(draw, [(x, y), (x + 7.0 * forward, y + 0.3), (x + 8.6 * forward, y + 1.9), (x + 1.2, y + 2.3), (x - 1.0, y + 1.2)], PALETTE["bone"])
    for index in range(4):
        draw_line(draw, [(x + (4.0 + index * 1.3) * forward, y + 1.2), (x + (6.0 + index * 1.5) * forward, y + 3.3 + index * 0.12)], PALETTE["bone_light"], 0.75)


def draw_hand(draw, p, flip=1):
    x, y = p
    ellipse(draw, x, y, 2.5, 2.0, PALETTE["outline"])
    ellipse(draw, x, y, 1.5, 1.3, PALETTE["bone"])
    for index in range(4):
        draw_line(draw, [(x + 0.5 * flip, y + 0.2), (x + (4.2 + index * 1.0) * flip, y + 2.0 + index * 1.0)], PALETTE["outline"], 1.55)
        draw_line(draw, [(x + 0.5 * flip, y + 0.2), (x + (3.8 + index * 1.0) * flip, y + 1.7 + index * 0.95)], PALETTE["bone_light"], 0.75)


def draw_sword(draw, hand, pose):
    hx, hy = hand
    phase = pose.get("phase")
    angle = 0.85 - pose.get("sword", 0) * 0.65
    length = 40 if phase == "contact" else 35
    c = math.cos(angle)
    s = math.sin(angle)
    tip = (hx + c * length, hy + s * length)
    base = (hx - c * 5, hy - s * 5)
    guard_a = (hx + math.cos(angle + math.pi / 2) * 7, hy + math.sin(angle + math.pi / 2) * 7)
    guard_b = (hx - math.cos(angle + math.pi / 2) * 7, hy - math.sin(angle + math.pi / 2) * 7)
    draw_line(draw, [guard_a, guard_b], PALETTE["outline"], 4.0)
    draw_line(draw, [guard_a, guard_b], PALETTE["rust"], 2.2)
    draw_line(draw, [base, tip], PALETTE["outline"], 6.3)
    draw_line(draw, [base, tip], PALETTE["rust_dark"], 4.4)
    draw_line(draw, [(hx + c * 3, hy + s * 3), tip], PALETTE["rust"], 3.1)
    draw_line(draw, [(hx + c * 8, hy + s * 8), (tip[0] - c * 3, tip[1] - s * 3)], PALETTE["steel"], 1.2)
    draw_line(draw, [(hx + c * 10, hy + s * 10), (tip[0] - c * 8, tip[1] - s * 8)], PALETTE["steel_light"], 0.65)


def draw_limbs(draw, pose):
    lhip = transform(pose, *BASE["l_hip"])
    rhip = transform(pose, *BASE["r_hip"])
    lknee = limb_end(lhip, math.pi / 2 + 0.18, pose.get("l_leg", 0) * 0.55, 16)
    lfoot = limb_end(lknee, math.pi / 2 - 0.05, pose.get("l_leg", 0) * 0.85, 19)
    rknee = limb_end(rhip, math.pi / 2 - 0.12, pose.get("r_leg", 0) * 0.55, 16)
    rfoot = limb_end(rknee, math.pi / 2 + 0.08, pose.get("r_leg", 0) * 0.85, 19)
    if not pose.get("collapse"):
        lfoot = (lfoot[0], min(103, max(94, lfoot[1])))
        rfoot = (rfoot[0], min(103, max(94, rfoot[1])))
    draw_bone(draw, rhip, rknee, 3.2)
    draw_bone(draw, rknee, rfoot, 2.8)
    draw_foot(draw, rfoot)
    draw_bone(draw, lhip, lknee, 3.2)
    draw_bone(draw, lknee, lfoot, 2.8)
    draw_foot(draw, lfoot)
    lshoulder = transform(pose, *BASE["l_shoulder"])
    rshoulder = transform(pose, *BASE["r_shoulder"])
    lelbow = limb_end(lshoulder, math.pi / 2 + 0.25, pose.get("l_arm", 0) * 0.6, 17)
    lhand = limb_end(lelbow, math.pi / 2 + 0.05, pose.get("l_arm", 0) * 0.78, 17)
    relbow = limb_end(rshoulder, math.pi / 2 - 0.25, pose.get("r_arm", 0) * 0.75, 15)
    rhand = limb_end(relbow, math.pi / 2 - 0.05, pose.get("r_arm", 0) * 0.8, 16)
    if pose.get("phase") in {"anticipate", "windup"}:
        draw_sword(draw, lhand, pose)
    draw_bone(draw, lshoulder, lelbow, 3.0)
    draw_bone(draw, lelbow, lhand, 2.6)
    draw_hand(draw, lhand, flip=-1)
    draw_bone(draw, rshoulder, relbow, 2.9)
    draw_bone(draw, relbow, rhand, 2.4)
    draw_hand(draw, rhand, flip=1)
    if pose.get("phase") not in {"anticipate", "windup"}:
        draw_sword(draw, lhand, pose)


def draw_frame(pose):
    image = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    if pose.get("collapse") and pose["collapse"] > 0.72:
        draw_bone(draw, transform(pose, 35, 89), transform(pose, 54, 98), 3.1)
        draw_bone(draw, transform(pose, 52, 94), transform(pose, 74, 90), 3.0)
        draw_bone(draw, transform(pose, 41, 80), transform(pose, 64, 85), 2.7)
        draw_bone(draw, transform(pose, 62, 78), transform(pose, 84, 73), 2.6)
        for index in range(4):
            draw_line(draw, [transform(pose, 45 + index * 4, 84 - index), transform(pose, 61 + index * 4, 90 - index)], PALETTE["outline"], 2.8)
            draw_line(draw, [transform(pose, 45 + index * 4, 84 - index), transform(pose, 61 + index * 4, 90 - index)], PALETTE["bone"], 1.5)
        cx, cy = transform(pose, 43, 76)
        ellipse(draw, cx, cy, 11, 9, PALETTE["outline"])
        ellipse(draw, cx, cy, 9, 7.2, PALETTE["bone_mid"])
        ellipse(draw, cx - 3, cy - 1, 2.5, 2.8, PALETTE["socket"])
        draw_sword(draw, transform(pose, 38, 89), {"sword": 1.55})
    else:
        draw_limbs(draw, pose)
        draw_ribs(draw, pose)
        draw_skull(draw, pose)
    if pose.get("hit"):
        overlay = Image.new("RGBA", (W, H), PALETTE["hit"])
        overlay.putalpha(image.getchannel("A").point(lambda value: min(50, value // 4)))
        image = Image.alpha_composite(image, overlay)
    image = image.filter(ImageFilter.UnsharpMask(radius=1.0, percent=90, threshold=2))
    return image.resize((CELL, CELL), Image.Resampling.LANCZOS)


def alpha_bbox(image):
    return image.getchannel("A").getbbox()


def main():
    OUT_ATLAS.parent.mkdir(parents=True, exist_ok=True)
    ROOT.mkdir(parents=True, exist_ok=True)
    max_frames = max(len(POSES[row]) for row in ROWS)
    atlas = Image.new("RGBA", (CELL * max_frames, CELL * len(ROWS)), (0, 0, 0, 0))
    for row_index, action in enumerate(ROWS):
        out_dir = FRAMES_ROOT / action
        out_dir.mkdir(parents=True, exist_ok=True)
        for old in out_dir.glob("*.png"):
            old.unlink()
        strip = Image.new("RGBA", (CELL * len(POSES[action]), CELL), (0, 0, 0, 0))
        for column, pose in enumerate(POSES[action]):
            frame = draw_frame(pose)
            if not alpha_bbox(frame):
                raise RuntimeError(f"empty frame {action}:{column}")
            atlas.alpha_composite(frame, (column * CELL, row_index * CELL))
            strip.alpha_composite(frame, (column * CELL, 0))
            frame.save(out_dir / f"{column:02d}.png")
        strip.save(ROOT / f"{action}_strip.png")
    atlas.save(OUT_ATLAS)
    bbox = alpha_bbox(Image.open(FRAMES_ROOT / "walk" / "00.png").convert("RGBA"))
    runtime_height = (bbox[3] - bbox[1]) / CELL * DRAW_H
    print(OUT_ATLAS.resolve())
    print("walk_bbox", bbox, "source_height", bbox[3] - bbox[1], "runtime_height", round(runtime_height, 1))


if __name__ == "__main__":
    main()
