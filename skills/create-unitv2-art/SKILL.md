---
name: create-unitv2-art
description: Create, validate, preview, and integrate Nido Wars UnitV2 animated unit art for the browser canvas runtime. Use when Codex needs to design a new unit from scratch, rethink unit art away from legacy warrior/settler sprite sheets, define UnitV2 manifests, generate or author compact high-quality 2D isometric animation frames, export animated WebP previews, or add enemy/player/critter art with idle, walk, guard, attack, hit, death, work, gather, build, clean, carry, recover, and celebration states. This skill must reject transform-only animation, single-sprite wobble, low-effort cutouts, and assets that do not blend with existing soldier/settler art.
---

# Create UnitV2 Art

## Purpose

Use this skill to produce new Nido Wars unit art from first principles. Do not copy the legacy warrior/settler workflow of large single-action `186x186` row sheets, but do use warrior and settler as quality/style anchors. UnitV2 art is a compact, manifest-driven sprite/spritesheet system for the web app: canonical unit identity, explicit animation coverage, authored pose changes, deterministic validation, and animated WebP previews before game integration.

## Read First

- Read `references/unitv2-runtime-contract.md` before changing `src/gameplay/units` or `src/rendering`.
- Read `references/animation-set.md` before deciding animation coverage.
- Read `references/nido-wars-unitv2-style.md` before designing prompts, silhouettes, palettes, or runtime drawing.
- Read `references/art-quality-gates.md` before accepting, previewing, or integrating any UnitV2 asset.

## Workflow

1. Establish the unit identity: faction, role, silhouette, scale, material, palette, threat level, weapon/tool, and how it reads at game zoom.
2. Gather style anchors before prompting or drawing: current warrior sheet, current settler sheet, and the user's reference/concept image.
3. Create a canonical UnitV2 design first. Lock proportions, anchors, palette, facing behavior, and body parts before animating.
4. Choose the smallest complete animation set for the role. Enemies usually need `idle`, `walk`, `guard`, `attack`, `hit`, and `death`; workers need the work/carry/recover states they can enter.
5. Generate or author distinct animation frames. Character body frames must be newly posed/redrawn; do not animate by only translating, rotating, scaling, skewing, tinting, or cropping one source sprite.
6. Pack accepted frames into one compact atlas with manifest metadata. Use procedural channels only for secondary effects such as glow, dust, or bob, never as the primary body animation.
7. Export transparent animated WebP previews for each action being accepted. Use no UI, labels, shadows, floor, or frame numbers.
8. Validate the UnitV2 manifest, style/scale fit, and preview coverage before wiring into gameplay.
9. Integrate through `src/content/units/<unit-id>/` definitions/art manifests and `UnitPainter`/focused UnitV2 painter code. Keep AI rules in unit runtime systems, not in art files.
10. Smoke-test in the browser at desktop and phone viewports. Watch the frame graph while several units move.

## UnitV2 Output Shape

Prefer this structure for each unit:

```text
src/content/units/<unit-id>/art.js
  UNIT_V2_ART.<unitKey>
    anchor, bounds, scale, palette
    compact atlas metadata
    animations[action]
      frameMs
      atlas frame coordinates plus semantic tags
      footPhase / attackPhase / hitPhase as needed

src/content/units/<unit-id>/art/
  unitv2_atlas.png
  previews/<action>.webp
  source/frames/<action>/
  qa/validation.json
```

Keep runtime assets small and sprite/spritesheet based. Prefer low-resolution source cells, crisp pixel edges, and strong near-black silhouette outlines. Pack generated raster art into one atlas plus metadata, not one oversized file per animation. Do not integrate a UnitV2 character whose primary body is canvas-drawn primitives unless the user explicitly asks for placeholder/debug art.

## Prompt Pattern

Use this when AI image generation is appropriate:

