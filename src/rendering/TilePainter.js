import { TILE_TYPES } from "../world/tileTypes.js";

export class TilePainter {
  constructor({ tileWidth, tileHeight }) {
    this.tileWidth = tileWidth;
    this.tileHeight = tileHeight;
  }

  paint(ctx, { tile, x, y, elapsed, isHovered }) {
    const corners = this.getCorners(x, y);

    this.paintShadow(ctx, corners, tile);
    this.paintTop(ctx, corners, tile);
    this.paintTexture(ctx, corners, tile);
    if (tile.hasRoad) {
      this.paintRoad(ctx, corners, tile);
    } else {
      this.paintFeature(ctx, corners, tile, elapsed);
    }
    if (tile.canBuild) {
      this.paintBuildSite(ctx, corners, tile, elapsed);
    }
    if (tile.building) {
      this.paintBuilding(ctx, corners, tile, elapsed);
    }

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

    if (tile.type === "water" || tile.type === "lava") {
      this.paintWaterRipples(ctx, corners, tile);
    } else if (tile.type === "snow" || tile.type === "ice") {
      this.paintSnowCrystals(ctx, corners, tile);
    } else if (tile.type === "dune") {
      this.paintDuneLines(ctx, corners, tile);
    } else if (tile.type === "salt" || tile.type === "ash") {
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

  paintWaterRipples(ctx, corners, tile) {
    ctx.strokeStyle =
      tile.type === "lava"
        ? `rgba(255, 216, 118, ${0.28 + tile.texture * 0.18})`
        : `rgba(205, 255, 247, ${0.22 + tile.texture * 0.12})`;
    ctx.lineWidth = 1.5;

    for (let i = 0; i < 3; i += 1) {
      const y = corners.top.y + this.tileHeight * (0.36 + i * 0.16);
      const drift = (tile.texture - 0.5) * 12;

      ctx.beginPath();
      ctx.moveTo(corners.left.x + 16, y);
      ctx.bezierCurveTo(
        corners.left.x + 32,
        y - 6 + drift,
        corners.right.x - 32,
        y + 6 - drift,
        corners.right.x - 16,
        y,
      );
      ctx.stroke();
    }
  }

  paintSnowCrystals(ctx, corners, tile) {
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.22 + tile.texture * 0.16})`;
    ctx.lineWidth = 1;

    for (let i = 0; i < 5; i += 1) {
      const x = corners.left.x + 16 + seeded(tile.seed, i) * (this.tileWidth - 32);
      const y = corners.top.y + 10 + seeded(tile.seed, i + 17) * (this.tileHeight - 18);

      ctx.beginPath();
      ctx.moveTo(x - 3, y);
      ctx.lineTo(x + 3, y);
      ctx.moveTo(x, y - 3);
      ctx.lineTo(x, y + 3);
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
    if (tile.type === "rock" || tile.type === "obsidian") {
      this.paintRock(ctx, corners, tile);
    }

    if (tile.type === "scrub") {
      this.paintScrub(ctx, corners, tile);
    }

    if (tile.type === "forest") {
      this.paintForest(ctx, corners, tile);
    }

    if (tile.type === "flower") {
      this.paintFlowers(ctx, corners, tile);
    }

    if (tile.type === "oasis") {
      this.paintOasis(ctx, corners, tile, elapsed);
    }
  }

  paintRoad(ctx, corners, tile) {
    const cx = corners.top.x;
    const cy = corners.top.y + this.tileHeight * 0.5;
    const connections = tile.roadConnections || {};
    const endpoints = [];

    if (connections.columnPlus) {
      endpoints.push(midPoint(corners.right, corners.bottom));
    }
    if (connections.columnMinus) {
      endpoints.push(midPoint(corners.left, corners.top));
    }
    if (connections.rowPlus) {
      endpoints.push(midPoint(corners.left, corners.bottom));
    }
    if (connections.rowMinus) {
      endpoints.push(midPoint(corners.top, corners.right));
    }

    ctx.save();
    drawDiamond(ctx, corners);
    ctx.clip();

    const palette =
      tile.biome === "snow"
        ? {
            shadow: "rgba(65, 54, 42, 0.38)",
            edge: "rgba(85, 74, 58, 0.62)",
            base: "#9a8a68",
            light: "rgba(221, 213, 178, 0.3)",
            rut: "rgba(64, 55, 42, 0.34)",
            stone: "rgba(229, 224, 201, 0.36)",
          }
        : {
            shadow: "rgba(52, 31, 17, 0.34)",
            edge: "rgba(86, 55, 30, 0.68)",
            base: "#a87942",
            light: "rgba(238, 202, 131, 0.32)",
            rut: "rgba(73, 45, 23, 0.3)",
            stone: "rgba(255, 226, 159, 0.24)",
          };

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (endpoints.length === 0) {
      ctx.fillStyle = palette.shadow;
      ctx.beginPath();
      ctx.ellipse(cx + 2, cy + 3, 24, 9, -0.06, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = palette.base;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 22, 8, -0.06, 0, Math.PI * 2);
      ctx.fill();
    } else {
      for (const point of endpoints) {
        this.strokeRoadArm(ctx, cx, cy, point, palette.shadow, 22, 3);
      }

      for (const point of endpoints) {
        this.strokeRoadArm(ctx, cx, cy, point, palette.edge, 18, 0);
      }

      for (const point of endpoints) {
        this.strokeRoadArm(ctx, cx, cy, point, palette.base, 14, -1);
      }
    }

    ctx.fillStyle = palette.base;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 19, 8.5, 0, 0, Math.PI * 2);
    ctx.fill();

    for (const point of endpoints) {
      this.strokeRoadArm(ctx, cx, cy, point, palette.light, 5, -2);
    }

    ctx.strokeStyle = palette.rut;
    ctx.lineWidth = 1.2;
    for (const point of endpoints) {
      const offset = seeded(tile.seed, Math.floor(point.x + point.y)) > 0.5 ? 3 : -3;

      ctx.beginPath();
      ctx.moveTo(cx + offset * 0.35, cy + offset * 0.12);
      ctx.quadraticCurveTo(
        (cx + point.x) * 0.5 + offset,
        (cy + point.y) * 0.5 - offset * 0.2,
        point.x - offset * 0.25,
        point.y - offset * 0.08,
      );
      ctx.stroke();
    }

    this.paintRoadPebbles(ctx, corners, tile, palette.stone);
    ctx.restore();
  }

  strokeRoadArm(ctx, cx, cy, point, color, width, verticalOffset) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(cx, cy + verticalOffset);
    ctx.quadraticCurveTo(
      (cx + point.x) * 0.5,
      (cy + point.y) * 0.5 + verticalOffset,
      point.x,
      point.y + verticalOffset,
    );
    ctx.stroke();
  }

  paintRoadPebbles(ctx, corners, tile, color) {
    ctx.fillStyle = color;

    for (let i = 0; i < 5; i += 1) {
      const x = corners.left.x + 18 + seeded(tile.seed, i + 41) * (this.tileWidth - 36);
      const y = corners.top.y + 10 + seeded(tile.seed, i + 64) * (this.tileHeight - 18);
      const radius = 0.8 + seeded(tile.seed, i + 83) * 1.2;

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  paintBuildSite(ctx, corners, tile, elapsed) {
    const cx = corners.top.x;
    const cy = corners.top.y + this.tileHeight * 0.5;
    const pulse = Math.sin(elapsed * 0.005 + tile.seed) * 0.5 + 0.5;

    ctx.save();
    ctx.globalAlpha = 0.72 + pulse * 0.2;
    ctx.fillStyle = "rgba(255, 226, 142, 0.18)";
    ctx.strokeStyle = "rgba(255, 235, 174, 0.72)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.roundRect(cx - 18, cy - 13, 36, 25, 5);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = "#ffe28e";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy + 4);
    ctx.lineTo(cx, cy - 7);
    ctx.lineTo(cx + 10, cy + 4);
    ctx.moveTo(cx - 6, cy + 4);
    ctx.lineTo(cx + 6, cy + 4);
    ctx.stroke();
    ctx.restore();
  }

  paintBuilding(ctx, corners, tile) {
    const cx = corners.top.x;
    const cy = corners.top.y + this.tileHeight * 0.5;
    const tone = getBuildingTone(tile.building);

    ctx.save();
    ctx.fillStyle = "rgba(24, 15, 10, 0.34)";
    ctx.beginPath();
    ctx.ellipse(cx + 2, cy + 10, 28, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = tone.wall;
    ctx.beginPath();
    ctx.roundRect(cx - 18, cy - 16, 36, 26, 5);
    ctx.fill();

    ctx.fillStyle = tone.roof;
    ctx.beginPath();
    ctx.moveTo(cx - 23, cy - 14);
    ctx.lineTo(cx, cy - 32);
    ctx.lineTo(cx + 23, cy - 14);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(33, 22, 14, 0.78)";
    ctx.fillRect(cx - 5, cy - 3, 10, 13);
    ctx.fillStyle = tone.light;
    ctx.fillRect(cx + 8, cy - 8, 6, 5);
    ctx.restore();
  }

  paintRock(ctx, corners, tile) {
    const cx = corners.top.x;
    const cy = corners.top.y + this.tileHeight * 0.5;

    ctx.save();
    ctx.fillStyle = "rgba(52, 34, 25, 0.24)";
    ctx.beginPath();
    ctx.ellipse(cx + 4, cy + 8, 20, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = shade(tile.type === "obsidian" ? "#4a404e" : "#9e7550", tile.lightness);
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
    const cx = corners.top.x;
    const cy = corners.top.y + this.tileHeight * 0.5;

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

  paintForest(ctx, corners, tile) {
    const cx = corners.top.x;
    const cy = corners.top.y + this.tileHeight * 0.5;

    ctx.save();
    for (let i = 0; i < 3; i += 1) {
      const offset = (i - 1) * 12;

      ctx.fillStyle = "#345b3f";
      ctx.beginPath();
      ctx.moveTo(cx + offset, cy - 18);
      ctx.lineTo(cx + offset - 11, cy + 7);
      ctx.lineTo(cx + offset + 12, cy + 7);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#6fa060";
      ctx.beginPath();
      ctx.moveTo(cx + offset, cy - 24);
      ctx.lineTo(cx + offset - 9, cy - 2);
      ctx.lineTo(cx + offset + 10, cy - 2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  paintFlowers(ctx, corners, tile) {
    const cx = corners.top.x;
    const cy = corners.top.y + this.tileHeight * 0.5;

    this.paintScrub(ctx, corners, tile);

    ctx.save();
    for (let i = 0; i < 7; i += 1) {
      const x = cx - 18 + seeded(tile.seed, i) * 36;
      const y = cy - 6 + seeded(tile.seed, i + 20) * 20;

      ctx.fillStyle = i % 2 === 0 ? "#ff9cc1" : "#f7df6b";
      ctx.beginPath();
      ctx.arc(x, y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  paintOasis(ctx, corners, tile, elapsed) {
    const shimmer = Math.sin(elapsed * 0.003 + tile.seed) * 0.08;
    const cx = corners.top.x;
    const cy = corners.top.y + this.tileHeight * 0.5;

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

function midPoint(first, second) {
  return {
    x: (first.x + second.x) * 0.5,
    y: (first.y + second.y) * 0.5,
  };
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

function getBuildingTone(buildingId) {
  if (buildingId === "torch-watch") {
    return { wall: "#785438", roof: "#c46d39", light: "#ffd66e" };
  }

  if (buildingId === "storage-house") {
    return { wall: "#8c6740", roof: "#3f4d38", light: "#f3d35f" };
  }

  if (buildingId === "tavern") {
    return { wall: "#7f4f53", roof: "#4a2738", light: "#ffce7a" };
  }

  if (buildingId === "guild-town") {
    return { wall: "#6f5a38", roof: "#2e3f52", light: "#8fe8ef" };
  }

  return { wall: "#9a7045", roof: "#6f3f2b", light: "#ffe28e" };
}

function clamp(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}
