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
- draw primary character bodies from authored atlas frames unless placeholder/debug art was explicitly requested
- avoid allocations in hot paths where simple locals work
- draw from manifest state only; do not decide AI behavior

## Data Ownership

- Unit stats and spawn data: `src/content/units/`
- Unit behavior: `src/gameplay/units/UnitManager.js`
- UnitV2 art manifests: `src/content/units/<unit-id>/art.js` and `src/content/units/unitV2Art.js`
- UnitV2 rendering: `src/rendering/UnitV2Painter.js`
