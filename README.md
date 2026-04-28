# Nido Wars Web

Nido Wars is starting as a browser-based realtime strategy prototype. This slice focuses on a polished, scalable world renderer and lightweight RTS simulation: a 30 x 30 isometric desert island with a player fire camp, patrolling units, monsters, fog, and treasure hauling.

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

- 30 x 30 randomly seeded isometric desert island.
- Sand, dunes, rock shelves, scrub, salt flats, and rare oasis tiles.
- Fire camp base with player warriors patrolling nearby.
- Monsters randomly patrol around the island.
- Click fogged terrain to place an exploration order; nearby idle units investigate and return to camp patrol.
- Click treasure to assign a carrier and protector; the carrier hauls treasure back to the fire camp.
- Sand and dunes slow realtime movement; carried treasure slows a unit by 50%.
- Impassable mountain ridges.
- Transparent fog of war with clean revealed terrain.
- Collectible treasures that increase gold.
- Cached terrain and fog rendering for 60 FPS-oriented realtime performance.
- Responsive canvas with high-DPI rendering.
- Pointer drag camera movement and wheel zoom.
- Hovered sector readout.
- Sampled FPS counter in the HUD.

## AI Guidance

Claude project guidance lives in `CLAUDE.md` and `.claude/skills/nido-wars-architecture/SKILL.md`.
