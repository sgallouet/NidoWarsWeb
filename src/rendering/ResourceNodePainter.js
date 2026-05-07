import { getLoadedImage } from "../engine/assets/AssetLoader.js";
import { RESOURCE_ICONS, RESOURCE_NODE_ART } from "../content/resources/definitions.js";

const TREE_VARIANT_COUNT = 24;
const TREE_BATCH_SIZE = 148;
const TREE_BATCH_ANCHOR_X = 74;
const TREE_BATCH_ANCHOR_Y = 118;
const ROCK_BATCH_WIDTH = 80;
const ROCK_BATCH_HEIGHT = 72;
const ROCK_BATCH_ANCHOR_X = 40;
const ROCK_BATCH_ANCHOR_Y = 48;
const BERRY_BATCH_SIZE = 64;
const BERRY_BATCH_ANCHOR_X = 32;
const BERRY_BATCH_ANCHOR_Y = 28;

export class ResourceNodePainter {
  constructor() {
    this.treeImage = null;
    this.rockImage = null;
    this.treeVariants = new Map();
    this.rockSprite = null;
    this.berrySprites = new Map();
  }

  setImageCache(imageCache) {
    this.treeImage = getLoadedImage(imageCache, RESOURCE_NODE_ART.wood) || getLoadedImage(imageCache, RESOURCE_ICONS.wood);
    this.rockImage = getLoadedImage(imageCache, RESOURCE_NODE_ART.rock) || getLoadedImage(imageCache, RESOURCE_ICONS.rock);
    this.treeVariants.clear();
    this.rockSprite = null;
    this.berrySprites.clear();
  }

  paint(ctx, { node, x, y, elapsed, activeWorkerCount = 0, alpha = 1 }) {
    if (node.type === "fish") {
      this.paintFishShoal(ctx, x, y, elapsed, node);
      return;
    }

    if (node.type === "wood") {
      this.paintTimberTree(ctx, x, y, node, elapsed, activeWorkerCount, alpha);
      return;
    }

    if (node.type === "rock") {
      this.paintRockDeposit(ctx, x, y, node);
      return;
    }

    this.paintBerryBush(ctx, x, y, node);
  }

  paintFishShoal(ctx, x, y, elapsed, node) {
    const shimmer = Math.sin(elapsed * 0.006 + node.column) * 1.6;

    ctx.save();
    ctx.fillStyle = "rgba(7, 54, 73, 0.22)";
    ctx.beginPath();
    ctx.ellipse(x, y + 7, 25, 10, -0.08, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(205, 255, 247, 0.48)";
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 2; i += 1) {
      ctx.beginPath();
      ctx.ellipse(x + i * 4 - 4, y + 5, 18 + i * 5, 6 + i * 2, 0, 0.2, Math.PI * 1.25);
      ctx.stroke();
    }

    this.paintSmallFish(ctx, x - 8, y - 1 + shimmer, 0.82, "#8fe8ef");
    this.paintSmallFish(ctx, x + 9, y + 4 - shimmer * 0.6, -0.7, "#4fc7db");
    this.paintSmallFish(ctx, x + 1, y - 8 + shimmer * 0.35, 0.15, "#b8f6ff");
    ctx.restore();
  }

