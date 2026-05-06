---
name: create-tile-art
description: Create, tune, validate, and integrate Nido Wars terrain tile art for the browser canvas runtime. Use when Codex needs to add a new terrain type, replace tile art, make isometric ground blend seamlessly without visible grid borders, derive compact runtime tile sprites from user reference art, author transparent decoration sprites for terrain, update tile manifests/preloads, or smoke-test terrain rendering and performance.
---

# Create Tile Art

## Purpose

Use this skill to create terrain art that looks good in the live Nido Wars isometric canvas without exposing the map grid. Tile art should be compact, preloaded, deterministic, and aligned with the warm pixel-art style of the firecamp, unit sprites, and existing terrain.

## Epic Asset Rule

Every source image, generated tile sheet, preview, and regeneration dependency must be copied under `D:\Codex\NidoWarsWeb` before any code, script, manifest, or doc references it. Keep active tile art beside the owning `src/content/tiles/<tile-id>/` folder. Do not leave usable paths pointing at `Downloads`, temp folders, external drives, or remote URLs because those files are not committed and may disappear.

## Read First

- Read `references/seamless-terrain.md` before making or tuning tile art that should blend across adjacent tiles.
- Read `references/runtime-integration.md` before changing `src/content/assets/runtimeImages.js`, `src/content/tiles/**/art.js`, `src/world/createDesertMap.js`, or `src/rendering/TilePainter.js`.
- For broader repo structure, also follow `skills/nido-wars-architecture/SKILL.md`.

## Workflow

1. Identify the terrain owner under `src/content/tiles/<tile-id>/`.
2. Gather visual anchors before generating art: current tile, user reference, nearby biome tiles, and the object sitting on the tile if there is one.
3. Decide whether the tile should be a single blended patch, a varied repeated terrain, or a discrete feature tile.
4. Keep the ground tile itself mostly surface texture. Put rocks, dead plants, chips, debris, and other readable details in a separate transparent decoration spritesheet unless they are truly part of the base terrain.
5. Generate compact runtime sprites. Prefer `164x84` source frames for standard `82x42` isometric tiles when source detail needs to survive downscale; use `82x42` when the art is already authored at runtime scale.
6. Avoid visible grid seams. Do not bake dark borders, white outlines, alpha fringes, or center/edge brightness ramps into every terrain tile.
7. Register runtime paths in `src/content/assets/runtimeImages.js` and load them through a content art manifest beside the tile.
8. Draw via `TilePainter` or a focused terrain painter. Do not add image loading or canvas creation in per-frame paths.
9. Verify with syntax checks, a local tiled preview when useful, and a browser smoke test of the live game.

## Output Shape

Prefer this structure:

```text
src/content/tiles/<tile-id>/art.js
  export const <TILE_ID>_TILE_ART = {
    ground: {
      src: "./src/content/tiles/<tile-id>/art/ground_tiles.png",
      frameWidth: 164,
      frameHeight: 84,
      frameCount: 1,
    },
    decorations: "./src/content/tiles/<tile-id>/art/decorations.png",
  };

src/content/tiles/<tile-id>/art/
  ground_tiles.png
  decorations.png
```

Use a multi-frame `ground_tiles.png` only when variations do not reveal a repeated diamond pattern. For a single seamless patch like the firecamp ground, one consistent frame can be better than four variants.

## Art Rules

- Match the source scale and camera: isometric three-quarter ground, diamond footprint, readable at runtime zoom.
- Keep transparent-background pixel sprites for placed decorations.
- Keep the base tile darker or warmer only when it matches adjacent in-world objects, such as the firepit dirt.
- Prefer crisp pixel edges. Use `ctx.imageSmoothingEnabled = false` for authored low-resolution sprites.
- Skip the normal terrain stroke/shadow for tile types that are meant to blend as one continuous patch.
- Use slight draw overlap and clipping in the painter when subpixel gaps show seams.
- Keep terrain decorations deterministic from `tile.seed`; they should feel random without changing frame-to-frame.

## Validation

Run syntax checks on changed JavaScript:

```bash
node --check src/content/tiles/<tile-id>/art.js
node --check src/content/assets/runtimeImages.js
node --check src/rendering/TilePainter.js
node --check src/world/createDesertMap.js
```

Serve and smoke-test the asset:

```powershell
Invoke-WebRequest -Uri 'http://127.0.0.1:4174/src/content/tiles/<tile-id>/art/ground_tiles.png' -UseBasicParsing
```

Use Browser plugin for local app verification when available. If browser screenshot capture times out, still check console logs and generate a local tiled preview so seams can be inspected.

## Rejection Rules

Redo the tile art when any of these are true:

- The player can see a grid line or repeated diamond boundary in a terrain patch that should be seamless.
- A large reference diamond is stamped into every map tile.
- Decorations are baked into the base tile when they should be separate transparent sprites.
- The tile has alpha fringes, black/white borders, or per-tile edge darkening that reveals adjacency.
- Runtime drawing needs per-frame image loading, DOM work, or full-map scans.
- The art is too noisy, too smooth, too low-contrast, or stylistically detached from nearby unit/object art at normal zoom.
