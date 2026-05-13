import { DARK_PORTAL_ART } from "../content/objects/dark-portal/art.js";
import { getLoadedImage } from "../engine/assets/AssetLoader.js";
import { gridToWorld } from "./isoMath.js";

const DARK_PORTAL = DARK_PORTAL_ART.portal;
const TELEPORT_SHEET = DARK_PORTAL_ART.teleportSheet;
const INTRO_TELEPORT_START_MS = 520;
const INTRO_TELEPORT_INTERVAL_MS = 320;
const INTRO_TELEPORT_UNIT_MS = 900;

export class DarkPortalPainter {
  constructor(config) {
    this.config = config;
    this.darkPortalSprite = null;
    this.darkPortalOffSprite = null;
    this.teleportSheet = null;
  }

  setImageCache(imageCache) {
    this.darkPortalSprite = getLoadedImage(imageCache, DARK_PORTAL.src);
    this.darkPortalOffSprite = getLoadedImage(imageCache, DARK_PORTAL.offSrc);
    this.teleportSheet = getLoadedImage(imageCache, TELEPORT_SHEET.src);
  }

  paint(ctx, { portalTile, intro, elapsed }) {
    if (!portalTile) {
      return;
    }

    const point = this.getTileCenter(portalTile);
    const activation = getIntroPortalActivation(intro);

    this.paintGlow(ctx, point, elapsed, activation);

    if (this.darkPortalSprite || this.darkPortalOffSprite) {
      this.paintPortalSprite(ctx, point, elapsed, activation);
    } else {
      this.paintFallbackPortal(ctx, point, elapsed);
    }

    this.paintPortalBursts(ctx, point, intro, elapsed);
  }

  paintGlow(ctx, point, elapsed, activation) {
    if (activation <= 0) {
      return;
    }

    const pulse = Math.sin(elapsed * 0.006) * 0.5 + 0.5;
    const alpha = (0.09 + pulse * 0.05) * activation;

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    const glow = ctx.createRadialGradient(point.x, point.y, 8, point.x, point.y, this.config.tileWidth * 2.4);
    glow.addColorStop(0, `rgba(255, 86, 32, ${alpha})`);
    glow.addColorStop(0.38, `rgba(132, 15, 18, ${alpha * 0.44})`);
    glow.addColorStop(1, "rgba(132, 15, 18, 0)");

    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(point.x, point.y + 6, this.config.tileWidth * 2.2, this.config.tileHeight * 1.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  paintPortalSprite(ctx, point, elapsed, activation) {
    const base = this.darkPortalOffSprite || this.darkPortalSprite;
    const lit = this.darkPortalSprite || this.darkPortalOffSprite;
    const width = this.config.tileWidth * DARK_PORTAL.worldWidthTiles;
    const height = width * (base.naturalHeight / base.naturalWidth);
    const x = point.x - width * DARK_PORTAL.anchorX;
    const y = point.y - height * DARK_PORTAL.anchorY;

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(base, x, y, width, height);

    if (activation > 0 && lit !== base) {
      const pulse = Math.sin(elapsed * 0.026) * 0.5 + 0.5;

      ctx.globalAlpha = activation * (pulse > 0.52 ? 0.82 : 0.16);
      ctx.drawImage(lit, x, y, width, height);
    }

    ctx.restore();
  }

  paintFallbackPortal(ctx, point, elapsed) {
    const pulse = Math.sin(elapsed * 0.007) * 0.5 + 0.5;

    ctx.save();
    ctx.fillStyle = "rgba(17, 10, 12, 0.92)";
    ctx.strokeStyle = `rgba(218, 39, 31, ${0.48 + pulse * 0.24})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(point.x, point.y + 7, this.config.tileWidth * 1.5, this.config.tileHeight * 0.74, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  paintPortalBursts(ctx, point, intro, elapsed) {
    if (!intro?.active) {
      return;
    }

    const unitCount = intro.playerUnitIds?.length || 0;

    for (let index = 0; index < unitCount; index += 1) {
      const progress = getIntroTeleportBurstProgress(intro.elapsedMs, index);

      if (progress <= 0 || progress >= 1) {
        continue;
      }

      const arrival = intro.arrivals?.[index]?.tile;
      const burstPoint = arrival ? this.getTileCenter(arrival) : point;

      this.paintTeleportFrame(ctx, {
        x: burstPoint.x,
        y: burstPoint.y - 6,
        progress,
        elapsed: elapsed + index * 97,
        scale: 1,
        alpha: Math.sin(progress * Math.PI) * 0.48,
      });
    }
  }

  paintTeleportFrame(ctx, { x, y, progress, elapsed, scale = 1, alpha = 1 }) {
    const pulse = Math.sin(elapsed * 0.022) * 0.5 + 0.5;
    const width = this.config.tileWidth * 2.4 * scale;
    const height = width * (TELEPORT_SHEET.frameHeight / TELEPORT_SHEET.frameWidth);

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

    if (this.teleportSheet) {
      const frameIndex = Math.min(
        TELEPORT_SHEET.frameCount - 1,
        Math.max(0, Math.floor(progress * TELEPORT_SHEET.frameCount)),
      );
      const framesPerRow = Math.max(1, Math.floor(this.teleportSheet.naturalWidth / TELEPORT_SHEET.frameWidth));
      const sourceX = (frameIndex % framesPerRow) * TELEPORT_SHEET.frameWidth;
      const sourceY = Math.floor(frameIndex / framesPerRow) * TELEPORT_SHEET.frameHeight;

      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(
        this.teleportSheet,
        sourceX,
        sourceY,
        TELEPORT_SHEET.frameWidth,
        TELEPORT_SHEET.frameHeight,
        x - width / 2,
        y - height * 0.76,
        width,
        height,
      );
    } else {
      ctx.strokeStyle = `rgba(255, 95, 34, ${0.62 + pulse * 0.22})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(x, y, width * 0.32, height * 0.11, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
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
      y: point.y + this.config.tileHeight * 0.5,
    };
  }
}

export function getIntroTeleportUnitProgress(elapsedMs, index) {
  const startMs = getIntroTeleportUnitStartMs(index);

  return clamp01((elapsedMs - startMs) / INTRO_TELEPORT_UNIT_MS);
}

export function getIntroTeleportUnitStartMs(index) {
  return INTRO_TELEPORT_START_MS + index * INTRO_TELEPORT_INTERVAL_MS;
}

function getIntroTeleportBurstProgress(elapsedMs, index) {
  const startMs = INTRO_TELEPORT_START_MS + index * INTRO_TELEPORT_INTERVAL_MS - 160;

  return clamp01((elapsedMs - startMs) / (INTRO_TELEPORT_UNIT_MS + 120));
}

function getIntroPortalActivation(intro) {
  if (!intro?.active) {
    return 0;
  }

  const unitCount = intro.playerUnitIds?.length || 0;
  const lastIndex = Math.max(0, unitCount - 1);
  const startMs = INTRO_TELEPORT_START_MS - 220;
  const endMs = getIntroTeleportUnitStartMs(lastIndex) + INTRO_TELEPORT_UNIT_MS;

  if (intro.elapsedMs < startMs || intro.elapsedMs > endMs) {
    return 0;
  }

  const fadeIn = clamp01((intro.elapsedMs - startMs) / 260);
  const fadeOut = clamp01((endMs - intro.elapsedMs) / 280);

  return Math.min(fadeIn, fadeOut);
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}
