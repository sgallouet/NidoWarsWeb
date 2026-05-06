# Runtime Integration

## Content Manifest

Each active tile art folder should own its manifest:

```js
export const CAMPGROUND_TILE_ART = {
  ground: {
    src: "./src/content/tiles/campground/art/ground_tiles.png",
    frameWidth: 164,
    frameHeight: 84,
    frameCount: 1,
  },
  decorations: "./src/content/tiles/campground/art/decorations.png",
};
```

Register only preloadable image paths in `src/content/assets/runtimeImages.js`:

```js
CAMPGROUND_TILE_ART.ground.src,
CAMPGROUND_TILE_ART.decorations,
```

## Tile Definitions And World Generation

- Add tile data in `src/content/tiles/definitions.js`.
- Use `src/world/createDesertMap.js` to assign the terrain type to the intended biome/start area.
- Preserve reachability and passability; confirm `isTilePassable` and movement cost still match gameplay.

## Painter Integration

- Add loaded image fields in the painter constructor.
- Resolve them in `setImageCache(imageCache)` using `getLoadedImage`.
- Keep image loading out of paint calls.
- For seamless terrain, short-circuit normal shadow/stroke/texture passes if those passes reveal tile boundaries.

## Verification

Use:

```bash
node --check src/content/tiles/<tile-id>/art.js
node --check src/content/assets/runtimeImages.js
node --check src/content/tiles/definitions.js
node --check src/world/createDesertMap.js
node --check src/rendering/TilePainter.js
```

Then:

- Check `http://127.0.0.1:4174/src/content/tiles/<tile-id>/art/<asset>.png` returns `image/png`.
- Reload the app in Browser plugin.
- Check console warnings/errors.
- Inspect a desktop viewport and a phone-ish viewport when tile scale or clipping changes.
