# Nido Wars UnitV2 Style

## Visual Goals

UnitV2 should feel more authored and alive than the early placeholder monsters while staying compact enough for many moving units.

Use:

- crisp isometric silhouettes
- warm fantasy materials
- readable shape language at 40-70 canvas pixels tall
- 3-6 core palette colors per unit
- dark contact lines where they improve separation
- runtime shadows, not baked shadows

Avoid:

- legacy warrior/settler sheet matching as the default goal
- soft painterly blur
- floor patches, labels, frame numbers, UI, or baked selection rings
- huge source cells when a compact rig or atlas will do
- tiny high-detail noise that vanishes at gameplay zoom

## Skeleton Enemy Direction

For a skeleton enemy, prefer an angular bone rig with:

- ivory skull and ribs
- desaturated blue-gray shadow bones
- rusty bronze weapon or cracked shield
- one cold teal eye spark
- loose jaw and shoulder bob in idle
- clacking high-knee walk
- short chop or swipe attack
- collapse into scattered bones for death
