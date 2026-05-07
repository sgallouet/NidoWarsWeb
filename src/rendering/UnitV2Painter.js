import { UNIT_V2_ART } from "../content/units/unitV2Art.js";
import { getLoadedImage } from "../engine/assets/AssetLoader.js";

export class UnitV2Painter {
  constructor() {
    this.imageCache = new Map();
  }

  setImageCache(imageCache) {
    this.imageCache = imageCache;
  }

  getArt(unit) {
    const key = unit.art?.key || unit.unitV2ArtKey;

    return key ? UNIT_V2_ART[key] || null : null;
  }

  usesUnitV2(unit) {
    return Boolean(this.getArt(unit));
  }

  paintShadow(ctx, x, y, unit, scale = 1) {
    const art = this.getArt(unit);
    const shadow = art?.shadow || { width: 14, height: 5, alpha: 0.24 };
    const alpha = Math.max(0.42, shadow.alpha * 1.7);

    ctx.save();
    ctx.fillStyle = `rgba(18, 12, 9, ${alpha})`;
    ctx.beginPath();
    ctx.ellipse(x + 1, y + 3, shadow.width * 1.08 * scale, shadow.height * 1.12 * scale, -0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  paint(ctx, unit, x, y, elapsed) {
    const art = this.getArt(unit);

    if (!art) {
      return false;
    }

    const image = this.getImage(art.atlas?.src);

    if (!isImageReady(image)) {
      return true;
    }

    const action = getUnitV2Action(unit);
    const animation = art.animations[action] || art.animations.idle;
    const frame = getAnimationFrame(animation, getActionElapsed(unit, action, animation, elapsed));
    const facing = getFacing(unit);
    const atlas = art.atlas;
    const cellSize = atlas.cellSize || 112;
    const source = getFrameSource(frame, cellSize);
    const sourceWidth = source.right - source.left;
    const sourceHeight = source.bottom - source.top;
    const drawScale = atlas.drawScale || (atlas.drawWidth || cellSize) / cellSize;
    const drawWidth = sourceWidth * drawScale;
    const drawHeight = sourceHeight * drawScale;
    const anchor = frame.anchor || atlas.anchor || { x: cellSize / 2, y: cellSize };
    const drawAnchorX = (anchor.x - source.left) * drawScale;
    const drawAnchorY = (anchor.y - source.top) * drawScale;

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.translate(x + (frame.offsetX || 0) * facing, y + (frame.offsetY || 0));
    ctx.scale(facing, 1);
    ctx.drawImage(
      image,
      source.left,
      source.top,
      sourceWidth,
      sourceHeight,
      -drawAnchorX,
      -drawAnchorY,
      drawWidth,
      drawHeight,
    );
    ctx.restore();
    return true;
  }

  getImage(src) {
    return getLoadedImage(this.imageCache, src);
  }
}

function getAnimationFrame(animation, elapsed) {
  const frames = animation.frames || [{}];
  const rawIndex = Math.floor(elapsed / animation.frameMs);
  const frameIndex = animation.loop === false ? Math.min(frames.length - 1, rawIndex) : rawIndex % frames.length;

  return frames[frameIndex] || frames[0] || {};
}

function getFrameSource(frame, cellSize) {
  if (frame.source) {
    return frame.source;
  }

  return {
    left: (frame.column || 0) * cellSize,
    top: (frame.row || 0) * cellSize,
    right: ((frame.column || 0) + 1) * cellSize,
    bottom: ((frame.row || 0) + 1) * cellSize,
  };
}

function getActionElapsed(unit, action, animation, elapsed) {
  if (action === "attack" && unit.attackFlashMs > 0) {
    return Math.max(0, getAnimationDuration(animation) - unit.attackFlashMs);
  }

  if (action === "hit" && unit.hitFlashMs > 0) {
    return Math.max(0, getAnimationDuration(animation) - unit.hitFlashMs);
  }

  if (action === "death" && typeof unit.ageMs === "number") {
    return unit.ageMs;
  }

  return elapsed;
}

function getAnimationDuration(animation) {
  return (animation.frames?.length || 1) * animation.frameMs;
}

function getUnitV2Action(unit) {
  if (unit.unitV2ForcedAction) {
    return unit.unitV2ForcedAction;
  }

  if (unit.hitFlashMs > 0) {
    return "hit";
  }

  if (unit.attackFlashMs > 0) {
    return "attack";
  }

  if (unit.movementSegment || unit.movementQueue?.length) {
    return hasCarriedLoad(unit) ? "carry" : "walk";
  }

  if (unit.order === "attack") {
    return "guard";
  }

  if (unit.order === "recover") {
    return "recover";
  }

  if (unit.order === "build") {
    return "build";
  }

  if (unit.order === "clean") {
    return "clean";
  }

  if (unit.order === "resource" || unit.order === "herb" || unit.order === "meat") {
    return "gather";
  }

  return "idle";
}

function hasCarriedLoad(unit) {
  return Boolean(
    unit.carryingTreasureId ||
      unit.carryingHerbId ||
      unit.carryingResourceNodeId ||
      unit.carryingMeatCorpseId ||
      unit.carryingReviveCorpseId,
  );
}

function getFacing(unit) {
  return unit.facingX || 1;
}

function isImageReady(image) {
  return Boolean(image);
}
