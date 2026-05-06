# Seamless Terrain

## Core Lesson

For terrain patches that should hide the grid, the painter and the asset both matter. A good source texture can still show borders if the renderer adds per-tile shadow, stroke, tint, flip variation, transparent edges, or brightness ramps.

## Base Tile Texture

- Derive the runtime tile from the interior of the user reference, not from the full reference diamond.
- Avoid transparent diamond edges for seamless ground sheets. Use an opaque rectangular source frame and let the painter clip it to the tile diamond.
- Avoid darkening or brightening the frame edges. That creates repeated diamond borders.
- For standard `82x42` map tiles, a `164x84` source frame keeps reference texture detail while staying small.
- Use one frame when variants reveal grid structure. Use variants only when their average color and edge behavior are nearly identical.

## Decoration Sprites

- Put small rocks, dead plants, chips, coal, and debris in a separate transparent spritesheet.
- Keep cells tiny, for example `28x22`, with transparent background and crisp pixel edges.
- Draw decorations after the base terrain, outside the texture clipping pass, so they read as placed items.
- Use deterministic placement from `tile.seed`; do not animate or randomize them per frame.

## Painter Rules

For seamless patch terrain:

- Skip normal tile shadows.
- Skip normal texture overlays such as grain or cracks.
- Skip terrain strokes.
- Draw the opaque texture through a slightly inflated diamond clip.
- Draw with a small destination overlap such as `1.5` CSS pixels to hide subpixel gaps.
- Use `imageSmoothingEnabled = false` for pixel-art sheets.

Example pattern:

```js
const overlap = 1.5;

ctx.save();
ctx.imageSmoothingEnabled = false;
drawDiamond(ctx, {
  top: { x: corners.top.x, y: corners.top.y - overlap },
  right: { x: corners.right.x + overlap, y: corners.right.y },
  bottom: { x: corners.bottom.x, y: corners.bottom.y + overlap },
  left: { x: corners.left.x - overlap, y: corners.left.y },
});
ctx.clip();
ctx.drawImage(
  image,
  sourceX,
  0,
  frameWidth,
  frameHeight,
  corners.left.x - overlap,
  corners.top.y - overlap,
  tileWidth + overlap * 2,
  tileHeight + overlap * 2,
);
ctx.restore();
```

## Color Matching

When matching a tile to an in-world object, sample the object's ground pixels, not flame/glow/highlight pixels. For firepit dirt, a warm dark brown target worked better than flat dark soil. If the object has baked ground under it, the surrounding terrain should be close enough that the object does not look pasted on top.

## Local Preview

If Browser screenshots are unreliable, generate a quick local isometric preview by tiling the runtime sheet in draw order with the same clip/overlap logic as the painter. Inspect for repeated diamonds, seams, overly obvious variants, and decoration density before final browser smoke testing.
