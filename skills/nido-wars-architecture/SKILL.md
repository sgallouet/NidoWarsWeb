---
name: nido-wars-architecture
description: Use when planning, implementing, reviewing, or performance-testing work in Nido Wars, a plain JavaScript realtime browser strategy game. Trigger for gameplay features, world generation, content organization, unit AI, rendering, input, mobile/touch behavior, HUD/UI changes, code architecture, build/run setup, or 60 FPS performance work in this repository.
---

# Nido Wars Architecture

## Purpose

Use this skill to keep Nido Wars clean, small-file, dependency-light, and fast. Nido Wars is a realtime canvas strategy game; the first screen is always the live game world, and every repo change should make the game easier to extend without turning managers, painters, or HTML into melting pots.

## First Reads

1. Read `references/project-setup.md` for the current folder map, app entry flow, and ownership rules.
2. Read `references/feature-workflow.md` before changing gameplay, content, UI flows, input actions, world actions, or art integration.
3. Read `references/performance.md` before touching the game loop, rendering, fog, pathfinding, unit updates, assets, CSS over the canvas, or mobile interaction.
4. Inspect the directly owned files with `rg` and focused reads. Avoid broad rewrites unless the task is explicitly architectural.

## Non-Negotiables

- Epic asset rule: every asset the game uses, every source image needed to regenerate runtime art, and every debug/preview input that matters must be copied under `D:\Codex\NidoWarsWeb` in the owning `src/content/...` folder before it is referenced by code, scripts, manifests, skills, or docs. Never leave active paths pointing at Downloads, temp folders, external drives, URLs, or other uncommitted locations; those files can disappear and are not part of git.
- Keep the live canvas game as the first screen. Do not replace it with a landing page, hero section, or explanatory UI.
- Treat steady 60 FPS as a product feature. Prefer readable motion and cached drawing over decorative complexity.
- Keep files small and owned. Any runtime file growing beyond roughly 300-400 lines is a design smell; beyond 600 lines is a red flag that should trigger extraction.
- Put content with content. Unit definitions and art live under `src/content/units/<unit-id>/`; tile definitions and art under `src/content/tiles/<tile-id>/`; resources under `src/content/resources/<resource-id>/`; buildings, heroes, and quests under their own content folders.
- Keep common contracts outside content folders. Shared factories, registries, math, browser helpers, and runtime interfaces belong in `src/common`, `src/core`, `src/engine`, `src/rendering`, `src/world`, or focused system folders.
- Keep managers behavioral and painters visual. Managers produce state; painters draw state; content files declare data and asset paths.
- Keep `index.html` tiny. It loads CSS and `src/main.js`; app shell markup belongs in `src/app/shell`.
- Move unused generated or legacy files to `bin/` instead of leaving them beside active runtime content.
- Active art should be compact sprite or spritesheet art. Favor low-resolution raster cells for performance, crisp pixel edges, readable silhouettes, and strong near-black outline/detail lines that match the Nido Wars style.
- Runtime image paths must be registered in a content asset manifest and loaded during the loading screen. Do not add lazy image discovery in per-frame paint paths.
- Do not add a framework or runtime dependency unless the task has a clear domain need and the existing plain-browser setup cannot reasonably cover it.

## Desired Shape

- `src/app/`: browser app composition, DOM shell creation, boot-only wiring.
- `src/common/`: small shared helpers and contracts with no game-domain ownership.
- `src/config/`: global configuration only.
- `src/content/`: universe/content hierarchy: units, tiles, resources, buildings, heroes, quests, objects, and local art.
- `src/core/`: game orchestration and lifecycle. Keep thin; extract menus, construction, roads, quests, and intro helpers when they grow.
- `src/engine/`: input, frame budgets, low-level runtime mechanics.
- `src/rendering/`: renderer orchestration and focused painters. Painters can import content art manifests, but not own gameplay rules.
- `src/world/`: world state and world managers. Prefer focused managers and compatibility shims over one huge world file.
- `src/gameplay/`: gameplay-specific runtime rules grouped by concept, such as units and resources.
- `src/gameplay/units/`: unit runtime systems such as movement, pathfinding, orders, and AI. Unit content stays in `src/content/units`.
- `src/gameplay/resources/`: gatherable, loot, herb, treasure, and resource-node rules.
- `src/ui/`: persistent HUD/chrome components, not large app markup.
- `bin/`: legacy generated art, generated caches, retired experiments, and other non-runtime leftovers.
- `skills/`: local Codex skills and references. Keep paths current after architecture moves.

## Content Rules

- A unit folder should contain its definition, optional art manifest, local art files, and unit-specific notes if needed. Shared unit creation/spawn logic belongs in `_shared` or `spawning`, not inside one unit.
- A tile folder should contain terrain definition, local art, and rendering hooks or metadata. Shared movement/passability helpers stay in the tile registry/common layer.
- A resource folder owns its icon and definition. Resource node spawning/cleanup behavior stays in a manager.
- Buildings, heroes, and quests are content data first; UI card rendering and lifecycle behavior should be extracted from `Game` when changed.
- Compatibility shim files are allowed during migrations, but they should be tiny re-exports and marked by their size and simplicity.

## Design Taste

- Use compact, in-world feedback before text-heavy panels.
- Keep HUD and overlays small, safe-area-aware, and quick to scan.
- Use visual assets for the actual game world and objects, not decorative page furniture.
- Prefer warm, readable, premium 2D isometric visuals with clear silhouettes at runtime size.

## Z And Object Depth

- Depth-sort dynamic world objects by the world-space contact point of their visible object, not by the tile that owns them or the top-left of their sprite.
- Split visuals that occupy the ground from visuals that stand up into the world. Ground/foundation/shadows may stay in static structure or terrain caches; the actual upright object must join the dynamic depth pass when units, corpses, trees, or resources can cross in front of or behind it.
- Content that draws as an object must declare an object render mask beside its definition. The mask should separate `ground` from `object`, and `object.depthY` should be the contact/depth line used for sorting. If `depthY` is omitted, use the object mask bottom edge.
- Use object masks for visible-rect culling too. Do not run per-object occlusion or transparency checks for offscreen art, and gate subtle transparency work by zoom when it is not readable at far zoom.
- Transparency for occluders such as trees is a last-mile readability aid, not the primary z solution. Correct z ordering comes first; transparency should only inspect already-visible renderables.

## Before Finishing

- Run `node --check` on changed JavaScript where practical.
- For gameplay, rendering, input, UI, or performance changes, run the local app and smoke-test the affected flow.
- Check browser console behavior and the in-game frame monitor for obvious regressions.
- Keep generated screenshots, logs, caches, and exploratory artifacts out of active runtime folders unless intentionally requested.
