# UnitV2 Runtime Contract

## Manifest

Each UnitV2 entry should be serializable and cheap to read from the render loop.

Required fields:

- `key`: stable id used by unit definitions
- `label`: human-readable art label
- `anchor`: `{ x, y }` foot anchor in local canvas coordinates
- `bounds`: `{ width, height }` approximate runtime art footprint
- `palette`: named colors used by the painter
- `animations`: object keyed by action name

Animation fields:

- `frameMs`: positive frame duration
- `frames`: array of atlas frame descriptors, or authored rig-pose descriptors when the user explicitly asks for non-raster art
- `loop`: boolean, default `true`

Frame descriptors should be small: atlas coordinates, authored pose ids, offsets, contact tags, and foot/attack phase tags. Avoid storing large nested geometry per frame.

For truly cell-aligned sheets, `{ column, row }` plus atlas cell metadata is acceptable. For uneven imported atlases, prefer explicit source rectangles and anchors:

```js
{
  source: { left, top, right, bottom },
  anchor: { x, y },
  footPhase: "leftContact"
}
```

Do not resize/regrid uneven source atlases and then infer frame cells from the resized sheet. Use the original atlas pixel coordinates, generate a `frame_selection_debug.png` overlay, and inspect every rectangle before accepting the manifest.

Do not use procedural channels as the primary character animation. Procedural movement is acceptable only for secondary effects such as glow, dust, cloth flutter, or one-pixel impact recoil after a real pose/atlas frame has been selected.

## Runtime Mapping

Use unit state to select action:

- `death`: corpse rendering
- `hit`: `hitFlashMs > 0`
- `attack`: `attackFlashMs > 0`
- `guard`: `order === "attack"` while in range or waiting for cooldown
- `walk`: has `movementSegment` or queued movement
- `recover`: player wounded/recovering
- `carry`: carrying treasure, herbs, resources, or meat
- `build`, `clean`, `gather`, `work`: active worker orders
- `idle`: fallback

Enemies can start with `idle`, `walk`, `attack`, `hit`, and `death`.

## Painter Contract

`UnitV2Painter` should:

- draw a runtime canvas shadow from the anchor
- mirror with `facingX` instead of duplicating frames
- derive animation frame by `elapsed / frameMs`
- support explicit per-frame `{ source, anchor }` rectangles for uneven imported atlases
- draw primary character bodies from authored atlas frames unless placeholder/debug art was explicitly requested
- avoid allocations in hot paths where simple locals work
- draw from manifest state only; do not decide AI behavior

## Data Ownership

- Unit stats and spawn data: `src/content/units/`
- Unit behavior: `src/gameplay/units/UnitManager.js`
- UnitV2 art manifests: `src/content/units/<unit-id>/art.js` and `src/content/units/unitV2Art.js`
- UnitV2 rendering: `src/rendering/UnitV2Painter.js`
- UnitV2 extraction QA helpers: `scripts/build-unitv2-frame-debug.py`, `src/content/units/<unit-id>/art/frame_selection_debug.png`, `src/content/units/<unit-id>/art/previews/*.webp`, and optional `src/content/units/<unit-id>/refresh-art-previews.bat`
