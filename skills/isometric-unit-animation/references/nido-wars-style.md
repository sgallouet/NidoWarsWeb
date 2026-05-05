# Nido Wars Unit Style

Use these notes when generating or evaluating unit animation art for this project.

## Warrior Style Anchors

- Source sheets: `assets/warrior_idle_sheet.png` and `assets/warrior_walk_sheet.png`.
- Source cell: `186x186`; runtime draw size is about `66x66`, so details must survive downscaling.
- Facing: three-quarter isometric, body angled slightly to the viewer's right.
- Silhouette: compact full-body sprite with oversized readable head/torso, planted feet, and no cast shadow in the asset.
- Linework: crisp dark outline with small interior dark strokes; not clean vector art and not soft painting.
- Color: muted fantasy earth tones with controlled highlights. Browns, steel gray, dull blue cloth, leather, warm skin, and off-white metal highlights.
- Rendering: hand-painted pixel-art feel with hard edges and limited palette, but not strict 1-bit retro pixel art.
- Motion: subtle but visible frame-to-frame change. Identity stays locked; animation changes pose, not costume.

## Settler Target

- Poor worker/settler, visually below the warrior in status and equipment.
- Ragged tan-gray tunic, patched brown trousers, rope belt, wrapped feet or bare feet.
- Thin arms and legs, tired face, dark messy hair or simple cloth hood.
- Simple wooden walking staff, hoe, or hand tool. Keep tools attached across every frame.
- Hunched, weary posture is welcome, but the top of the head, feet, and staff must stay inside every cell.

## Rejection Checklist

Reject or regenerate when the sprite looks like:

- A different artist than the warrior.
- A portrait illustration pasted into a sprite cell.
- A top-down or side-view character instead of isometric three-quarter.
- A soft AI painting with blurred edges.
- A tiny retro sprite with too few details to match the warrior.
- A sheet where the staff/tool floats, changes length wildly, or swaps hands.
- A movement loop where only the whole image shifts without actual body animation.
