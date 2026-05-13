import { WORLD_PROP_ATLASES, getWorldPropDefinition } from "../content/objects/world-props/definitions.js";
import { getLoadedImage } from "../engine/assets/AssetLoader.js";

export class WorldPropPainter {
  constructor({ tileWidth, tileHeight }) {
    this.tileWidth = tileWidth;
    this.tileHeight = tileHeight;
    this.atlases = new Map();
  }

  setImageCache(imageCache) {
    this.atlases.clear();

    for (const [key, src] of Object.entries(WORLD_PROP_ATLASES)) {
      this.atlases.set(key, getLoadedImage(imageCache, src));
    }
  }

  getBounds(prop, x, y) {
    const definition = getWorldPropDefinition(prop.definitionId);

    if (!definition) {
      return { x: x - this.tileWidth, y: y - this.tileHeight, width: this.tileWidth * 2, height: this.tileHeight * 2 };
    }

    const size = getDrawSize(definition, this.tileWidth);

    return {
      x: x - size.width / 2,
      y: y - size.height + this.tileHeight * 0.46,
      width: size.width,
      height: size.height,
    };
  }

  paint(ctx, { prop, x, y }) {
    const definition = getWorldPropDefinition(prop.definitionId);
    const image = definition ? this.atlases.get(definition.atlas) : null;

    if (!definition || !image) {
      return;
    }

    const size = getDrawSize(definition, this.tileWidth);
    const drawX = x - size.width / 2;
    const drawY = y - size.height + this.tileHeight * 0.46;

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(
      image,
      definition.rect.x,
      definition.rect.y,
      definition.rect.width,
      definition.rect.height,
      drawX,
      drawY,
      size.width,
      size.height,
    );
    ctx.restore();
  }
}

function getDrawSize(definition, tileWidth) {
  const width = tileWidth * definition.tileScale;

  return {
    width,
    height: width * (definition.rect.height / definition.rect.width),
  };
}
