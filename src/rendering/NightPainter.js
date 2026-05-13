import { gridToWorld } from "./isoMath.js";

const NIGHT_TINT = "rgba(8, 16, 38, ";
const NIGHT_SHADE = "rgba(2, 5, 14, ";
const CAMP_LIGHT = {
  outer: "rgba(255, 185, 92, ",
  inner: "rgba(255, 220, 132, ",
  stroke: "rgba(255, 218, 128, ",
};
const TORCH_LIGHT = {
  outer: "rgba(245, 164, 74, ",
  inner: "rgba(255, 214, 124, ",
  stroke: "rgba(255, 207, 104, ",
};

export class NightPainter {
  constructor(config) {
    this.config = config;
  }

  paintWorldShade(ctx, bounds, dayNight) {
    const night = dayNight?.nightAmount || 0;

    if (night <= 0.01) {
      return;
    }

    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = `${NIGHT_TINT}${0.31 * night})`;
    ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = `${NIGHT_SHADE}${0.08 * night})`;
    ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
    ctx.restore();
  }

  paintGroundLights(ctx, { units, campTile, dayNight, elapsed, visibleRect, campLightStrength = 1 }) {
    const night = dayNight?.nightAmount || 0;

    if (night <= 0.05) {
      return;
    }

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    if (campTile && campLightStrength > 0.05) {
      const campPoint = this.getTileGroundPoint(campTile);
      this.paintLightPool(ctx, {
        x: campPoint.x,
        y: campPoint.y + 8,
        radiusX: 118,
        radiusY: 48,
        night,
        elapsed,
        palette: CAMP_LIGHT,
        strength: campLightStrength,
      });
    }

    if (units?.length) {
      for (const unit of units) {
        if (!this.shouldPaintUnitLight(unit, visibleRect)) {
          continue;
        }

        const point = gridToWorld(
          unit.visualColumn,
          unit.visualRow,
          this.config.tileWidth,
          this.config.tileHeight,
        );

        this.paintLightPool(ctx, {
          x: point.x,
          y: point.y + this.config.tileHeight * 0.68,
          radiusX: 62,
          radiusY: 25,
          night,
          elapsed: elapsed + getLightSeed(unit) * 19,
          palette: TORCH_LIGHT,
          strength: 0.64,
        });
      }
    }

    ctx.restore();
  }

  paintLightPool(ctx, { x, y, radiusX, radiusY, night, elapsed, palette, strength }) {
    const pulse = getFirePulse(elapsed);
    const spread = 0.94 + pulse * 0.14;
    const rx = radiusX * spread;
    const ry = radiusY * (0.96 + pulse * 0.1);
    const alpha = night * strength * (0.62 + pulse * 0.54);

    ctx.fillStyle = `${palette.outer}${0.12 * alpha})`;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `${palette.inner}${0.13 * alpha})`;
    ctx.beginPath();
    ctx.ellipse(x, y - 1, rx * 0.58, ry * 0.52, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `${palette.stroke}${0.14 * alpha})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(x, y, rx * 0.74, ry * 0.68, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  shouldPaintUnitLight(unit, visibleRect) {
    if (unit.faction !== "player" || unit.defeated) {
      return false;
    }

    if (!visibleRect) {
      return true;
    }

    const point = gridToWorld(
      unit.visualColumn,
      unit.visualRow,
      this.config.tileWidth,
      this.config.tileHeight,
    );
    const padding = this.config.tileWidth * 2;

    return (
      point.x >= visibleRect.x - padding &&
      point.x <= visibleRect.x + visibleRect.width + padding &&
      point.y >= visibleRect.y - padding &&
      point.y <= visibleRect.y + visibleRect.height + padding
    );
  }

  getTileGroundPoint(tile) {
    const point = gridToWorld(
      tile.column,
      tile.row,
      this.config.tileWidth,
      this.config.tileHeight,
    );

    return {
      x: point.x,
      y: point.y + this.config.tileHeight * 0.5,
    };
  }
}

function getFirePulse(elapsed) {
  const slow = Math.sin(elapsed * 0.008) * 0.5 + 0.5;
  const fast = Math.sin(elapsed * 0.027 + 1.4) * 0.5 + 0.5;

  return Math.max(0, Math.min(1, slow * 0.68 + fast * 0.32));
}

function getLightSeed(unit) {
  const id = String(unit.id || `${unit.visualColumn}:${unit.visualRow}`);
  let seed = 0;

  for (let index = 0; index < id.length; index += 1) {
    seed += id.charCodeAt(index) * (index + 1);
  }

  return seed;
}
