---
name: nido-wars-architecture
description: Use when planning, implementing, reviewing, or performance-testing work in Nido Wars, a plain JavaScript realtime browser strategy game. Trigger for gameplay features, world generation, unit AI, rendering, input, mobile/touch behavior, HUD/UI changes, code architecture, build/run setup, or 60 FPS performance work in this repository.
---

# Nido Wars Architecture

## Purpose

Use this skill to make changes that fit the current Nido Wars codebase: a dependency-light realtime canvas RTS with modular ES files, cached rendering, compact DOM UI, and mobile-first pointer controls.

## First Steps

1. Read `references/project-setup.md` when you need repo layout, run commands, module ownership, or current gameplay systems.
2. Read `references/feature-workflow.md` before adding or changing gameplay, content, UI flows, input actions, or world systems.
3. Read `references/performance.md` before touching the game loop, rendering, fog, pathfinding, unit updates, CSS over the canvas, assets, or mobile interaction.
4. Inspect the directly owned files before editing. Prefer `rg` and focused reads over broad rewrites.

## Core Rules

- Keep responsibilities separated: orchestration in `src/core`, input in `src/engine`, rendering in `src/rendering`, world systems in `src/world`, unit logic in `src/units`, UI bindings in `src/ui`, constants in `src/config`.
- Preserve the live game as the first screen. Avoid landing pages, marketing copy, large explanatory panels, or UI that competes with the map.
- Keep player understanding environmental where possible: unit motion, in-world markers, compact icons, animation, and brief feedback before text-heavy UI.
- Treat performance as a product feature. Protect steady 60 FPS, especially on mobile.
- Do not add a framework or runtime dependency unless the task has a clear, established domain need that outweighs the plain-browser setup.
- Add abstractions only when they remove real complexity or match an existing local pattern.

## Product Direction

- Nido Wars is a realtime strategy game centered on a fire camp, buildable village space, exploration, gathering, monster threats, and compact hero/building/quest interactions.
- The island uses multiple biomes: snow mountain, desert, temperate, volcanic, and paradise. Ground units must respect impassable terrain; birds can fly over terrain.
- Player units patrol, explore fog, gather treasure/herbs/fish/berries/wood/rock/meat, build, clean blocked tiles, fight threats, and recover at camp when wounded.
- Visuals should be readable, warm, and premium in a 2D isometric canvas style across desktop, phone, and tablet.

## Before Finishing

- Run syntax checks for changed JavaScript where practical.
- For gameplay, rendering, input, UI, or performance changes, run the local app and smoke-test the affected flow.
- Check the browser console and the in-game frame monitor for obvious regressions.
- Keep generated screenshots, logs, and exploratory artifacts out of commits unless intentionally requested.