  paintSmallFish(ctx, x, y, rotation, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-7, 0);
    ctx.lineTo(-13, -4);
    ctx.lineTo(-12, 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#17435a";
    ctx.beginPath();
    ctx.arc(4.2, -1.2, 1.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  paintTimberTree(ctx, x, y, node, elapsed, activeWorkerCount = 0, alpha = 1) {
    if (this.treeImage) {
      this.paintTreeSprite(ctx, x, y, node, elapsed, activeWorkerCount, alpha);
      return;
    }

    const sway = (node.seed || node.column + node.row) % 2 === 0 ? -1 : 1;

    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.fillStyle = "rgba(25, 18, 13, 0.24)";
    ctx.beginPath();
    ctx.ellipse(x, y + 12, 22, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#6e3b22";
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, y + 9);
    ctx.quadraticCurveTo(x + sway, y - 8, x - sway * 2, y - 24);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255, 214, 150, 0.28)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 2, y + 6);
    ctx.quadraticCurveTo(x + 5, y - 8, x + 1, y - 21);
    ctx.stroke();

    this.paintCanopy(ctx, x - 10, y - 28, 16, "#345b3f", "#6fa060");
    this.paintCanopy(ctx, x + 8, y - 31, 17, "#2f5339", "#7fb36b");
    this.paintCanopy(ctx, x, y - 42, 16, "#3f7046", "#8bbd70");

    ctx.fillStyle = "rgba(255, 244, 214, 0.86)";
    ctx.beginPath();
    ctx.moveTo(x + 12, y - 11);
    ctx.lineTo(x + 21, y - 15);
    ctx.lineTo(x + 18, y - 8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  paintTreeSprite(ctx, x, y, node, elapsed, activeWorkerCount, alpha = 1) {
    const seed = getNodeSeed(node);
    const variant = this.getTreeVariant(seed);
    const isBeingCut = activeWorkerCount > 0;
    const cutPulse = isBeingCut ? Math.max(0, Math.sin(elapsed * 0.028 + seed * 0.01)) : 0;

    if (alpha < 1) {
      ctx.save();
      ctx.globalAlpha *= alpha;
    }

    ctx.drawImage(
      variant,
      x - TREE_BATCH_ANCHOR_X,
      y - TREE_BATCH_ANCHOR_Y,
      TREE_BATCH_SIZE,
      TREE_BATCH_SIZE,
    );

    if (alpha < 1) {
      ctx.restore();
    }

    if (isBeingCut) {
      this.paintChopFeedback(ctx, x, y, node, elapsed, activeWorkerCount, cutPulse);
    }
  }

  getTreeVariant(seed) {
    const variantKey = Math.floor(seeded(seed, 13) * TREE_VARIANT_COUNT);
    const cached = this.treeVariants.get(variantKey);

    if (cached) {
      return cached;
    }

    const canvas = document.createElement("canvas");
    const size = 98 + (variantKey / Math.max(1, TREE_VARIANT_COUNT - 1)) * 12;
    const tintHue = (seeded(variantKey, 47) - 0.5) * 18;
    const saturation = 0.92 + seeded(variantKey, 59) * 0.22;
    const brightness = 0.88 + seeded(variantKey, 71) * 0.2;

    canvas.width = TREE_BATCH_SIZE;
    canvas.height = TREE_BATCH_SIZE;

    const variantCtx = canvas.getContext("2d");

    variantCtx.fillStyle = "rgba(25, 18, 13, 0.26)";
    variantCtx.beginPath();
    variantCtx.ellipse(TREE_BATCH_ANCHOR_X, TREE_BATCH_ANCHOR_Y + 13, 25, 8, -0.03, 0, Math.PI * 2);
    variantCtx.fill();

    variantCtx.imageSmoothingEnabled = true;
    variantCtx.filter = `hue-rotate(${tintHue}deg) saturate(${saturation}) brightness(${brightness})`;
    variantCtx.drawImage(
      this.treeImage,
      TREE_BATCH_ANCHOR_X - size / 2,
      TREE_BATCH_ANCHOR_Y + 19 - size,
      size,
      size,
    );
    variantCtx.filter = "none";

    this.treeVariants.set(variantKey, canvas);
    return canvas;
  }

  paintChopFeedback(ctx, x, y, node, elapsed, activeWorkerCount, cutPulse) {
    const seed = getNodeSeed(node);
    const side = seeded(seed, 83) > 0.5 ? 1 : -1;
    const trunkX = x + side * (7 + activeWorkerCount * 1.6);
    const trunkY = y - 9 + Math.sin(elapsed * 0.018 + seed) * 1.4;
    const chipCount = 3 + Math.min(2, activeWorkerCount);

    ctx.save();
    ctx.globalAlpha = 0.68 + cutPulse * 0.25;
    ctx.fillStyle = "#f0c26b";
    ctx.beginPath();
    ctx.moveTo(trunkX, trunkY - 5);
    ctx.lineTo(trunkX + side * 10, trunkY - 8);
    ctx.lineTo(trunkX + side * 7, trunkY + 1);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#d49b51";
    for (let i = 0; i < chipCount; i += 1) {
      const phase = (elapsed * 0.006 + i * 0.27 + seeded(seed, i + 101)) % 1;
      const spread = 10 + i * 3;
      const chipX = trunkX + side * (6 + phase * spread);
      const chipY = trunkY - 5 - Math.sin(phase * Math.PI) * (10 + i * 1.8) + phase * 7;
      const radius = 1.5 + seeded(seed, i + 131) * 1.4;

      ctx.beginPath();
      ctx.ellipse(chipX, chipY, radius * 1.5, radius, phase * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  paintCanopy(ctx, x, y, radius, shadow, light) {
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.arc(x - radius * 0.22, y - radius * 0.22, radius * 0.62, 0, Math.PI * 2);
    ctx.fill();
  }

  paintRockDeposit(ctx, x, y, node) {
    if (this.rockImage) {
      this.paintRockSprite(ctx, x, y);
      return;
    }

    ctx.save();
    ctx.fillStyle = "rgba(25, 18, 13, 0.25)";
    ctx.beginPath();
    ctx.ellipse(x, y + 12, 23, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    const pulse = 0.9 + Math.sin(node.column * 0.7 + node.row) * 0.08;

    this.paintStone(ctx, x - 12, y + 1, 11 * pulse, "#6c7680", "#dfe9dc");
    this.paintStone(ctx, x + 10, y + 0, 12, "#515765", "#c6d0cc");
    this.paintStone(ctx, x - 2, y - 11, 13, "#758187", "#eef5e6");
    this.paintStone(ctx, x - 1, y + 8, 16, "#747d7c", "#e3ecd5");
    ctx.restore();
  }

  paintRockSprite(ctx, x, y) {
    const sprite = this.getRockSprite();

    ctx.drawImage(
      sprite,
      x - ROCK_BATCH_ANCHOR_X,
      y - ROCK_BATCH_ANCHOR_Y,
      ROCK_BATCH_WIDTH,
      ROCK_BATCH_HEIGHT,
    );
  }

  getRockSprite() {
    if (this.rockSprite) {
      return this.rockSprite;
    }

    const canvas = document.createElement("canvas");

    canvas.width = ROCK_BATCH_WIDTH;
    canvas.height = ROCK_BATCH_HEIGHT;

    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "rgba(25, 18, 13, 0.25)";
    ctx.beginPath();
    ctx.ellipse(ROCK_BATCH_ANCHOR_X, ROCK_BATCH_ANCHOR_Y + 12, 23, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.rockImage, ROCK_BATCH_ANCHOR_X - 31, ROCK_BATCH_ANCHOR_Y - 43, 62, 62);

    this.rockSprite = canvas;
    return this.rockSprite;
  }

  paintStone(ctx, x, y, radius, shadow, light) {
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.ellipse(x, y, radius, radius * 0.72, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.ellipse(x - radius * 0.24, y - radius * 0.2, radius * 0.42, radius * 0.25, -0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  paintBerryBush(ctx, x, y, node) {
    const sprite = this.getBerrySprite(node);

    ctx.drawImage(
      sprite,
      x - BERRY_BATCH_ANCHOR_X,
      y - BERRY_BATCH_ANCHOR_Y,
      BERRY_BATCH_SIZE,
      BERRY_BATCH_SIZE,
    );
  }

  getBerrySprite(node) {
    const key = node.id;
    const cached = this.berrySprites.get(key);

    if (cached) {
      return cached;
    }

    const canvas = document.createElement("canvas");

    canvas.width = BERRY_BATCH_SIZE;
    canvas.height = BERRY_BATCH_SIZE;

    const ctx = canvas.getContext("2d");

    this.paintBerryBushVector(ctx, BERRY_BATCH_ANCHOR_X, BERRY_BATCH_ANCHOR_Y, node);
    this.berrySprites.set(key, canvas);
    return canvas;
  }

  paintBerryBushVector(ctx, x, y, node) {
    ctx.save();
    ctx.fillStyle = "rgba(25, 18, 13, 0.22)";
    ctx.beginPath();
    ctx.ellipse(x, y + 10, 20, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#365f38";
    ctx.beginPath();
    ctx.ellipse(x - 9, y, 12, 12, -0.35, 0, Math.PI * 2);
    ctx.ellipse(x + 8, y, 13, 13, 0.32, 0, Math.PI * 2);
    ctx.ellipse(x, y - 9, 12, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#78a95e";
    ctx.beginPath();
    ctx.ellipse(x - 4, y - 5, 13, 10, -0.2, 0, Math.PI * 2);
    ctx.ellipse(x + 6, y - 8, 12, 9, 0.25, 0, Math.PI * 2);
    ctx.fill();

    for (let i = 0; i < 10; i += 1) {
      const angle = i * 2.13 + node.column * 0.1;
      const radius = 4 + (i % 4) * 3;
      const berryX = x + Math.cos(angle) * radius;
      const berryY = y - 6 + Math.sin(angle) * radius * 0.72;

      ctx.fillStyle = "#74122f";
      ctx.beginPath();
      ctx.arc(berryX + 1, berryY + 1.5, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e73564";
      ctx.beginPath();
      ctx.arc(berryX, berryY, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 236, 214, 0.7)";
      ctx.beginPath();
      ctx.arc(berryX - 0.9, berryY - 1, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function getNodeSeed(node) {
  return node.seed || node.column * 928371 + node.row * 364479 + node.id.length * 811;
}

function seeded(seed, salt) {
  const value = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;

  return value - Math.floor(value);
}
