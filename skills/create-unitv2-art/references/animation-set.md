# UnitV2 Animation Set

## Universal

- `idle`: breathing, watching, subtle equipment motion
- `walk`: readable foot cycle, stable anchor, no sliding
- `hit`: fast recoil or flash-compatible pose
- `death`: collapse pose for corpse rendering

## Combat Units

- `attack`: anticipation, contact, recovery
- `guard`: optional braced idle for defenders
- `celebrate`: optional short victory beat after combat

## Workers

- `gather`: picking, foraging, fishing, or harvesting
- `work`: repeated labor when the exact resource does not need unique motion
- `build`: hammer/place/brace motion
- `clean`: sweeping, digging, or clearing blocked terrain
- `carry`: loaded walk with strain
- `recover`: seated, kneeling, or resting state

## Critters And Ambient Units

- `idle`
- `walk` or `fly`
- `startle`: optional short flee/alert motion

## Direction Policy

Default to mirrored east/west facing in the canvas runtime. Add 4- or 8-direction art only when silhouette or weapons read poorly with mirroring.

Preferred direction order for generated atlases, when needed:

```text
south, south-east, east, north-east, north, north-west, west, south-west
```
