---
name: nido-wars-architecture
description: Use when planning or implementing work in Nido Wars, a web-based epic 4X game, especially code architecture, rendering, UI, performance, or gameplay systems.
---

# Nido Wars Architecture Skill

Nido Wars is aiming to become a very large, epic 4X strategy game that runs as a web app. Every change should preserve a foundation that can scale into a major game.

## Core Principles

- Keep code highly segregated by responsibility. Gameplay state, rendering, input, UI, world generation, units, and configuration should stay in their own modules.
- Prefer small files and small functions. Split by actual responsibility, not by arbitrary layers.
- Keep the browser app fast. Avoid heavy dependencies, avoid unnecessary allocations in the frame loop, and measure before adding expensive work.
- Preserve visual quality. The game should feel beautiful, premium, readable, and modern, with a high-end 2D isometric style.
- Make systems deterministic where possible so maps, units, and future simulations are testable and reproducible.
- Add abstractions only when they reduce real complexity or match an existing pattern.

## Implementation Rules

- Use plain browser APIs unless a library is clearly justified by a large, well-established domain problem.
- Keep game-loop work lean: precompute when practical, cache repeated calculations, and avoid DOM writes every frame unless sampled or necessary.
- Keep canvas rendering separate from game rules. Renderers should draw state; managers should own state and rules.
- Keep UI bindings in `src/ui`, game orchestration in `src/core`, input in `src/engine`, rendering in `src/rendering`, world code in `src/world`, and unit logic in `src/units`.
- Prefer data definitions for content such as unit stats, terrain types, resources, and faction rules.
- Do not turn prototypes into giant files. If a feature starts to grow, create a focused module before it becomes tangled.

## Product Direction

- This is a 4X game, so future systems should anticipate exploration, expansion, exploitation, extermination, diplomacy, economy, research, fog of war, AI opponents, factions, and long-running save games.
- UI should be usable immediately, not a marketing page. Prioritize the live game surface.
- Visuals should read well at different zoom levels and on both desktop and mobile screens.
- Preserve keyboard/mouse and pointer-friendly interaction patterns for a web app.

## Before Finishing Work

- Run syntax or relevant checks.
- Smoke-test the local web app when changing rendering, input, UI, or game loop behavior.
- Keep generated artifacts, logs, and screenshots out of commits unless they are intentionally part of the project.
