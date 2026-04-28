# Nido Wars Web

Nido Wars is starting as a browser-based 4X game prototype. This first slice focuses on a polished, scalable world renderer: a 30 x 30 isometric desert map drawn with deterministic procedural art.

## Run

```bash
npm run dev
```

Then open `http://127.0.0.1:4173`.

The project currently uses no runtime dependencies. It is plain browser JavaScript split into focused modules so the foundation can grow into a larger game without early framework lock-in.

## Structure

- `src/core` owns the game object and loop.
- `src/engine` owns input and player-facing control state.
- `src/rendering` owns canvas setup, camera math, isometric projection, and tile painting.
- `src/world` owns map generation and tile definitions.
- `src/ui` owns DOM HUD updates.
- `src/config` owns world and rendering constants.

## Current Slice

- 30 x 30 deterministic isometric desert world.
- Sand, dunes, rock shelves, scrub, salt flats, and rare oasis tiles.
- Warrior and monster units rendered on the isometric map.
- Unit selection, weighted movement range highlighting, route arrows, blockers, and animated tile movement.
- Impassable mountain ridges and sand/dune tiles that cost 2 movement points.
- Transparent fog of war with clean revealed terrain.
- Collectible treasures that increase gold.
- Monster AI moves after the player turn delay.
- Responsive canvas with high-DPI rendering.
- Pointer drag camera movement and wheel zoom.
- Hovered sector readout.
- Sampled FPS counter in the HUD.

## AI Guidance

Claude project guidance lives in `CLAUDE.md` and `.claude/skills/nido-wars-architecture/SKILL.md`.
