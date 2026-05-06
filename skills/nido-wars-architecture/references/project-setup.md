# Project Setup

## Run

- Start the local static server with `npm run dev`.
- The server is `scripts/dev-server.mjs`; by default it binds `127.0.0.1:4174` unless `PORT` is set.
- The project has no runtime dependencies and uses native browser ES modules. `package.json` has `"type": "module"`.

## Entry Flow

- `index.html` must stay tiny: metadata, CSS, and the module script only.
- `src/main.js` installs browser fallbacks, creates the app shell, creates `Game`, wires fullscreen, and starts the loop.
- `src/app/shell/createAppShell.js` owns static DOM shell markup: canvas, resource HUD, cycle HUD, help/build overlays, loading panel, fullscreen button, and frame monitor.
- `src/core/Game.js` composes world, fog, resources, units, input, HUD, renderer, performance monitor, construction, build/hero/quest surfaces, and the game loop. It is currently a migration target; prefer extracting from it over growing it.
- `src/core/GameLoop.js` wraps `requestAnimationFrame`, clamps large frame deltas, and passes `{ delta, elapsed }` into `Game.update`.

## Active Folder Map

- `src/app/`: app shell and boot-only browser composition.
- `src/common/`: shared helpers and contracts with no content ownership.
- `src/config/gameConfig.js`: map dimensions, render sizing, zoom limits, day/night timing, starting resources.
- `src/content/units/`: unit definitions and local unit art. `definitions.js` is the current registry; migrate toward one folder per unit definition.
- `src/content/tiles/`: terrain definitions and local tile art. `definitions.js` is the current registry; migrate toward one folder per tile type.
- `src/content/resources/`: resource definitions and icons.
- `src/content/buildings/`: building definitions.
- `src/content/heroes/` and `src/content/quests/`: intended homes for hero and quest data as it is extracted from `Game`.
- `src/engine/`: pointer, drag, wheel zoom, touch drag, pinch, frame budget mechanics, and gameplay-agnostic runtime services.
- `src/engine/assets/`: gameplay-agnostic image preloading and loaded-image cache helpers.
- `src/gameplay/units/`: unit manager, movement geometry, pathfinding, and path jobs.
- `src/gameplay/resources/`: resource nodes, herbs, treasures, loot tables, and gatherable runtime rules.
- `src/rendering/`: canvas renderer and focused painters for tiles, units, treasures, herbs, and resources.
- `src/ui/`: persistent DOM chrome such as HUD, fullscreen, and performance monitor.
- `src/world/`: world generation, fog, and day/night simulation.
- `bin/`: moved legacy assets and generated caches. Files here are not active runtime inputs unless explicitly restored.
- `src/content/assets/runtimeImages.js`: manifest of image assets loaded before play starts.
- `scripts/`: local tooling. Scripts should write active art into the owning content folder, not root `assets/`.
- `skills/`: project-local Codex skills.

## Current Gameplay Surface

- The player starts around a fire camp with warriors/settlers and an open buildable area.
- Fogged tiles can be clicked for exploration.
- Treasure, herbs, fish, berries, wood, rock, corpses/meat, cleanable blocked terrain, and build sites are clickable world actions.
- Buildings include settler hut, storage house, torch watch, tavern, guild town, and market.
- Tavern and guild town open compact card overlays for heroes and quests.
- Monsters patrol biome regions, trigger alerts, fight, drop loot, and can wound player units.
- Wounded units retreat to camp and recover.
- Ambient critters exist; birds can fly over terrain.

## Migration Targets

- Split `src/gameplay/units/UnitManager.js` by behavior slices: orders, workers, combat, recovery, heroes, corpses, patrols, movement, and markers.
- Split `CanvasRenderer.js` by cache orchestration, fog, intro reveal, markers, night/lighting, and dynamic entity drawing.
- Split `UnitPainter.js` by unit body painters and shared carried-load/feedback drawing.
- Split `TilePainter.js` by terrain features and building/road/build-site drawing.
- Extract hero roster, quest roster, card formatting, road/build-site logic, and construction lifecycle from `Game.js`.
