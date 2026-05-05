# Project Setup

## Run

- Start the local static server with `npm run dev`.
- The server is `scripts/dev-server.mjs`; by default it binds `127.0.0.1:4174` unless `PORT` is set.
- The project has no runtime dependencies and uses native browser ES modules. `package.json` has `"type": "module"`.

## Entry Flow

- `index.html` owns the canvas, HUD resource strip, day/night control, help overlay, build/hero/quest overlay, loading panel, and fullscreen button.
- `src/main.js` boots the app, creates `Game`, and wires `FullscreenButton`.
- `src/core/Game.js` composes world, fog, resources, units, input, HUD, renderer, performance monitor, build menus, hero/quest cards, construction, and the game loop.
- `src/core/GameLoop.js` wraps `requestAnimationFrame`, clamps large frame deltas, and passes `{ delta, elapsed }` into `Game.update`.

## Module Ownership

- `src/config/gameConfig.js`: map dimensions, tile sizing, zoom limits, day/night timing, starting resources. Check this file instead of hardcoding dimensions; it currently sets a `72 x 72` map.
- `src/engine/InputController.js`: pointer, drag, wheel zoom, touch drag, and two-finger pinch. Keep gesture mechanics here; keep gameplay commands in `Game` and managers.
- `src/rendering/CanvasRenderer.js`: canvas resize, camera transforms, terrain/fog caches, visible-tile culling, render order, in-world markers, lighting, and screen effects.
- `src/rendering/*Painter.js`: focused drawing for tiles, units, treasures, herbs, and resource nodes.
- `src/rendering/Camera2D.js` and `src/rendering/isoMath.js`: camera bounds/zoom and isometric projection math.
- `src/world/createDesertMap.js`: seeded island generation, biome selection, Grand Lake, camp clearing, and terrain reachability repair.
- `src/world/tileTypes.js`: terrain movement cost, passability, labels, and colors.
- `src/world/FogOfWar.js`: reveal state, changed tiles, and fog cache invalidation versioning.
- `src/world/*Manager.js`: treasures, herbs, resource nodes, day/night, and buildings.
- `src/units/unitDefinitions.js`: unit templates and starting spawn placement.
- `src/units/UnitManager.js`: orders, pending order assignment, movement, gathering, cleaning, building, combat, recovery, heroes, quests, corpses, markers, and AI behavior.
- `src/units/pathfinding.js`: path search over terrain, movement costs, blockers, and flying units.
- `src/ui/Hud.js`: persistent resource/cycle/tile/unit DOM updates.
- `src/ui/PerformanceMonitor.js`: frame-time graph and sampled frame value.
- `styles/main.css`: fullscreen layout, canvas interaction rules, HUD, overlays, mobile safe areas, and responsive card layouts.
- `assets/`: game sprites and resource icons.
- `skills/`: project-local Codex skills.

## Current Gameplay Surface

- The player starts around a fire camp with warriors/settlers and an open buildable area.
- Fogged tiles can be clicked for exploration.
- Treasure, herbs, fish, berries, wood, rock, corpses/meat, cleanable blocked terrain, and build sites are all clickable world actions.
- Buildings include settler hut, storage house, torch watch, tavern, and guild town.
- Tavern and guild town open card overlays for heroes and quests.
- Monsters patrol biome regions, trigger alerts, fight, and can wound player units.
- Wounded units retreat to camp and recover.
- Ambient critters exist; birds can fly over terrain.

## Styling Taste

- Favor compact, readable, low-text UI over explanatory surfaces.
- Cards are acceptable for build/hero/quest choices, but avoid putting cards inside cards.
- Keep text sized for panels and mobile cards; do not use hero-scale typography inside tool surfaces.
- Preserve `touch-action: none`, safe-area spacing, minimum width behavior, and non-scrolling game shell.
