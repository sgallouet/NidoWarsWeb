# Feature Workflow

## General Flow

1. Identify the owner module before editing. Keep orchestration thin and domain rules near their manager.
2. Add data definitions first when the feature is content-like: terrain, units, buildings, resources, orders, hero classes, quests, costs, or durations.
3. Wire the command path from click/input to manager action to renderable state to HUD feedback.
4. Add rendering last, after the state shape is clear.
5. Smoke-test by using the actual world interaction, not only by checking syntax.

## Common Feature Paths

### Add A Resource Or Gatherable

- Add icons/assets and HTML HUD slot in `index.html` if the resource is persistent.
- Update `GAME_CONFIG.resources` and `RESOURCE_KEYS` in `src/ui/Hud.js`.
- Add spawn and node rules in `src/world/ResourceNodeManager.js` or create a focused manager if the behavior is not a resource node.
- Add click routing in `Game.handleTileClick`.
- Add command/update/delivery behavior in `UnitManager`.
- Add marker rendering in `CanvasRenderer.paintMarkerIcon` and drawing in a focused painter when needed.
- Keep depletion, cleanup, reservations, and carried-load fields explicit so workers cannot double-claim the same node.

### Add A Building

- Add the definition in `src/world/buildings.js`: id, name, effect tokens, costs, maintenance, and tone.
- Let `Game.renderBuildCards` pick it up from `BUILDINGS` when it only needs construction.
- Add any special post-construction behavior near the system that owns it, such as `Game`, `UnitManager`, `Hud`, or a new focused world manager.
- If it affects roads/build sites, review `Game.refreshBuildSitesAndRoads`, `isBuildSiteCenter`, and road connector helpers.
- If it needs custom visuals, extend tile/building rendering without putting rules inside the painter.

### Add A Unit, Monster, Hero, Or Critter

- Add template data in `src/units/unitDefinitions.js` or the hero roster helpers in `Game.js`.
- Add behavior in `UnitManager` only when existing orders/patrol/hero activities are insufficient.
- Add sprite or shape support in `UnitPainter`; keep drawing decisions out of AI code.
- For flying units, use `canFly` and path logic instead of weakening ground terrain passability.
- Check spawn distance from camp and biome-specific placement.

### Add Terrain Or Biome Rules

- Add terrain metadata in `src/world/tileTypes.js`.
- Update `createDesertMap.js` biome/type/elevation logic.
- Add tile rendering in `TilePainter`.
- Confirm `isTilePassable`, `getTileMovementCost`, and pathfinding still express the intended movement.
- Preserve camp clearing and reachability repair so early play cannot spawn blocked.

### Add UI Or Overlay Behavior

- Add stable `data-ui` hooks in `index.html`.
- Bind in `Game` for modal gameplay surfaces or in `Hud` for persistent status surfaces.
- Keep overlays pause-aware through `Game.syncPauseState`.
- Use compact, safe-area-aware CSS in `styles/main.css`.
- Avoid large copy. Prefer icons, short labels, resource pips, progress bars, and in-world markers.

### Add Input Or World Actions

- Change `InputController` only for gesture mechanics or coordinate picking.
- Route clicked tiles through `Game.handleTileClick`.
- Let managers expose `command*` methods for actual actions.
- Add order markers through `UnitManager.addMarker` or existing command flows.
- Preserve drag/tap thresholds and pinch behavior on touch screens.

## Code Shape

- Prefer new focused modules before making `Game.js`, `CanvasRenderer.js`, or `UnitManager.js` substantially larger.
- Keep manager state serializable/plain where practical.
- Avoid hidden coupling through DOM queries outside UI/orchestration classes.
- Keep generated IDs stable and descriptive: `resource-type-index`, `quest-run-n`, `unit-role-name`, etc.
- When mutating tiles, call `world.touchTile(tile)` or `world.touchTile()` where existing cache invalidation depends on world version changes.

## Verification

- Run `node --check` on changed JavaScript files when practical.
- Run `npm run dev`, open the printed local URL, and exercise the edited flow.
- For visual changes, test at a wide desktop viewport and a phone-sized viewport.
- For input changes, test mouse drag, wheel zoom, tap/click, touch drag, and pinch if possible.
- Watch the console and the frame monitor.
