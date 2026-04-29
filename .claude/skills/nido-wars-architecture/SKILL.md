---
name: nido-wars-architecture
description: Use when planning or implementing work in Nido Wars, a realtime browser strategy game, especially code architecture, rendering, UI, performance, AI behaviors, or gameplay systems.
---

# Nido Wars Architecture Skill

Nido Wars is now a realtime strategy game that runs as a web app. Every change should preserve a foundation that can scale into a large, beautiful, responsive RTS.

## Core Principles

- Keep code highly segregated by responsibility. Gameplay simulation, rendering, input, UI, world generation, units, resources, fog, and configuration should stay in their own modules.
- Prefer small files and small functions. Split by actual responsibility, not by arbitrary layers.
- Optimize for a steady 60 FPS as a first-class product pillar. Avoid unnecessary allocations in the frame loop, cache static canvas layers, update DOM on sampled intervals, do pathfinding only when orders change or units need a new patrol target, and avoid expensive CSS effects such as blur/backdrop filters over the animated canvas.
- Preserve visual quality. The game should feel beautiful, premium, readable, and modern, with a high-end 2D isometric style.
- Keep the player-facing UI light and natural. Prefer tiny icons, in-world feedback, and organic interaction with the map over panels, labels, tutorials, or explanatory copy.
- Make systems deterministic where useful for testing, but allow runtime map variation for fresh sessions.
- Add abstractions only when they reduce real complexity or match an existing pattern.

## Implementation Rules

- Use plain browser APIs unless a library is clearly justified by a large, well-established domain problem.
- Keep game-loop work lean: precompute static terrain, cache fog layers until reveal state changes, and avoid per-frame full-map gradient or path rebuilding.
- Keep canvas rendering separate from game rules. Renderers draw state; managers own state and rules.
- Keep UI bindings in `src/ui`, game orchestration in `src/core`, input in `src/engine`, rendering in `src/rendering`, world code in `src/world`, and unit logic in `src/units`.
- Prefer data definitions for content such as unit stats, terrain types, resources, faction rules, orders, and behavior parameters.
- Do not introduce step-locked tactical flow unless the product direction changes again. Avoid counters, player locks, or phased monster actions.
- Treat touch interaction as first-class. Phone and tablet browsers need comfortable taps, one-finger panning, two-finger pinch zoom, safe-area-aware HUD placement, and no accidental page scrolling or text selection.
- Before adding DOM UI, ask whether the same information can be expressed by unit behavior, animation, a small world marker, or a compact icon.
- Do not turn prototypes into giant files. If a feature starts to grow, create a focused module before it becomes tangled.

## Product Direction

- This is an RTS: units should act continuously, patrol when idle, respond to clicked world orders, and return to useful ambient behavior after tasks.
- The player starts from a fire camp on a 60 x 60 five-biome island: snow mountain, desert, temperate, volcanic, and paradise.
- Player units patrol near the camp. Biome-specific monsters patrol around the island.
- The camp needs a generous open ring with no mountains, rocks, or water blocking early movement.
- Clicking fogged terrain should create an exploration order. Nearby idle units should investigate, reveal the area, then return to camp patrol.
- Clicking treasure should create a gather order. One unit carries treasure to the fire camp while another protects the carrier when available.
- Clicking herbs, fish, or berries should create a gather order and deliver to separate resources in the HUD.
- Scary monsters should show an alert when threatening the player. Nearby player units should show the same attention mark, move to attack, then return to patrol.
- Fighting should feel punchy but readable: show compact in-world health/damage feedback, let monsters hurt player units, and send wounded player units back to sleep by the fire until recovered.
- Friendly creatures like tiny flying birds and small rabbits should read as ambient decoration. Birds can path over any terrain.
- Terrain should affect realtime speed. Sand and dunes slow movement; mountains, obsidian, lava, and Grand Lake water remain impassable for ground units.
- UI should be usable immediately, not a marketing page. Prioritize the live game surface, minimal text, compact spacing, and environmental interaction.
- Visuals should read well at different zoom levels and on both desktop and mobile screens.

## Before Finishing Work

- Run syntax or relevant checks.
- Smoke-test the local web app when changing rendering, input, UI, performance, or game loop behavior.
- Check for console errors and gross frame-rate regressions.
- Keep generated artifacts, logs, and screenshots out of commits unless they are intentionally part of the project.
