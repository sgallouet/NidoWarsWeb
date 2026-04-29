# Nido Wars Web

Nido Wars is starting as a browser-based realtime strategy prototype. This slice focuses on a polished, scalable world renderer and lightweight RTS simulation: a 60 x 60 isometric island with a player fire camp, patrolling units, biome monsters, fog, water, herbs, fish, berries, and treasure hauling.

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

- 60 x 60 randomly seeded isometric island.
- Five regions: snow mountain, desert expanse, temperate wilds, volcanic scar, and paradise reach.
- Sand, dunes, grass, forest, flowers, snow, ice, ash, obsidian, lava, rock shelves, scrub, salt flats, oasis tiles, and Grand Lake water.
- Fire camp base with player warriors patrolling nearby.
- Biome-specific scary monsters and friendly decorative critters patrol around the island.
- Tiny birds can fly over any terrain; rabbits are small ambient decoration.
- Scary monsters raise an alert when they close on player units; nearby player units answer the alert and attack.
- Monsters now damage warriors; wounded warriors retreat to the fire camp and sleep until healed.
- Click fogged terrain to place an exploration order; nearby idle units investigate and return to camp patrol.
- Click treasure to assign a carrier and protector; the carrier hauls treasure back to the fire camp.
- Click herbs to assign a gatherer; each herb supports 5 round trips back to the fire camp.
- Click fish or berry resources to assign a gatherer and increase separate food currencies.
- Sand and dunes slow realtime movement; carried treasure slows a unit by 50%.
- Impassable mountain ridges, obsidian, lava, and lake water.
- Transparent fog of war with clean revealed terrain.
- Collectible treasures that increase gold and herbs that increase supplies.
- Cached terrain and fog rendering for 60 FPS-oriented realtime performance.
- Responsive canvas with high-DPI rendering.
- Desktop pointer drag, wheel zoom, touch drag, and two-finger pinch zoom.
- Compact HUD with resources, FPS, and a clock-style day/night indicator.
- Small mobile fullscreen button for phone play.

## AI Guidance

Claude project guidance lives in `CLAUDE.md` and `.claude/skills/nido-wars-architecture/SKILL.md`.