```text
Character: [unit identity].
Create compact isometric web game unit art for Nido Wars UnitV2.
Style lock: same artist as the warrior/settler unit art, hand-painted low-resolution pixel-art fantasy sprite, crisp near-black outside outline and internal dark accents, compact readable silhouette, muted earth palette, soft directional highlights, high-contrast face/weapon details, no painterly blur, no modern cartoon style, no 3D render.
Camera and framing: three-quarter isometric unit sprite facing the same direction as the warrior, full body visible in every frame, feet stay on the same baseline, weapon/tool stays attached to the hands, centered in each square frame.
Animation: [action], [frame count] distinct hand-authored frames with changed limb/body poses, [direction or mirrored facing].
Output: transparent or flat chroma-key background, equal cells, no floor, no UI, no text, no frame numbers.
Web target: readable in a realtime browser canvas at 60 FPS.
```

For reference-image tasks, treat the reference as design direction, not as animation. Use it to preserve silhouette, face/head cues, weapon/tool shape, material palette, and posture, then create a proper game sprite sheet in the Nido Wars style. A cutout of the reference moved around is not acceptable.

For generated strips, use chroma key colors that do not appear in the unit. Remove only edge-connected key pixels first, then near-exact residue after fitting frames. Never globally delete a color family that could be part of the design.

## WebP Preview

Use animated WebP as the normal acceptance preview. Upscale with nearest-neighbor or crisp pixel scaling, keep transparency, and verify that frames clear correctly with no trails. GIF is not a required output for Nido Wars UnitV2.

Use:

```bash
python skills/create-unitv2-art/scripts/export_unitv2_webp_preview.py \
  --frames-dir src/content/units/<unit-id>/art/source/frames/<action> \
  --output src/content/units/<unit-id>/art/previews/<action>.webp \
  --duration 120 \
  --scale 3
```

Preview acceptance requires:

- transparent or intentionally neutral background
- stable foot anchor and no floor shadow baked into the art
- no identity drift between frames
- attack/contact frames that stay attached to the body or weapon
- no frame touching cell edges unless the manifest declares it intentional
- runtime-size readability on desert, snow, grass, ash, and paradise terrain
- visible authored pose changes: feet, arms, weapon, torso, head, and contact/recovery timing must change according to the action
- quality at least comparable to the current warrior/settler sprites after downscaling

## Validation

Run the manifest validator when editing UnitV2 data:

```bash
node skills/create-unitv2-art/scripts/validate_unitv2_manifest.mjs
```

Run the motion sanity check on each generated action frame directory:

```bash
python skills/create-unitv2-art/scripts/check_unitv2_frame_motion.py \
  --frames-dir src/content/units/<unit-id>/art/source/frames/<action>
```

This script is not an art director. Passing it does not prove the frames are good. Failing it means the motion is too weak or suspicious and must be inspected or redone.

Block integration when required role animations are missing, `frameMs` is non-positive, palettes are incomplete, anchors are missing, atlas metadata is invalid, or any declared animation has no frames/channels.

Before integration, also write a short QA note in the work summary with:

- reference sources used
- runtime subject height compared with settler and warrior
- action-to-game-state mapping
- what makes the frames authored rather than transform-only
- any known quality compromises

## Integration Rules

- Add unit template data in `src/content/units/<unit-id>/` and the unit registry.
- Keep UnitV2 drawing in a focused painter such as `src/rendering/UnitV2Painter.js`.
- Keep movement and behavior rules in unit runtime systems under `src/gameplay/units/`.
- Do not add per-frame image loading, DOM updates, or full-world scans.
- Register runtime image paths in the content asset manifest so the loading screen preloads them before play.
- Use canvas shadows at runtime instead of baked shadows.
- Prefer mirrored east/west facing for compactness unless the unit truly needs 8-direction art.
- Preserve 60 FPS before adding secondary effects.

## Hard Rejection Rules

Reject and redo the asset when any of these are true:

- The animation is just one sprite translated, rotated, scaled, warped, or tinted.
- A reference cutout is used directly as every frame without reposing/redrawing.
- Walk does not show leg alternation and foot contact.
- Attack does not show anticipation, contact, and recovery.
- Death is only a rotated standing sprite rather than a collapse or fallen pose.
- The unit is taller than the intended scale target after runtime draw sizing.
- The style is worse than the existing warrior/settler sprites at runtime size.
