import { TilePainter } from "./TilePainter.js";
import { HerbPainter } from "./HerbPainter.js";
import { ResourceNodePainter } from "./ResourceNodePainter.js";
import { TreasurePainter } from "./TreasurePainter.js";
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
    this.herbPainter = new HerbPainter();
    this.resourceNodePainter = new ResourceNodePainter();
    this.treasurePainter = new TreasurePainter();
    this.unitPainter = new UnitPainter(config);
    this.terrainCache = null;
    this.fogCache = null;
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

  render({
    world,
    units,
    corpses,
    treasures,
    herbs,
    resourceNodes,
    fogOfWar,
    campTile,
    orderMarkers,
    hoveredTile,
    dayNight,
    elapsed,
  }) {
    const ctx = this.context;
    const { width, height, dpr } = this.viewport;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.paintBackdrop(ctx, width, height, elapsed, dayNight);

    ctx.save();
    ctx.translate(width / 2, height * 0.54);
    ctx.scale(this.camera.zoom, this.camera.zoom);
    ctx.translate(-this.camera.x, -this.camera.y);

    const visibleTiles = this.getVisibleTiles(world);

    this.paintWorld(ctx, world);
    this.paintResourceNodes(ctx, world, resourceNodes, elapsed);
    this.paintHerbs(ctx, world, herbs);
    this.paintTreasures(ctx, world, treasures, elapsed);
    this.paintCamp(ctx, campTile, elapsed);
    this.paintFog(ctx, world, fogOfWar, visibleTiles);
    this.paintHover(ctx, hoveredTile);
    this.paintOrderMarkers(ctx, world, orderMarkers, elapsed);
    this.paintCorpses(ctx, world, corpses, elapsed);
    this.paintUnits(ctx, world, units, elapsed);
    this.paintNightLayer(ctx, world, dayNight);

    ctx.restore();
    this.paintScreenNight(ctx, width, height, dayNight);
    this.paintVignette(ctx, width, height);
  }

  paintBackdrop(ctx, width, height, elapsed, dayNight) {
    const shimmer = Math.sin(elapsed * 0.00055) * 0.04;
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    const night = dayNight?.nightAmount || 0;

    sky.addColorStop(0, mixColor("#222434", "#071127", night));
    sky.addColorStop(0.36 + shimmer, mixColor("#5a4632", "#14213d", night));
    sky.addColorStop(1, mixColor("#b17439", "#27324d", night));

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

    ctx.globalAlpha = 0.16 + night * 0.18;
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

  paintNightLayer(ctx, world, dayNight) {
    const night = dayNight?.nightAmount || 0;

    if (night <= 0.01) {
      return;
    }

    const cache = this.getTerrainCache(world);

    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = `rgba(19, 33, 72, ${0.42 * night})`;
    ctx.fillRect(cache.bounds.x, cache.bounds.y, cache.bounds.width, cache.bounds.height);
    ctx.restore();
  }

  paintScreenNight(ctx, width, height, dayNight) {
    const night = dayNight?.nightAmount || 0;

    if (night <= 0.01) {
      return;
    }

    ctx.save();
    const glow = ctx.createRadialGradient(
      width * 0.72,
      height * 0.18,
      0,
      width * 0.72,
      height * 0.18,
      Math.max(width, height) * 0.72,
    );

    glow.addColorStop(0, `rgba(104, 144, 255, ${0.1 * night})`);
    glow.addColorStop(1, `rgba(4, 10, 26, ${0.28 * night})`);
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  paintWorld(ctx, world) {
    const cache = this.getTerrainCache(world);

    this.drawCacheSlice(ctx, cache);
  }

  async prepareWorld(world, fogOfWar, onProgress = () => {}) {
    const terrainWeight = 0.78;

    await this.prepareTerrainCache(world, (progress) => onProgress(progress * terrainWeight));
    await this.prepareFogCache(world, fogOfWar, (progress) =>
      onProgress(terrainWeight + progress * (1 - terrainWeight)),
    );
    onProgress(1);
  }

  async prepareTerrainCache(world, onProgress) {
    const key = this.getTerrainCacheKey(world);

    if (this.terrainCache?.key === key) {
      onProgress(1);
      return;
    }

    const surface = this.createTerrainSurface(world);
    const tiles = world.tilesByDrawOrder;
    let index = 0;

    await runChunkedWork((deadlineMs) => {
      while (index < tiles.length && performance.now() < deadlineMs) {
        this.paintTerrainTile(surface.ctx, tiles[index]);
        index += 1;
      }

      onProgress(index / tiles.length);
      return index >= tiles.length;
    });

    this.terrainCache = {
      canvas: surface.canvas,
      bounds: surface.bounds,
      key,
    };
  }

  createTerrainSurface(world) {
    const bounds = getWorldBounds(world, this.config);
    const canvas = document.createElement("canvas");

    canvas.width = bounds.width;
    canvas.height = bounds.height;

    const ctx = canvas.getContext("2d");

    ctx.translate(-bounds.x, -bounds.y);

    return {
      canvas,
      bounds,
      ctx,
    };
  }

  renderTerrainToCache(world) {
    const surface = this.createTerrainSurface(world);

    for (const tile of world.tilesByDrawOrder) {
      this.paintTerrainTile(surface.ctx, tile);
    }

    return {
      canvas: surface.canvas,
      bounds: surface.bounds,
      key: this.getTerrainCacheKey(world),
    };
  }

  paintTerrainTile(ctx, tile) {
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
      elapsed: 0,
      isHovered: false,
    });
  }

  getTerrainCache(world) {
    const key = this.getTerrainCacheKey(world);

    if (!this.terrainCache || this.terrainCache.key !== key) {
      this.terrainCache = this.renderTerrainToCache(world);
    }

    return this.terrainCache;
  }

  getTerrainCacheKey(world) {
    return `${world.seed}:${world.columns}x${world.rows}:${this.config.tileWidth}:${this.config.tileHeight}`;
  }

  paintHover(ctx, hoveredTile) {
    if (!hoveredTile) {
      return;
    }

    const corners = this.getTileCorners(hoveredTile);

    ctx.save();
    ctx.fillStyle = "rgba(73, 215, 194, 0.16)";
    ctx.strokeStyle = "rgba(169, 255, 241, 0.88)";
    ctx.lineWidth = 1.6;
    drawDiamond(ctx, corners);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  paintCamp(ctx, campTile, elapsed) {
    if (!campTile) {
      return;
    }

    const point = this.getTileCenter(campTile);
    const flame = 1 + Math.sin(elapsed * 0.01) * 0.16;

    ctx.save();
    ctx.fillStyle = "rgba(33, 21, 12, 0.32)";
    ctx.beginPath();
    ctx.ellipse(point.x, point.y + 8, 28, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#6c442d";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(point.x - 18, point.y + 7);
    ctx.lineTo(point.x + 18, point.y - 2);
    ctx.moveTo(point.x - 15, point.y - 3);
    ctx.lineTo(point.x + 16, point.y + 8);
    ctx.stroke();

    ctx.fillStyle = "#f3d35f";
    ctx.beginPath();
    ctx.moveTo(point.x, point.y - 29 * flame);
    ctx.bezierCurveTo(point.x - 16, point.y - 12, point.x - 8, point.y + 5, point.x, point.y + 3);
    ctx.bezierCurveTo(point.x + 13, point.y - 8, point.x + 11, point.y - 20, point.x, point.y - 29 * flame);
    ctx.fill();

    ctx.fillStyle = "#e76537";
    ctx.beginPath();
    ctx.moveTo(point.x + 1, point.y - 21 * flame);
    ctx.bezierCurveTo(point.x - 8, point.y - 8, point.x - 4, point.y + 3, point.x + 1, point.y + 1);
    ctx.bezierCurveTo(point.x + 9, point.y - 8, point.x + 7, point.y - 16, point.x + 1, point.y - 21 * flame);
    ctx.fill();
    ctx.restore();
  }

  paintOrderMarkers(ctx, world, orderMarkers, elapsed) {
    if (!orderMarkers || orderMarkers.length === 0) {
      return;
    }

    ctx.save();

    for (const marker of orderMarkers) {
      const tile = world.getTile(marker.column, marker.row);
      const point = this.getTileCenter(tile);
      const bob = Math.sin(elapsed * 0.006 + marker.column) * 2;

      this.paintMarkerIcon(ctx, marker.type, point.x, point.y - 28 + bob);
    }

    ctx.restore();
  }

  paintMarkerIcon(ctx, type, x, y) {
    ctx.save();
    ctx.fillStyle = getMarkerBackground(type);
    ctx.strokeStyle = "rgba(255, 244, 214, 0.75)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x - 15, y - 13, 30, 26, 8);
    ctx.fill();
    ctx.stroke();

    if (type === "eye") {
      ctx.fillStyle = "#d7fff6";
      ctx.beginPath();
      ctx.ellipse(x, y, 10, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#173e42";
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === "herb") {
      ctx.strokeStyle = "#cce68a";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      for (let i = 0; i < 5; i += 1) {
        const angle = -Math.PI / 2 + (i - 2) * 0.28;

        ctx.beginPath();
        ctx.moveTo(x, y + 7);
        ctx.lineTo(x + Math.cos(angle) * 10, y + 7 + Math.sin(angle) * 13);
        ctx.stroke();
      }
    } else if (type === "fish") {
      ctx.fillStyle = "#8fe8ef";
      ctx.beginPath();
      ctx.ellipse(x, y, 8, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x - 7, y);
      ctx.lineTo(x - 13, y - 5);
      ctx.lineTo(x - 12, y + 5);
      ctx.closePath();
      ctx.fill();
    } else if (type === "berries") {
      ctx.fillStyle = "#85ba68";
      ctx.beginPath();
      ctx.arc(x - 3, y, 5, 0, Math.PI * 2);
      ctx.arc(x + 4, y - 2, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e0527e";
      ctx.beginPath();
      ctx.arc(x - 4, y - 2, 2, 0, Math.PI * 2);
      ctx.arc(x + 3, y + 1, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === "wood") {
      ctx.strokeStyle = "#d79a50";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x - 9, y + 4);
      ctx.lineTo(x + 8, y - 5);
      ctx.moveTo(x - 6, y - 3);
      ctx.lineTo(x + 10, y + 4);
      ctx.stroke();
    } else if (type === "rock") {
      ctx.fillStyle = "#bac7c0";
      ctx.beginPath();
      ctx.ellipse(x - 4, y + 2, 6, 4.6, -0.2, 0, Math.PI * 2);
      ctx.ellipse(x + 5, y + 1, 6.5, 5, 0.24, 0, Math.PI * 2);
      ctx.ellipse(x + 1, y - 5, 5.5, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#59616f";
      ctx.beginPath();
      ctx.ellipse(x - 1, y + 5, 7, 4, 0.12, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = "#f3d35f";
      ctx.fillRect(x - 8, y - 5, 16, 10);
      ctx.fillStyle = "#7b4828";
      ctx.fillRect(x - 9, y - 2, 18, 5);
      ctx.fillStyle = "#fff0a6";
      ctx.fillRect(x - 1, y - 7, 3, 14);
    }

    ctx.restore();
  }

  paintUnits(ctx, world, units, elapsed) {
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
      this.unitPainter.paint(ctx, {
        unit,
        x: point.x,
        y: point.y + this.config.tileHeight * 0.5,
        elapsed,
      });
    }
  }

  paintCorpses(ctx, world, corpses = [], elapsed) {
    const sortedCorpses = [...corpses].sort(
      (a, b) => a.visualColumn + a.visualRow - (b.visualColumn + b.visualRow),
    );

    for (const corpse of sortedCorpses) {
      const point = gridToWorld(
        corpse.visualColumn,
        corpse.visualRow,
        this.config.tileWidth,
        this.config.tileHeight,
      );

      this.unitPainter.paintCorpse(ctx, {
        corpse,
        x: point.x,
        y: point.y + this.config.tileHeight * 0.5,
        elapsed,
      });
    }
  }

  paintTreasures(ctx, world, treasures, elapsed) {
    for (const treasure of treasures) {
      if (treasure.status === "carried") {
        continue;
      }

      const tile = world.getTile(treasure.column, treasure.row);
      const point = this.getTileCenter(tile);

      this.treasurePainter.paint(ctx, {
        x: point.x,
        y: point.y,
        elapsed,
      });
    }
  }

  paintHerbs(ctx, world, herbs) {
    for (const herb of herbs) {
      const tile = world.getTile(herb.column, herb.row);
      const point = this.getTileCenter(tile);

      this.herbPainter.paint(ctx, {
        x: point.x,
        y: point.y,
        loadsRemaining: herb.loadsRemaining,
      });
    }
  }

  paintResourceNodes(ctx, world, resourceNodes, elapsed) {
    if (!resourceNodes) {
      return;
    }

    for (const node of resourceNodes) {
      const tile = world.getTile(node.column, node.row);
      const point = this.getTileCenter(tile);

      this.resourceNodePainter.paint(ctx, {
        node,
        x: point.x,
        y: point.y,
        elapsed,
      });
    }
  }

  paintFog(ctx, world, fogOfWar, visibleTiles) {
    if (!fogOfWar) {
      return;
    }

    const cache = this.getFogCache(world, fogOfWar, visibleTiles);

    this.drawCacheSlice(ctx, cache);
  }

  async prepareFogCache(world, fogOfWar, onProgress) {
    const terrainCache = this.getTerrainCache(world);
    const key = `${terrainCache.key}:${fogOfWar.version}`;

    if (this.fogCache?.baseKey === terrainCache.key) {
      onProgress(1);
      return;
    }

    const canvas = document.createElement("canvas");

    canvas.width = terrainCache.bounds.width;
    canvas.height = terrainCache.bounds.height;

    const ctx = canvas.getContext("2d");

    ctx.translate(-terrainCache.bounds.x, -terrainCache.bounds.y);

    let index = 0;
    const tiles = world.tilesByDrawOrder;

    await runChunkedWork((deadlineMs) => {
      while (index < tiles.length && performance.now() < deadlineMs) {
        const tile = tiles[index];

        if (!fogOfWar.isRevealed(tile)) {
          this.paintFogTile(ctx, tile);
        }

        index += 1;
      }

      onProgress(index / tiles.length);
      return index >= tiles.length;
    });

    fogOfWar.consumeChangedTiles();
    this.fogCache = {
      canvas,
      bounds: terrainCache.bounds,
      key,
      baseKey: terrainCache.key,
      version: fogOfWar.version,
    };
  }

  getFogCache(world, fogOfWar, visibleTiles) {
    const terrainCache = this.getTerrainCache(world);
    const key = `${terrainCache.key}:${fogOfWar.version}`;

    if (!this.fogCache || this.fogCache.baseKey !== terrainCache.key) {
      const canvas = document.createElement("canvas");

      canvas.width = terrainCache.bounds.width;
      canvas.height = terrainCache.bounds.height;

      const ctx = canvas.getContext("2d");

      ctx.translate(-terrainCache.bounds.x, -terrainCache.bounds.y);

      for (const tile of world.tilesByDrawOrder) {
        if (!fogOfWar.isRevealed(tile)) {
          this.paintFogTile(ctx, tile);
        }
      }

      this.fogCache = {
        canvas,
        bounds: terrainCache.bounds,
        key,
        baseKey: terrainCache.key,
        version: fogOfWar.version,
      };
      fogOfWar.consumeChangedTiles();
      return this.fogCache;
    }

    const changedTiles = fogOfWar.consumeChangedTiles();

    if (changedTiles.length > 0) {
      this.clearRevealedFogTiles(changedTiles);
    }

    this.fogCache.key = key;
    this.fogCache.version = fogOfWar.version;

    return this.fogCache;
  }

  clearRevealedFogTiles(tiles) {
    const cache = this.fogCache;
    const ctx = cache.canvas.getContext("2d");

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.translate(-cache.bounds.x, -cache.bounds.y);
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "#000";

    for (const tile of tiles) {
      drawDiamond(ctx, this.getTileCorners(tile, 1.5));
      ctx.fill();
    }

    ctx.restore();
  }

  paintFogTile(ctx, tile) {
    const corners = this.getTileCorners(tile);

    ctx.fillStyle = "rgba(45, 55, 60, 0.28)";
    ctx.strokeStyle = "rgba(181, 214, 210, 0.08)";
    ctx.lineWidth = 1;
    drawDiamond(ctx, corners);
    ctx.fill();
    ctx.stroke();
  }

  drawCacheSlice(ctx, cache) {
    const rect = this.getVisibleWorldRect(this.config.tileWidth * 3);
    const sourceX = Math.max(0, Math.floor(rect.x - cache.bounds.x));
    const sourceY = Math.max(0, Math.floor(rect.y - cache.bounds.y));
    const sourceRight = Math.min(cache.canvas.width, Math.ceil(rect.x + rect.width - cache.bounds.x));
    const sourceBottom = Math.min(cache.canvas.height, Math.ceil(rect.y + rect.height - cache.bounds.y));
    const sourceWidth = sourceRight - sourceX;
    const sourceHeight = sourceBottom - sourceY;

    if (sourceWidth <= 0 || sourceHeight <= 0) {
      return;
    }

    ctx.drawImage(
      cache.canvas,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      cache.bounds.x + sourceX,
      cache.bounds.y + sourceY,
      sourceWidth,
      sourceHeight,
    );
  }

  getVisibleWorldRect(padding = 0) {
    const zoom = Math.max(this.camera.zoom, 0.001);
    const { width, height } = this.viewport;

    return {
      x: this.camera.x - width / (2 * zoom) - padding,
      y: this.camera.y - (height * 0.54) / zoom - padding,
      width: width / zoom + padding * 2,
      height: height / zoom + padding * 2,
    };
  }

  getVisibleTiles(world) {
    const rect = this.getVisibleWorldRect(this.config.tileWidth * 2);
    const corners = [
      worldToGrid(rect.x, rect.y, this.config.tileWidth, this.config.tileHeight),
      worldToGrid(rect.x + rect.width, rect.y, this.config.tileWidth, this.config.tileHeight),
      worldToGrid(rect.x, rect.y + rect.height, this.config.tileWidth, this.config.tileHeight),
      worldToGrid(rect.x + rect.width, rect.y + rect.height, this.config.tileWidth, this.config.tileHeight),
    ];
    const minColumn = clampInt(Math.floor(Math.min(...corners.map((corner) => corner.column))) - 4, 0, world.columns - 1);
    const maxColumn = clampInt(Math.ceil(Math.max(...corners.map((corner) => corner.column))) + 4, 0, world.columns - 1);
    const minRow = clampInt(Math.floor(Math.min(...corners.map((corner) => corner.row))) - 4, 0, world.rows - 1);
    const maxRow = clampInt(Math.ceil(Math.max(...corners.map((corner) => corner.row))) + 4, 0, world.rows - 1);
    const tiles = [];

    for (let row = minRow; row <= maxRow; row += 1) {
      for (let column = minColumn; column <= maxColumn; column += 1) {
        const tile = world.getTile(column, row);

        if (tile) {
          tiles.push(tile);
        }
      }
    }

    return tiles.sort((a, b) => a.column + a.row - (b.column + b.row));
  }

  getTileCorners(tile, inflate = 0) {
    const point = gridToWorld(
      tile.column,
      tile.row,
      this.config.tileWidth,
      this.config.tileHeight,
    );
    const y = point.y;
    const halfWidth = this.config.tileWidth / 2 + inflate;
    const halfHeight = this.config.tileHeight / 2 + inflate;

    return {
      top: { x: point.x, y: y - inflate },
      right: { x: point.x + halfWidth, y: y + halfHeight },
      bottom: { x: point.x, y: y + this.config.tileHeight + inflate },
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
      y: point.y + this.config.tileHeight * 0.5,
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

function getMarkerBackground(type) {
  if (type === "eye") {
    return "rgba(42, 60, 66, 0.9)";
  }

  if (type === "herb") {
    return "rgba(35, 67, 35, 0.92)";
  }

  if (type === "fish") {
    return "rgba(18, 72, 84, 0.92)";
  }

  if (type === "berries") {
    return "rgba(75, 38, 56, 0.92)";
  }

  if (type === "wood") {
    return "rgba(79, 44, 24, 0.92)";
  }

  if (type === "rock") {
    return "rgba(62, 65, 69, 0.92)";
  }

  return "rgba(74, 48, 20, 0.92)";
}

function mixColor(fromHex, toHex, amount) {
  const from = parseHex(fromHex);
  const to = parseHex(toHex);
  const mix = (start, end) => Math.round(start + (end - start) * amount);

  return `rgb(${mix(from.r, to.r)}, ${mix(from.g, to.g)}, ${mix(from.b, to.b)})`;
}

function parseHex(hex) {
  const color = hex.replace("#", "");
  const number = Number.parseInt(color, 16);

  return {
    r: (number >> 16) & 255,
    g: (number >> 8) & 255,
    b: number & 255,
  };
}

function drawDiamond(ctx, corners) {
  ctx.beginPath();
  ctx.moveTo(corners.top.x, corners.top.y);
  ctx.lineTo(corners.right.x, corners.right.y);
  ctx.lineTo(corners.bottom.x, corners.bottom.y);
  ctx.lineTo(corners.left.x, corners.left.y);
  ctx.closePath();
}

function getWorldBounds(world, config) {
  const halfWidth = config.tileWidth / 2;
  const minX = -world.rows * halfWidth - config.tileWidth;
  const maxX = world.columns * halfWidth + config.tileWidth;
  const minY = -config.tileHeight;
  const maxY = (world.columns + world.rows) * (config.tileHeight / 2) + config.tileHeight * 2;

  return {
    x: Math.floor(minX),
    y: Math.floor(minY),
    width: Math.ceil(maxX - minX),
    height: Math.ceil(maxY - minY),
  };
}

function runChunkedWork(work) {
  return new Promise((resolve) => {
    const schedule = () => {
      const run = (deadline) => {
        const start = performance.now();
        const idleTime = typeof deadline?.timeRemaining === "function" ? deadline.timeRemaining() : 0;
        const budget = Math.max(6, Math.min(12, idleTime || 8));
        const isDone = work(start + budget);

        if (isDone) {
          resolve();
          return;
        }

        requestAnimationFrame(schedule);
      };

      if (typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(run, { timeout: 60 });
      } else {
        requestAnimationFrame(() => run(null));
      }
    };

    schedule();
  });
}

function clampInt(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
