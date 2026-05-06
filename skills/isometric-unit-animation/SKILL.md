---
name: isometric-unit-animation
description: Create, clean, validate, and preview isometric game unit animation sprites for Nido Wars-style browser/canvas games. Use when Codex needs to generate or adapt idle, walk, gather, work, attack, or death animations as raster sprite sheets or animated WebP previews from a reference image, existing unit art, or a text concept, especially when the output must match the existing warrior unit's hand-painted pixel-art style.
---

# Isometric Unit Animation

## Overview

Use this skill to produce game-ready isometric unit animation sheets that match the current Nido Wars unit art. The default output is an 8-frame horizontal PNG sheet with `186x186` source cells plus a transparent animated WebP preview.

## Epic Asset Rule

Every concept image, generated strip, cleaned sprite sheet, preview, and regeneration dependency must be copied under `D:\Codex\NidoWarsWeb` before any code, script, manifest, or doc references it. Keep active unit sources in `src/content/units/<unit-id>/art/source/`. Do not leave usable paths pointing at `Downloads`, temp folders, external drives, or remote URLs because those files are not committed and may disappear.

## Defaults

- Cell size: `186x186`
- Frames per row: `8`
- Camera: three-quarter isometric game sprite, same facing and scale family as the warrior unit
- Runtime draw size: usually `66x66` in canvas, so details must read when downscaled
- Character outline: every accepted unit sheet needs a crisp near-black outside contour like the warrior, plus small interior dark strokes where useful
- Background while generating: flat chroma key, preferably `#00ff00`, with no floor, shadow, text, UI, frame numbers, or borders
- Preview format: transparent animated WebP, `110-140ms` per frame

## Workflow

1. Gather references before prompting: current warrior idle sheet, warrior walk sheet, and the user's concept/reference image.
2. Read `references/nido-wars-style.md` when exact style matching matters.
3. Decide the smallest useful scope. Prefer one action at a time: `idle`, `walk`, `gather`, `work`, `attack`, or `death`.
4. Prompt image generation for a single horizontal strip of 8 equal square frames. Ask for coherent motion, not eight separate redesigns.
5. Save raw generated art as `src/content/units/<unit-id>/art/source/<action>_generated.png` when it belongs to an active unit; use `bin/legacy-assets/` only for retired experiments.
6. Run `scripts/prepare_isometric_sheet.py` to remove the chroma key, split/fit frames into exact cells, validate differences, and export the WebP preview.
7. Visually inspect the PNG sheet and WebP preview. Reject outputs with identity drift, mismatched scale, missing feet, detached tools, unreadable hands/faces, or frames that do not animate.
8. Integrate only after the sheet passes script checks and visual review.

## Prompt Pattern

Use the existing unit art as style anchors, then describe the new unit plainly:

```text
Create a game asset sprite sheet: 8-frame horizontal [ACTION] animation for the same isometric canvas game as the armored warrior reference.

Character: [UNIT DESCRIPTION].
Style lock: same artist as the warrior unit, hand-painted pixel-art fantasy sprite, crisp near-black outside outline, compact readable silhouette, muted earth palette, soft directional highlights, tiny high-contrast facial details, no painterly blur, no modern cartoon style, no 3D render.
Camera and framing: three-quarter isometric unit sprite facing the same direction as the warrior, full body visible in every frame, feet stay on the same baseline, staff/tool stays attached to the hands, centered in each square frame.
Animation: [ACTION MOTION], 8 distinct frames forming a loop, subtle body weight shift, readable feet/leg movement, no teleporting.
Output: one row of 8 equal square frames, flat #00ff00 background, no shadow, no floor, no text, no watermark.
```

For settler/worker units, keep the design poorer, lighter, and visibly shorter than the warrior: ragged cloth, thin limbs, dark messy hair or simple hood, bare or wrapped feet, wooden staff/tool, hunched but readable posture. In the final `186x186` cells, worker alpha bounds should be below the warrior's source height of about `158px`; target roughly `136-145px` tall when the worker is meant to be smaller.

## Cleanup And Preview

Run:

```bash
python skills/isometric-unit-animation/scripts/prepare_isometric_sheet.py \
  --input src/content/units/<unit-id>/art/source/<action>_generated.png \
  --output src/content/units/<unit-id>/art/<action>_sheet.png \
  --preview src/content/units/<unit-id>/art/previews/<action>.webp \
  --frames 8 \
  --cell 186 \
  --baseline-y 180 \
  --outline-radius 2 \
  --duration 125
```

For worker/settler sheets, add:

```bash
  --max-subject-height 142 \
  --outline-radius 2
```

Use `--key "#ff00ff"` if green is part of the character. Use `--crop "left,top,right,bottom"` only when generation adds labels, margins, or extra rows that the automatic split cannot handle.

## Validation Rules

Block acceptance when:

- Output size is not exactly `frames * 186` by `186`.
- Corners or background remain opaque.
- Any frame is sparse, cropped, or touches the source cell edge unexpectedly.
- Adjacent frames are nearly identical for a movement animation.
- The character changes outfit, palette, body proportions, tool, face, or facing direction.
- The silhouette lacks the warrior-style dark outside contour and blends into the map background.
- Worker/settler output is as tall as or taller than the warrior once fitted into `186x186` cells.
- Feet drift vertically in a way that will look like floating once the game shadow is drawn.
- The WebP preview leaves trails, accumulates frames, or loses transparency.

## Integration Notes

Keep shadows in canvas code, not in generated sheets. Set source foot anchors from the final sheet by inspecting the alpha bounding boxes, then draw the runtime shadow at the planted-foot baseline rather than at the visual center of the sprite.
