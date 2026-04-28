import { TilePainter } from "./TilePainter.js";
import { UnitPainter } from "./UnitPainter.js";
import { gridToWorld, worldToGrid } from "./isoMath.js";

export class CanvasRenderer {
  constructor({ canvas, camera, config }) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d", { alpha: false });
    this.camera = camera;
    this.config = config;
    this.viewport = { width: 1, height: 1, dpr: 1 };
    this.tilePainter = new TilePainter(config);
    this.unitPainter = new UnitPainter(config);
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.viewport = {
      width: rect.width,
      height: rect.height,
      dpr,
    };

    this.canvas.width = Math.floor(rect.width * dpr);
    this.canvas.height = Math.floor(rect.height * dpr);
  }

  render({ world, units, selectedUnit, reachableTiles, movementPath, hoveredTile, elapsed }) {
    const ctx = this.context;
    const { width, height, dpr } = this.viewport;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.paintBackdrop(ctx, width, height, elapsed);

    ctx.save();
    ctx.translate(width / 2, height * 0.54);
    ctx.scale(this.camera.zoom, this.camera.zoom);
    ctx.translate(-this.camera.x, -this.camera.y);

    this.paintWorld(ctx, world, hoveredTile, elapsed);
    this.paintMovementRange(ctx, world, reachableTiles, selectedUnit);
    this.paintMovementPath(ctx, world, movementPath);
    this.paintUnits(ctx, world, units, selectedUnit, elapsed);

    ctx.restore();
    this.paintVignette(ctx, width, height);
  }

  paintBackdrop(ctx, width, height, elapsed) {
    const shimmer = Math.sin(elapsed * 0.00055) * 0.04;
    const sky = ctx.createLinearGradient(0, 0, 0, height);

    sky.addColorStop(0, "#222434");
    sky.addColorStop(0.36 + shimmer, "#5a4632");
    sky.addColorStop(1, "#b17439");

    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = "#2b2622";
    ctx.beginPath();
    ctx.moveTo(0, height * 0.58);
    ctx.lineTo(width * 0.12, height * 0.52);
    ctx.lineTo(width * 0.28, height * 0.56);
    ctx.lineTo(width * 0.43, height * 0.49);
    ctx.lineTo(width * 0.58, height * 0.57);
    ctx.lineTo(width * 0.74, height * 0.51);
    ctx.lineTo(width, height * 0.59);
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = "#ffe2a2";
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i += 1) {
      const y = height * (0.42 + i * 0.042) + shimmer * 24;

      ctx.beginPath();
      ctx.moveTo(width * 0.14, y);
      ctx.lineTo(width * 0.88, y + i * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  paintWorld(ctx, world, hoveredTile, elapsed) {
    for (const tile of world.tilesByDrawOrder) {
      const point = gridToWorld(
        tile.column,
        tile.row,
        this.config.tileWidth,
        this.config.tileHeight,
      );

      this.tilePainter.paint(ctx, {
        tile,
        x: point.x,
        y: point.y,
        elapsed,
        isHovered: hoveredTile?.id === tile.id,
      });
    }
  }

  paintMovementRange(ctx, world, reachableTiles, selectedUnit) {
    if (!selectedUnit) {
      return;
    }

    ctx.save();

    for (const node of reachableTiles) {
      if (node.distance === 0) {
        continue;
      }

      const tile = world.getTile(node.column, node.row);
      const corners = this.getTileCorners(tile);
      const intensity = 1 - node.distance / (selectedUnit.moveRange + 1);

      ctx.fillStyle = `rgba(73, 215, 194, ${0.08 + intensity * 0.08})`;
      ctx.strokeStyle = `rgba(169, 255, 241, ${0.12 + intensity * 0.16})`;
      ctx.lineWidth = 1;
      drawDiamond(ctx, corners);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }

  paintMovementPath(ctx, world, movementPath) {
    if (!movementPath || movementPath.length < 2) {
      return;
    }

    const points = movementPath.map((step) => this.getTileCenter(world.getTile(step.column, step.row)));

    ctx.save();
    ctx.strokeStyle = "rgba(120, 255, 235, 0.95)";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = "rgba(73, 215, 194, 0.7)";
    ctx.shadowBlur = 7;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (const point of points.slice(1)) {
      ctx.lineTo(point.x, point.y);
    }

    ctx.stroke();
    this.paintArrowHead(ctx, points.at(-2), points.at(-1));
    ctx.restore();
  }

  paintArrowHead(ctx, from, to) {
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const size = 13;

    ctx.fillStyle = "rgba(120, 255, 235, 0.98)";
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(
      to.x - Math.cos(angle - 0.62) * size,
      to.y - Math.sin(angle - 0.62) * size,
    );
    ctx.lineTo(
      to.x - Math.cos(angle + 0.62) * size,
      to.y - Math.sin(angle + 0.62) * size,
    );
    ctx.closePath();
    ctx.fill();
  }

  paintUnits(ctx, world, units, selectedUnit, elapsed) {
    const sortedUnits = [...units].sort(
      (a, b) => a.visualColumn + a.visualRow - (b.visualColumn + b.visualRow),
    );

    for (const unit of sortedUnits) {
      const point = gridToWorld(
        unit.visualColumn,
        unit.visualRow,
        this.config.tileWidth,
        this.config.tileHeight,
      );
      const tile = world.getTile(Math.round(unit.visualColumn), Math.round(unit.visualRow));
      const elevation = tile?.elevation || 0;

      this.unitPainter.paint(ctx, {
        unit,
        x: point.x,
        y: point.y + this.config.tileHeight * 0.54 - elevation * 3,
        elapsed,
        isSelected: selectedUnit?.id === unit.id,
      });
    }
  }

  getTileCorners(tile) {
    const point = gridToWorld(
      tile.column,
      tile.row,
      this.config.tileWidth,
      this.config.tileHeight,
    );
    const y = point.y - tile.elevation * 3;
    const halfWidth = this.config.tileWidth / 2;
    const halfHeight = this.config.tileHeight / 2;

    return {
      top: { x: point.x, y },
      right: { x: point.x + halfWidth, y: y + halfHeight },
      bottom: { x: point.x, y: y + this.config.tileHeight },
      left: { x: point.x - halfWidth, y: y + halfHeight },
    };
  }

  getTileCenter(tile) {
    const point = gridToWorld(
      tile.column,
      tile.row,
      this.config.tileWidth,
      this.config.tileHeight,
    );

    return {
      x: point.x,
      y: point.y + this.config.tileHeight * 0.54 - tile.elevation * 3,
    };
  }

  paintVignette(ctx, width, height) {
    const gradient = ctx.createRadialGradient(
      width / 2,
      height * 0.52,
      Math.min(width, height) * 0.22,
      width / 2,
      height * 0.52,
      Math.max(width, height) * 0.72,
    );

    gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0.34)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  screenToWorld(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    return {
      x: (x - this.viewport.width / 2) / this.camera.zoom + this.camera.x,
      y: (y - this.viewport.height * 0.54) / this.camera.zoom + this.camera.y,
    };
  }

  worldToGrid(x, y) {
    return worldToGrid(x, y, this.config.tileWidth, this.config.tileHeight);
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
