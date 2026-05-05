# Performance Guide

## Budget

- Treat 60 FPS as a product requirement. The rough frame budget is `16.7ms`; leave headroom for mobile browsers.
- Use the in-game `PerformanceMonitor` for quick regressions and browser performance tools for deeper work.
- Prefer steady frame time over richer effects.

## Game Loop

- `Game.update` runs every frame. Keep it lean.
- Avoid per-frame full-world scans unless the existing system already requires it and the map size is bounded.
- Sample DOM/HUD work on intervals, as `Game.hudRefreshMs` and `PerformanceMonitor` already do.
- Do pathfinding when an order changes, a unit needs a new destination, or a patrol target changes. Avoid pathfinding every frame.
- Avoid short-lived objects in hot loops when the same state can be updated in place.
- Be careful with `Array.sort`, spreading, filtering, or mapping inside render/update loops; use them only when the list is small or correctness clearly needs it.

## Rendering

- `CanvasRenderer` caches static terrain and fog. Preserve this split:
  - Terrain cache changes when `world.version`, map size, seed, or tile dimensions change.
  - Fog cache changes through `FogOfWar.version` and changed-tile clearing.
- Draw only the visible cache slice and visible dynamic tiles.
- Add focused painters for new visual categories instead of putting unrelated drawing into existing painters.
- Keep rules out of renderers. Renderers draw state produced elsewhere.
- Avoid per-frame full-map gradients, path rebuilding, text layout, image loading, or canvas creation.
- Precompute or cache expensive static art. Use chunked prep for large one-time work, following `prepareTerrainCache`, `prepareFogCache`, and `runChunkedWork`.
- Cap high-DPI work as the renderer does with `Math.min(devicePixelRatio, 2)`.

## CSS And DOM

- Do not place expensive CSS effects over the animated canvas during normal play.
- Keep `backdrop-filter`, large shadows, and large translucent overlays limited to paused/modal states.
- Do not update DOM text/classes every frame for values that can be sampled.
- Preserve the fullscreen, fixed, non-scrolling shell: `overflow: hidden`, `touch-action: none`, safe-area offsets, and mobile media rules.

## Assets

- Keep sprite sheets and resource icons small enough for mobile memory.
- Prefer sprite sheets or cached canvas drawing for repeated animated units.
- Keep shadows in canvas code unless an authored sprite explicitly needs them; mismatched baked shadows hurt readability at zoom.
- Check generated assets at runtime size, not just source size.

## Smoke Tests

- Start with `npm run dev` and use the URL printed by the server.
- Watch the bottom frame-time graph while panning, zooming, gathering, fighting, opening cards, and revealing fog.
- Check a desktop viewport and a phone viewport.
- For rendering or loop changes, compare behavior before/after with the same interaction path.
- Investigate spikes over `30ms` and repeated samples above the `16ms` budget.
