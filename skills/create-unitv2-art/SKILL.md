---
name: create-unitv2-art
description: Create, validate, preview, and integrate Nido Wars UnitV2 animated unit art for the browser canvas runtime. Use when Codex needs to design a new unit from scratch, rethink unit art away from legacy warrior/settler sprite sheets, define UnitV2 animation manifests, generate or author compact 2D isometric unit motion, export animated WebP previews, or add enemy/player/critter art with idle, walk, attack, hit, death, work, gather, build, clean, carry, recover, and celebration states.
---

# Create UnitV2 Art

## Purpose

Use this skill to produce new Nido Wars unit art from first principles. Do not copy the legacy warrior/settler workflow of large single-action `186x186` row sheets. UnitV2 art is a compact, manifest-driven animation system for the web app: canonical unit identity, explicit animation coverage, deterministic validation, and animated WebP previews before game integration.

## Read First

- Read `references/unitv2-runtime-contract.md` before changing `src/units` or `src/rendering`.
- Read `references/animation-set.md` before deciding animation coverage.
- Read `references/nido-wars-unitv2-style.md` before designing prompts, silhouettes, palettes, or runtime drawing.

## Workflow

1. Establish the unit identity: faction, role, silhouette, scale, material, palette, threat level, weapon/tool, and how it reads at game zoom.
2. Create a canonical UnitV2 design first. Lock proportions, anchors, palette, facing behavior, and body parts before animating.
3. Choose the smallest complete animation set for the role. Enemies usually need `idle`, `walk`, `attack`, `hit`, and `death`; workers need the work/carry/recover states they can enter.
4. Author or generate animation in action/direction strips or a procedural manifest. Keep the runtime contract stable either way.
5. Export transparent animated WebP previews for each action being accepted. Use no UI, labels, shadows, floor, or frame numbers.
6. Validate the UnitV2 manifest and preview coverage before wiring into gameplay.
7. Integrate through unit definitions and `UnitPainter`/focused UnitV2 painter code. Keep AI rules in `UnitManager`, not in art files.
8. Smoke-test in the browser at desktop and phone viewports. Watch the frame graph while several units move.

## UnitV2 Output Shape

Prefer this structure for each unit:

```text
src/units/unitV2Art.js
  UNIT_V2_ART.<unitKey>
    anchor, bounds, scale, palette
    parts or atlas metadata
    animations[action]
      frameMs
      frames or procedural channels
      footPhase / attackPhase / hitPhase as needed

artifacts/unitv2/<unitKey>/
  previews/<action>.webp
  qa/validation.json
```

Keep runtime assets small. If a unit needs generated raster art, pack it into one atlas plus metadata, not one oversized file per animation.

## Prompt Pattern

Use this when AI image generation is appropriate:

```text
Character: [unit identity].
Create compact isometric web game unit art for Nido Wars UnitV2.
Style lock: same artist as the warrior unit, hand-painted pixel-art fantasy sprite, crisp near-black outside outline, compact readable silhouette, muted earth palette, soft directional highlights, tiny high-contrast facial details, no painterly blur, no modern cartoon style, no 3D render.
Camera and framing: three-quarter isometric unit sprite facing the same direction as the warrior, full body visible in every frame, feet stay on the same baseline, staff/tool stays attached to the hands, centered in each square frame.
Animation: [action], [frame count] frames, [direction or mirrored facing].
Output: transparent or flat chroma-key background, equal cells, no floor, no UI, no text, no frame numbers.
Web target: readable in a realtime browser canvas at 60 FPS.
```

For generated strips, use chroma key colors that do not appear in the unit. Remove only edge-connected key pixels first, then near-exact residue after fitting frames. Never globally delete a color family that could be part of the design.

## WebP Preview

Use animated WebP as the normal acceptance preview. Upscale with nearest-neighbor or crisp pixel scaling, keep transparency, and verify that frames clear correctly with no trails. GIF is not a required output for Nido Wars UnitV2.

Use:

```bash
python skills/create-unitv2-art/scripts/export_unitv2_webp_preview.py \
  --frames-dir artifacts/unitv2/<unitKey>/frames/<action> \
  --output artifacts/unitv2/<unitKey>/previews/<action>.webp \
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

## Validation

Run the manifest validator when editing UnitV2 data:

```bash
node skills/create-unitv2-art/scripts/validate_unitv2_manifest.mjs
```

Block integration when required role animations are missing, `frameMs` is non-positive, palettes are incomplete, anchors are missing, or any declared animation has no frames/channels.

## Integration Rules

- Add unit template data in `src/units/unitDefinitions.js`.
- Keep UnitV2 drawing in a focused painter such as `src/rendering/UnitV2Painter.js`.
- Keep movement and behavior rules in `src/units/UnitManager.js`.
- Do not add per-frame image loading, DOM updates, or full-world scans.
- Use canvas shadows at runtime instead of baked shadows.
- Prefer mirrored east/west facing for compactness unless the unit truly needs 8-direction art.
- Preserve 60 FPS before adding secondary effects.
