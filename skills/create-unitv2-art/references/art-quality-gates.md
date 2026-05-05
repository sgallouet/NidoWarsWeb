# UnitV2 Art Quality Gates

## Why This Exists

UnitV2 is meant to create better and more complete unit art than the earlier unit skill. It must not produce placeholder-feeling animation. Technical validity is not enough.

## Required Quality Bar

Before accepting an asset, compare it against:

- `assets/warrior_idle_sheet.png`
- `assets/warrior_walk_sheet.png`
- `assets/settler_idle_sheet.png`
- `assets/settler_walk_sheet.png`
- the user's reference image, when provided

The new asset should blend with those sprites in outline weight, contrast, palette warmth, and readable silhouette. It may use a different pipeline, but the final in-game result must feel at least as intentional.

## Authored Animation Requirement

Frames must show pose changes appropriate to the action:

- `idle`: breathing/weight shift without identity drift
- `walk`: alternating legs, planted foot contact, body weight passing over feet
- `guard`: braced combat-ready stance, not frozen idle
- `attack`: anticipation, strike/contact, recovery
- `hit`: recoil or stagger with readable force direction
- `death`: collapse or fallen pose; not a rotated standing sprite

Never accept transform-only animation. These are not enough:

- translating a single sprite across frames
- rotating a single full-body sprite
- scaling/skewing a single full-body sprite
- cutting one reference image into an atlas without reposing
- changing only brightness, tint, blur, or shadow

Small transforms are allowed only after authored poses exist, for polish such as one-pixel impact recoil or breathing.

## Scale Check

Measure alpha bounds at source and runtime draw size.

Current anchors:

- Warrior source subject height: about `158-160px` in `186px` cells; runtime draw size `66px`
- Settler source subject height: about `142px` in `186px` cells; runtime draw size `66px`

For a unit that should be smaller than the settler, target runtime subject height below `50px`, with enough detail to read. If the user asks for "less tall than settler", make that a hard limit.

## Reference Image Use

Use a reference image to lock:

- silhouette and proportions
- material palette
- face/head cues
- weapon/tool shape
- posture and personality

Do not use it as the only animation frame source. If raster generation is needed, prompt for a sprite sheet that reposes the character while preserving the reference identity.

## Preview Review

Open the WebP previews and inspect them before integration. Reject if:

- motion reads as a sliding sticker
- feet float or baseline drifts
- weapon detaches or smears
- frames flicker between identities
- details disappear at runtime scale
- background/key color residue remains

## Game Mapping Review

Confirm the manifest and painter map game state to actions:

- movement -> `walk`
- in-range attack cooldown/ready -> `guard`
- strike flash -> `attack`
- damage flash -> `hit`
- corpse rendering -> `death`
- fallback -> `idle`
