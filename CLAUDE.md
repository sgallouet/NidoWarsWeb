# Claude Project Guidance

Use the local Claude skill at `.claude/skills/nido-wars-architecture/SKILL.md` when working in this repository.

Nido Wars is now a realtime browser strategy game. Keep every change small, fast, beautiful, and well separated by responsibility. Performance is a first-class product pillar: protect steady 60 FPS before adding visual complexity, avoid per-frame allocations, avoid expensive CSS effects over the canvas, and prefer cached/static rendering whenever possible.

Current direction: the player begins at a fire camp with open buildable space nearby on a 60 x 60 five-biome island. Units patrol, explore fog, gather treasure, herbs, fish, and berries, and respond to scary monster alerts. Monsters can injure warriors; hurt warriors should retreat and sleep by the fire until recovered. The island includes snow mountain, desert, temperate, volcanic, and paradise regions with biome-specific monsters. Birds are tiny flying decoration that can cross any terrain, while rabbits are small ambient decoration. Desktop and phone/tablet controls both matter; touch drag and pinch zoom should feel native in a mobile browser.

Product taste: prefer a light, natural-feeling UI with very little text and minimal occupied space. Most player understanding and interaction should come organically from the game environment itself: in-world markers, unit motion, small icons, readable animation, and compact feedback. Avoid large panels, explanatory copy, marketing sections, and UI that competes with the map.
