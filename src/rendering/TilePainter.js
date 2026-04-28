import { TILE_TYPES } from "../world/tileTypes.js";

export class TilePainter {
  constructor({ tileWidth, tileHeight }) {
    this.tileWidth = tileWidth;
    this.tileHeight = tileHeight;
  }

  paint(ctx, { tile, x, y, elapsed, isHovered }) {
    const corners = this.getCorners(x, y - tile.elevation * 3);

    this.paintShadow(ctx, corners, tile);
    this.paintTop(ctx, corners, tile);
    this.paintTexture(ctx, corners, tile);
    this.paintFeature(ctx, corners, tile, elapsed);

    if (isHovered) {
      this.paintHover(ctx, corners);
    }
  }

  getCorners(x, y) {
    const halfWidth = this.tileWidth / 2;
    const halfHeight = this.tileHeight / 2;

    return {
      top: { x, y },
      right: { x: x + halfWidth, y: y + halfHeight },
      bottom: { x, y: y + this.tileHeight },
      left: { x: x - halfWidth, y: y + halfHeight },
    };
  }

  paintShadow(ctx, corners, tile) {
    const depth = 6 + tile.elevation * 3;

    ctx.save();
    ctx.globalAlpha = 0.26;
    ctx.fillStyle = "#2a1710";
    ctx.beginPath();
    ctx.moveTo(corners.left.x + 5, corners.left.y + depth);
    ctx.lineTo(corners.bottom.x + 5, corners.bottom.y + depth);
    ctx.lineTo(corners.right.x + 5, corners.right.y + depth);
    ctx.lineTo(corners.bottom.x + 18, corners.bottom.y + depth + 8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  paintTop(ctx, corners, tile) {
    const type = TILE_TYPES[tile.type];
    const gradient = ctx.createLinearGradient(corners.top.x, corners.top.y, corners.bottom.x, corners.bottom.y);

    gradient.addColorStop(0, shade(type.colors.light, tile.lightness + 0.05));
    gradient.addColorStop(0.56, shade(type.colors.base, tile.lightness));
    gradient.addColorStop(1, shade(type.colors.shadow, tile.lightness - 0.02));

    ctx.fillStyle = gradient;
    drawDiamond(ctx, corners);
    ctx.fill();

    ctx.strokeStyle = "rgba(68, 42, 21, 0.28)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  paintTexture(ctx, corners, tile) {
    ctx.save();
    drawDiamond(ctx, corners);
    ctx.clip();

    if (tile.type === "dune") {
      this.paintDuneLines(ctx, corners, tile);
    } else if (tile.type === "salt") {
      this.paintSaltCracks(ctx, corners, tile);
    } else {
      this.paintSandGrain(ctx, corners, tile);
    }

    ctx.restore();
  }

  paintDuneLines(ctx, corners, tile) {
    ctx.strokeStyle = `rgba(255, 235, 185, ${0.2 + tile.texture * 0.08})`;
    ctx.lineWidth = 1.6;

    for (let i = 0; i < 3; i += 1) {
      const y = corners.top.y + this.tileHeight * (0.3 + i * 0.16);
      const drift = (tile.texture - 0.5) * 16;

      ctx.beginPath();
      ctx.moveTo(corners.left.x + 18, y + i * 2);
      ctx.bezierCurveTo(
        corners.left.x + 36,
        y - 10 + drift,
        corners.right.x - 34,
        y + 12 - drift,
        corners.right.x - 18,
        y - 2,
      );
      ctx.stroke();
    }
  }

  paintSaltCracks(ctx, corners, tile) {
    ctx.strokeStyle = "rgba(101, 89, 69, 0.28)";
    ctx.lineWidth = 1;

    for (let i = 0; i < 4; i += 1) {
      const startX = corners.left.x + 18 + seeded(tile.seed, i) * 48;
      const startY = corners.top.y + 14 + seeded(tile.seed, i + 9) * 22;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(startX + 10 - seeded(tile.seed, i + 3) * 20, startY + 9);
      ctx.lineTo(startX + 20 - seeded(tile.seed, i + 6) * 18, startY + 17);
      ctx.stroke();
    }
  }

  paintSandGrain(ctx, corners, tile) {
    ctx.fillStyle = "rgba(255, 240, 194, 0.18)";

    for (let i = 0; i < 9; i += 1) {
      const px = corners.left.x + seeded(tile.seed, i) * this.tileWidth;
      const py = corners.top.y + 8 + seeded(tile.seed, i + 20) * (this.tileHeight - 10);

      ctx.fillRect(px, py, 1.25, 1.25);
    }
  }

  paintFeature(ctx, corners, tile, elapsed) {
    if (tile.type === "rock") {
      this.paintRock(ctx, corners, tile);
    }

    if (tile.type === "scrub") {
      this.paintScrub(ctx, corners, tile);
    }

    if (tile.type === "oasis") {
      this.paintOasis(ctx, corners, tile, elapsed);
    }
  }

  paintRock(ctx, corners, tile) {
    const cx = corners.top.x + (tile.texture - 0.5) * 12;
    const cy = corners.top.y + this.tileHeight * 0.52;

    ctx.save();
    ctx.fillStyle = "rgba(52, 34, 25, 0.24)";
    ctx.beginPath();
    ctx.ellipse(cx + 4, cy + 8, 20, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = shade("#9e7550", tile.lightness);
    ctx.beginPath();
    ctx.moveTo(cx - 18, cy + 5);
    ctx.lineTo(cx - 4, cy - 12);
    ctx.lineTo(cx + 17, cy - 3);
    ctx.lineTo(cx + 12, cy + 11);
    ctx.lineTo(cx - 12, cy + 13);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(255, 234, 191, 0.18)";
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy - 12);
    ctx.lineTo(cx + 17, cy - 3);
    ctx.lineTo(cx + 4, cy + 1);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  paintScrub(ctx, corners, tile) {
    const cx = corners.top.x + (tile.texture - 0.5) * 18;
    const cy = corners.top.y + this.tileHeight * 0.58;

    ctx.save();
    ctx.strokeStyle = "#6f8653";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";

    for (let i = 0; i < 5; i += 1) {
      const angle = -Math.PI / 2 + (i - 2) * 0.34;

      ctx.beginPath();
      ctx.moveTo(cx, cy + 5);
      ctx.lineTo(cx + Math.cos(angle) * (9 + i), cy + Math.sin(angle) * (9 + i));
      ctx.stroke();
    }

    ctx.fillStyle = "#a5b975";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 7, 11, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  paintOasis(ctx, corners, tile, elapsed) {
    const shimmer = Math.sin(elapsed * 0.003 + tile.seed) * 0.08;
    const cx = corners.top.x;
    const cy = corners.top.y + this.tileHeight * 0.55;

    ctx.save();
    ctx.fillStyle = "rgba(31, 25, 18, 0.24)";
    ctx.beginPath();
    ctx.ellipse(cx + 3, cy + 6, 25, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    const water = ctx.createLinearGradient(cx - 20, cy - 8, cx + 22, cy + 10);

    water.addColorStop(0, "#1d877f");
    water.addColorStop(0.55, "#42d6cf");
    water.addColorStop(1, "#0c4b58");

    ctx.fillStyle = water;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 23, 10 + shimmer * 4, -0.08, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(231, 255, 243, 0.38)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx - 15, cy - 1);
    ctx.bezierCurveTo(cx - 4, cy - 5, cx + 8, cy + 4, cx + 16, cy);
    ctx.stroke();

    this.paintPalm(ctx, cx + 18, cy - 1);
    ctx.restore();
  }

  paintPalm(ctx, x, y) {
    ctx.strokeStyle = "#765333";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, y + 10);
    ctx.quadraticCurveTo(x - 3, y, x + 1, y - 11);
    ctx.stroke();

    ctx.strokeStyle = "#748d48";
    ctx.lineWidth = 2;

    for (let i = 0; i < 5; i += 1) {
      const angle = -2.65 + i * 0.42;

      ctx.beginPath();
      ctx.moveTo(x + 1, y - 11);
      ctx.lineTo(x + 1 + Math.cos(angle) * 14, y - 11 + Math.sin(angle) * 8);
      ctx.stroke();
    }
  }

  paintHover(ctx, corners) {
    ctx.save();
    ctx.fillStyle = "rgba(73, 215, 194, 0.18)";
    ctx.strokeStyle = "rgba(169, 255, 241, 0.9)";
    ctx.lineWidth = 2;
    drawDiamond(ctx, corners);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

function drawDiamond(ctx, corners) {
  ctx.beginPath();
  ctx.moveTo(corners.top.x, corners.top.y);
  ctx.lineTo(corners.right.x, corners.right.y);
  ctx.lineTo(corners.bottom.x, corners.bottom.y);
  ctx.lineTo(corners.left.x, corners.left.y);
  ctx.closePath();
}

function seeded(seed, salt) {
  const value = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;

  return value - Math.floor(value);
}

function shade(hex, amount) {
  const color = hex.replace("#", "");
  const number = Number.parseInt(color, 16);
  const r = clamp(((number >> 16) & 255) + amount * 255);
  const g = clamp(((number >> 8) & 255) + amount * 255);
  const b = clamp((number & 255) + amount * 255);

  return `rgb(${r}, ${g}, ${b})`;
}

function clamp(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}
