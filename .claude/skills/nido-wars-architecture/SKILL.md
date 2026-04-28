---
name: nido-wars-architecture
description: Use when planning or implementing work in Nido Wars, a realtime browser strategy game, especially code architecture, rendering, UI, performance, AI behaviors, or gameplay systems.
---

# Nido Wars Architecture Skill

Nido Wars is now a realtime strategy game that runs as a web app. Every change should preserve a foundation that can scale into a large, beautiful, responsive RTS.

## Core Principles

- Keep code highly segregated by responsibility. Gameplay simulation, rendering, input, UI, world generation, units, resources, fog, and configuration should stay in their own modules.
- Prefer small files and small functions. Split by actual responsibility, not by arbitrary layers.
- Optimize for a steady 60 FPS. Avoid unnecessary allocations in the frame loop, cache static canvas layers, update DOM on sampled intervals, and do pathfinding only when orders change or units need a new patrol target.
- Preserve visual quality. The game should feel beautiful, premium, readable, and modern, with a high-end 2D isometric style.
- Make systems deterministic where useful for testing, but allow runtime map variation for fresh sessions.
- Add abstractions only when they reduce real complexity or match an existing pattern.

## Implementation Rules

- Use plain browser APIs unless a library is clearly justified by a large, well-established domain problem.
- Keep game-loop work lean: precompute static terrain, cache fog layers until reveal state changes, and avoid per-frame full-map gradient or path rebuilding.
- Keep canvas rendering separate from game rules. Renderers draw state; managers own state and rules.
- Keep UI bindings in `src/ui`, game orchestration in `src/core`, input in `src/engine`, rendering in `src/rendering`, world code in `src/world`, and unit logic in `src/units`.
- Prefer data definitions for content such as unit stats, terrain types, resources, faction rules, orders, and behavior parameters.
- Do not introduce step-locked tactical flow unless the product direction changes again. Avoid counters, player locks, or phased monster actions.
- Do not turn prototypes into giant files. If a feature starts to grow, create a focused module before it becomes tangled.

## Product Direction

- This is an RTS: units should act continuously, patrol when idle, respond to clicked world orders, and return to useful ambient behavior after tasks.
- The player starts from a fire camp. Player units patrol near the camp. Monsters patrol around the island.
- Clicking fogged terrain should create an exploration order. Nearby idle units should investigate, reveal the area, then return to camp patrol.
- Clicking treasure should create a gather order. One unit carries treasure to the fire camp while another protects the carrier when available.
- Terrain should affect realtime speed. Sand and dunes slow movement; mountains remain impassable.
- UI should be usable immediately, not a marketing page. Prioritize the live game surface.
- Visuals should read well at different zoom levels and on both desktop and mobile screens.

## Before Finishing Work

- Run syntax or relevant checks.
- Smoke-test the local web app when changing rendering, input, UI, performance, or game loop behavior.
- Check for console errors and gross frame-rate regressions.
- Keep generated artifacts, logs, and screenshots out of commits unless they are intentionally part of the project.
