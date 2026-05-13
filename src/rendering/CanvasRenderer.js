import { TilePainter } from "./TilePainter.js";
import { HerbPainter } from "./HerbPainter.js";
import { ResourceNodePainter } from "./ResourceNodePainter.js";
import { TreasurePainter } from "./TreasurePainter.js";
import { UnitPainter } from "./UnitPainter.js";
import { NightPainter } from "./NightPainter.js";
import {
  DarkPortalPainter,
  getIntroTeleportUnitProgress,
  getIntroTeleportUnitStartMs,
} from "./DarkPortalPainter.js";
import { FIRECAMP_ART } from "../content/objects/firecamp/art.js";
import { getLoadedImage } from "../engine/assets/AssetLoader.js";
import { gridToWorld, worldToGrid } from "./isoMath.js";

const FIRECAMP_SPRITE_SRC = FIRECAMP_ART.fireplace;
const FIRECAMP_UNLIT_SRC = FIRECAMP_ART.fireplaceUnlit;
const FIRECAMP_SHEET = FIRECAMP_ART.fireplaceSheet;
const TREE_OCCLUDED_ALPHA = 0.68;
const TREE_OCCLUSION_MIN_ZOOM = 0.72;

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
    this.nightPainter = new NightPainter(config);
    this.darkPortalPainter = new DarkPortalPainter(config);
    this.firecampSprite = null;
    this.firecampUnlitSprite = null;
    this.firecampSheet = null;
    this.terrainCache = null;
    this.structureCache = null;
    this.fogCache = null;
    this.visibleTiles = [];
    this.visibleRenderables = [];
    this.visibleUnitRenderables = [];
    this.renderablePool = [];
    this.fogRevealBrush = null;
    this.fogRevealBrushKey = "";
  }

  setImageCache(imageCache) {
    this.imageCache = imageCache;
    this.firecampSprite = getLoadedImage(imageCache, FIRECAMP_SPRITE_SRC);
    this.firecampUnlitSprite = getLoadedImage(imageCache, FIRECAMP_UNLIT_SRC);
    this.firecampSheet = getLoadedImage(imageCache, FIRECAMP_SHEET.src);
    this.darkPortalPainter.setImageCache(imageCache);
    this.tilePainter.setImageCache(imageCache);
    this.herbPainter.setImageCache(imageCache);
    this.resourceNodePainter.setImageCache(imageCache);
    this.unitPainter.setImageCache(imageCache);
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
    portalTile,
    orderMarkers,
    hoveredTile,
    dayNight,
    elapsed,
    intro,
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
    const dynamicRect = this.getVisibleWorldRect(this.config.tileWidth * 2.5);

    this.paintWorld(ctx, world);
    this.paintStructures(ctx, world);
    this.paintConstructions(ctx, visibleTiles, elapsed);
    this.darkPortalPainter.paint(ctx, { portalTile, intro, elapsed });
    this.paintCamp(ctx, campTile, elapsed, intro);
    this.paintDynamicEntities(ctx, {
      visibleTiles,
      units,
      corpses,
      treasures,
      herbs,
      resourceNodes,
      elapsed,
      dayNight,
      intro,
      portalTile,
      visibleRect: dynamicRect,
    });
    this.paintFog(ctx, world, fogOfWar, visibleTiles);
    this.paintHover(ctx, hoveredTile);
    this.paintOrderMarkers(ctx, world, orderMarkers, elapsed);
    this.paintNightLayer(ctx, world, dayNight);
    this.paintGroundLights(ctx, {
      units,
      campTile,
      dayNight,
      elapsed,
      visibleRect: dynamicRect,
      campLightStrength: getIntroFireProgress(intro),
    });

    ctx.restore();
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

    this.nightPainter.paintWorldShade(ctx, cache.bounds, dayNight);
  }

  paintGroundLights(ctx, options) {
    this.nightPainter.paintGroundLights(ctx, options);
  }

  paintWorld(ctx, world) {
    const cache = this.getTerrainCache(world);

    this.drawCacheSlice(ctx, cache);
  }

  paintStructures(ctx, world) {
    const cache = this.getStructureCache(world);

    this.drawCacheSlice(ctx, cache);
  }

  paintConstructions(ctx, visibleTiles, elapsed) {
    for (const tile of visibleTiles) {
      if (!tile.construction) {
        continue;
      }

      const point = this.getTileCenter(tile);
      const progress = 1 - tile.construction.remainingMs / tile.construction.durationMs;
      const hammer = Math.sin(elapsed * 0.014 + tile.seed) * 3;

      ctx.save();
      ctx.fillStyle = "rgba(24, 15, 10, 0.34)";
      ctx.beginPath();
      ctx.ellipse(point.x + 2, point.y + 10, 30, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#8c6740";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(point.x - 18, point.y + 7);
      ctx.lineTo(point.x - 18, point.y - 8 - progress * 22);
      ctx.moveTo(point.x + 18, point.y + 7);
      ctx.lineTo(point.x + 18, point.y - 8 - progress * 22);
      ctx.moveTo(point.x - 24, point.y - 6 - progress * 14);
      ctx.lineTo(point.x + 24, point.y - 6 - progress * 14);
      ctx.stroke();

      ctx.strokeStyle = "#ffe28e";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(point.x - 20, point.y + 13);
      ctx.lineTo(point.x - 20 + progress * 40, point.y + 13);
      ctx.stroke();

      ctx.strokeStyle = "#d9ad78";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(point.x + 8, point.y - 18 + hammer);
      ctx.lineTo(point.x + 19, point.y - 27 + hammer);
      ctx.moveTo(point.x + 14, point.y - 30 + hammer);
      ctx.lineTo(point.x + 24, point.y - 20 + hammer);
      ctx.stroke();

      for (let i = 0; i < 3; i += 1) {
        const smokeAge = (elapsed * 0.00045 + i * 0.33 + tile.seed) % 1;
        const smokeY = point.y - 16 - smokeAge * 42;
        const smokeX = point.x - 10 + i * 10 + Math.sin(elapsed * 0.002 + i) * 5;

        ctx.fillStyle = `rgba(219, 210, 190, ${(1 - smokeAge) * 0.32})`;
        ctx.beginPath();
        ctx.arc(smokeX, smokeY, 5 + smokeAge * 9, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  async prepareWorld(world, fogOfWar, onProgress = () => {}) {
    const terrainWeight = 0.78;

    await this.prepareTerrainCache(world, (progress) => onProgress(progress * terrainWeight));
    this.prepareStructureCache(world);
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
    world.consumeDirtyTerrainTiles?.();
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

    this.tilePainter.paintTerrain(ctx, {
      tile,
      x: point.x,
      y: point.y,
      elapsed: 0,
    });
  }

  getTerrainCache(world) {
    const key = this.getTerrainCacheKey(world);

    if (!this.terrainCache || this.terrainCache.key !== key) {
      this.terrainCache = this.renderTerrainToCache(world);
      world.consumeDirtyTerrainTiles?.();
      return this.terrainCache;
    }

    const dirtyTiles = world.consumeDirtyTerrainTiles?.() || [];

    if (dirtyTiles.length > 0) {
      this.patchTerrainCache(world, dirtyTiles);
    }

    return this.terrainCache;
  }

  getTerrainCacheKey(world) {
    return `${world.seed}:${world.columns}x${world.rows}:${this.config.tileWidth}:${this.config.tileHeight}`;
  }

  prepareStructureCache(world) {
    const cache = this.renderStructureCache(world);

    this.structureCache = cache;
    world.consumeDirtyStructureTiles?.();
  }

  renderStructureCache(world) {
    const surface = this.createTerrainSurface(world);

    for (const tile of world.tilesByDrawOrder) {
      this.paintStructureTile(surface.ctx, tile);
    }

    return {
      canvas: surface.canvas,
      bounds: surface.bounds,
      key: this.getStructureCacheKey(world),
    };
  }

  paintStructureTile(ctx, tile) {
    const point = gridToWorld(
      tile.column,
      tile.row,
      this.config.tileWidth,
      this.config.tileHeight,
    );

    this.tilePainter.paintStructure(ctx, {
      tile,
      x: point.x,
      y: point.y,
      elapsed: 0,
    });
  }

  getStructureCache(world) {
    const key = this.getStructureCacheKey(world);

    if (!this.structureCache || this.structureCache.key !== key) {
      this.structureCache = this.renderStructureCache(world);
      world.consumeDirtyStructureTiles?.();
      return this.structureCache;
    }

    const dirtyTiles = world.consumeDirtyStructureTiles?.() || [];

    if (dirtyTiles.length > 0) {
      this.patchStructureCache(world, dirtyTiles);
    }

    return this.structureCache;
  }

  getStructureCacheKey(world) {
    return `${world.seed}:${world.columns}x${world.rows}:${this.config.tileWidth}:${this.config.tileHeight}`;
  }

  patchTerrainCache(world, dirtyTiles) {
    this.patchTileCache({
      cache: this.terrainCache,
      dirtyTiles: this.expandDirtyTiles(world, dirtyTiles, 2),
      paintTile: (ctx, tile) => this.paintTerrainTile(ctx, tile),
    });
    this.structureCache = null;
    world.touchStructureTiles?.(dirtyTiles);
  }

  patchStructureCache(world, dirtyTiles) {
    this.patchTileCache({
      cache: this.structureCache,
      dirtyTiles: this.expandDirtyTiles(world, dirtyTiles, 2),
      paintTile: (ctx, tile) => this.paintStructureTile(ctx, tile),
    });
  }

  expandDirtyTiles(world, dirtyTiles, radius) {
    const expanded = new Map();

    for (const tile of dirtyTiles) {
      for (let row = tile.row - radius; row <= tile.row + radius; row += 1) {
        for (let column = tile.column - radius; column <= tile.column + radius; column += 1) {
          const candidate = world.getTile(column, row);

          if (candidate) {
            expanded.set(candidate.id, candidate);
          }
        }
      }
    }

    return [...expanded.values()];
  }

  patchTileCache({ cache, dirtyTiles, paintTile }) {
    const ctx = cache.canvas.getContext("2d");
    const orderedTiles = [...dirtyTiles].sort((a, b) => a.column + a.row - (b.column + b.row));

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.translate(-cache.bounds.x, -cache.bounds.y);

    for (const tile of orderedTiles) {
      const rect = this.getTilePatchRect(tile);

      ctx.clearRect(rect.x, rect.y, rect.width, rect.height);
    }

    for (const tile of orderedTiles) {
      paintTile(ctx, tile);
    }

    ctx.restore();
  }

  getTilePatchRect(tile) {
    const point = gridToWorld(
      tile.column,
      tile.row,
      this.config.tileWidth,
      this.config.tileHeight,
    );
    const paddingX = 18;
    const topPadding = 48;
    const bottomPadding = 34;

    return {
      x: point.x - this.config.tileWidth / 2 - paddingX,
      y: point.y - topPadding,
      width: this.config.tileWidth + paddingX * 2,
      height: this.config.tileHeight + topPadding + bottomPadding,
    };
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

  paintCamp(ctx, campTile, elapsed, intro) {
    if (!campTile) {
      return;
    }

    const point = this.getTileCenter(campTile);
    const fireProgress = getIntroFireProgress(intro);
    const isUnlit = intro?.active && fireProgress <= 0;

    if (isUnlit) {
      if (this.firecampUnlitSprite) {
        this.paintFirecampSprite(ctx, point, this.firecampUnlitSprite, 1);
      } else {
        this.paintProceduralCampUnlit(ctx, point);
      }
      return;
    }

    if (intro?.active && fireProgress < 1) {
      if (this.firecampUnlitSprite) {
        this.paintFirecampSprite(ctx, point, this.firecampUnlitSprite, 1);
      } else {
        this.paintProceduralCampUnlit(ctx, point);
      }
      this.paintCampFireStartingEffect(ctx, point, elapsed, fireProgress);
      return;
    }

    if (this.firecampSheet) {
      this.paintFirecampSheet(ctx, point, elapsed, 0.78);
      return;
    }

    if (this.firecampSprite) {
      this.paintFirecampSprite(ctx, point, this.firecampSprite, 0.86);
      return;
    }

    this.paintProceduralCamp(ctx, point, elapsed, 0.82);
  }

  paintFirecampSheet(ctx, point, elapsed, alpha = 1) {
    const width = this.config.tileWidth * 3;
    const height = this.config.tileHeight * 3;
    const frameIndex = Math.floor(elapsed / FIRECAMP_SHEET.frameDurationMs) % FIRECAMP_SHEET.frameCount;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      this.firecampSheet,
      frameIndex * FIRECAMP_SHEET.frameWidth,
      0,
      FIRECAMP_SHEET.frameWidth,
      FIRECAMP_SHEET.frameHeight,
      point.x - width / 2,
      point.y - height / 2,
      width,
      height,
    );
    ctx.restore();
  }

  paintFirecampSprite(ctx, point, image = this.firecampSprite, alpha = 1) {
    if (!image) {
      return;
    }

    const width = this.config.tileWidth * 3;
    const height = this.config.tileHeight * 3;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, point.x - width / 2, point.y - height / 2, width, height);
    ctx.restore();
  }

  paintProceduralCamp(ctx, point, elapsed, alpha = 1) {
    const flame = 1 + Math.sin(elapsed * 0.01) * 0.16;

    ctx.save();
    ctx.globalAlpha = alpha;
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

  paintProceduralCampUnlit(ctx, point) {
    ctx.save();
    ctx.fillStyle = "rgba(33, 21, 12, 0.32)";
    ctx.beginPath();
    ctx.ellipse(point.x, point.y + 8, 28, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#5a3a27";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(point.x - 18, point.y + 7);
    ctx.lineTo(point.x + 18, point.y - 2);
    ctx.moveTo(point.x - 15, point.y - 3);
    ctx.lineTo(point.x + 16, point.y + 8);
    ctx.stroke();
    ctx.restore();
  }

  paintCampFireStartingEffect(ctx, point, elapsed, progress) {
    const pulse = Math.sin(elapsed * 0.019) * 0.5 + 0.5;
    const strength = Math.sin(progress * Math.PI * 0.5);

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = (0.16 + pulse * 0.14) * strength;

    for (let i = 0; i < 8; i += 1) {
      const age = (progress + i * 0.13) % 1;
      const x = point.x - 14 + i * 4 + Math.sin(elapsed * 0.006 + i) * 3;
      const y = point.y + 4 - age * 34;
      const radius = 1.5 + age * 3.5;

      ctx.fillStyle = i % 2 ? "#ffb34b" : "#ff5b2b";
      ctx.beginPath();
      ctx.ellipse(x, y, radius, radius * 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
    }

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
    } else if (type === "rest") {
      ctx.strokeStyle = "#a9f06f";
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(x, y + 1, 7, 0.15, Math.PI * 1.85);
      ctx.moveTo(x - 5, y + 1);
      ctx.lineTo(x + 5, y + 1);
      ctx.moveTo(x, y - 4);
      ctx.lineTo(x, y + 6);
      ctx.stroke();
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
    } else if (type === "meat") {
      ctx.fillStyle = "#d94e3f";
      ctx.beginPath();
      ctx.ellipse(x - 2, y + 2, 8, 6, -0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff0c6";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x + 4, y - 2);
      ctx.lineTo(x + 12, y - 9);
      ctx.stroke();
    } else if (type === "question") {
      ctx.fillStyle = "#ffe28e";
      ctx.font = "900 18px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("?", x, y + 1);
    } else if (type === "build") {
      ctx.strokeStyle = "#f4db9a";
      ctx.lineWidth = 2.4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x - 9, y + 7);
      ctx.lineTo(x, y - 7);
      ctx.lineTo(x + 9, y + 7);
      ctx.moveTo(x - 5, y + 7);
      ctx.lineTo(x + 5, y + 7);
      ctx.stroke();
    } else if (type === "clean") {
      ctx.strokeStyle = "#f4db9a";
      ctx.lineWidth = 2.4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x - 7, y + 6);
      ctx.lineTo(x + 6, y - 7);
      ctx.moveTo(x + 2, y - 8);
      ctx.lineTo(x + 9, y - 1);
      ctx.moveTo(x - 9, y + 6);
      ctx.lineTo(x - 3, y + 11);
      ctx.stroke();
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

  paintDynamicEntities(ctx, {
    visibleTiles = [],
    units = [],
    corpses = [],
    treasures = [],
    herbs = [],
    resourceNodes = [],
    elapsed,
    dayNight,
    intro,
    portalTile,
    visibleRect,
  }) {
    const renderables = this.visibleRenderables;
    const unitRenderables = this.visibleUnitRenderables;
    const portalPoint = intro?.active && portalTile ? this.getTileCenter(portalTile) : null;

    renderables.length = 0;
    unitRenderables.length = 0;

    this.collectUnitRenderables(renderables, unitRenderables, units, visibleRect, intro, portalPoint);

    this.collectCorpseRenderables(renderables, corpses, visibleRect);
    this.collectTreasureRenderables(renderables, treasures, visibleRect);
    this.collectHerbRenderables(renderables, herbs, visibleRect);
    this.collectBuildingRenderables(renderables, visibleTiles, visibleRect);
    this.collectResourceNodeRenderables(renderables, resourceNodes, units, unitRenderables, visibleRect);

    renderables.sort((a, b) => a.depth - b.depth || a.sortOrder - b.sortOrder || a.x - b.x);

    for (const renderable of renderables) {
      this.paintDynamicRenderable(ctx, renderable, elapsed, dayNight);
    }
  }

  collectUnitRenderables(renderables, unitRenderables, units, visibleRect, intro, portalPoint) {
    for (const unit of units) {
      const point = gridToWorld(
        unit.visualColumn,
        unit.visualRow,
        this.config.tileWidth,
        this.config.tileHeight,
      );
      const targetX = point.x;
      const targetY = point.y + this.config.tileHeight * 0.5;
      const presentation = getIntroUnitPresentation(intro, unit, targetX, targetY, portalPoint);

      if (!presentation) {
        continue;
      }

      const x = presentation.x;
      const y = presentation.y;

      if (!isPointInRect(x, y, visibleRect, this.config.tileWidth)) {
        continue;
      }

      const renderable = this.pushRenderable(renderables, "unit", unit, x, y, y, 60);

      renderable.introScale = presentation.scale;
      renderable.introAlpha = presentation.alpha;
      renderable.teleportProgress = presentation.teleportProgress;
      unitRenderables.push(renderable);
    }
  }

  collectCorpseRenderables(renderables, corpses, visibleRect) {
    for (const corpse of corpses) {
      if (corpse.status === "carried") {
        continue;
      }

      const point = gridToWorld(
        corpse.visualColumn,
        corpse.visualRow,
        this.config.tileWidth,
        this.config.tileHeight,
      );
      const x = point.x;
      const y = point.y + this.config.tileHeight * 0.5;

      if (!isPointInRect(x, y, visibleRect, this.config.tileWidth)) {
        continue;
      }

      this.pushRenderable(renderables, "corpse", corpse, x, y, y, 20);
    }
  }

  collectTreasureRenderables(renderables, treasures, visibleRect) {
    for (const treasure of treasures) {
      if (treasure.status === "carried" || treasure.status === "collected") {
        continue;
      }

      const point = gridToWorld(treasure.column, treasure.row, this.config.tileWidth, this.config.tileHeight);
      const x = point.x;
      const y = point.y + this.config.tileHeight * 0.5;

      if (!isPointInRect(x, y, visibleRect, this.config.tileWidth)) {
        continue;
      }

      this.pushRenderable(renderables, "treasure", treasure, x, y, y, 30);
    }
  }

  collectHerbRenderables(renderables, herbs, visibleRect) {
    for (const herb of herbs) {
      if (herb.loadsRemaining <= 0 || herb.cleaned) {
        continue;
      }

      const point = gridToWorld(herb.column, herb.row, this.config.tileWidth, this.config.tileHeight);
      const x = point.x;
      const y = point.y + this.config.tileHeight * 0.5;

      if (!isPointInRect(x, y, visibleRect, this.config.tileWidth)) {
        continue;
      }

      this.pushRenderable(renderables, "herb", herb, x, y, y, 30);
    }
  }

  collectBuildingRenderables(renderables, visibleTiles, visibleRect) {
    for (const tile of visibleTiles) {
      if (!tile.building) {
        continue;
      }

      const point = gridToWorld(tile.column, tile.row, this.config.tileWidth, this.config.tileHeight);
      const depth = this.tilePainter.getBuildingObjectDepth(tile, point.x, point.y);
      const bounds = this.tilePainter.getBuildingObjectBounds(tile, point.x, point.y);

      if (!isRectInRect(bounds, visibleRect)) {
        continue;
      }

      this.pushRenderable(renderables, "building", tile, point.x, point.y, depth, 65);
    }
  }

  collectResourceNodeRenderables(renderables, resourceNodes, units, unitRenderables, visibleRect) {
    if (!resourceNodes) {
      return;
    }

    const workingNodeCounts = getWorkingResourceNodeCounts(units);

    for (const node of resourceNodes) {
      if (node.loadsRemaining <= 0 || node.cleaned) {
        continue;
      }

      const point = gridToWorld(node.column, node.row, this.config.tileWidth, this.config.tileHeight);
      const x = point.x;
      const y = point.y + this.config.tileHeight * 0.5;
      const padding = node.type === "wood" ? this.config.tileWidth * 1.8 : this.config.tileWidth;

      if (!isPointInRect(x, y, visibleRect, padding)) {
        continue;
      }

      const sortOrder = node.type === "wood" ? 70 : 50;
      const renderable = this.pushRenderable(renderables, "resourceNode", node, x, y, y, sortOrder);

      renderable.activeWorkerCount = workingNodeCounts.get(node.id) || 0;
      renderable.alpha = this.shouldFadeTree(node, x, y, unitRenderables) ? TREE_OCCLUDED_ALPHA : 1;
    }
  }

  pushRenderable(renderables, kind, item, x, y, depth, sortOrder) {
    const index = renderables.length;
    const renderable = this.renderablePool[index] || {};

    this.renderablePool[index] = renderable;
    renderable.kind = kind;
    renderable.item = item;
    renderable.x = x;
    renderable.y = y;
    renderable.depth = depth;
    renderable.sortOrder = sortOrder;
    renderable.alpha = 1;
    renderable.introAlpha = 1;
    renderable.activeWorkerCount = 0;
    renderable.introScale = 1;
    renderable.teleportProgress = 1;
    renderables.push(renderable);
    return renderable;
  }

  paintDynamicRenderable(ctx, renderable, elapsed, dayNight) {
    const { kind, item, x, y } = renderable;

    if (kind === "unit") {
      const unit =
        renderable.introScale === 1
          ? item
          : {
              ...item,
              scale: (item.scale || 1) * renderable.introScale,
            };

      if (renderable.teleportProgress < 1) {
        this.darkPortalPainter.paintTeleportFrame(ctx, {
          x,
          y: y + 3,
          progress: Math.max(0, Math.min(1, renderable.teleportProgress)),
          elapsed,
          scale: 0.72,
          alpha: Math.sin(Math.max(0, Math.min(1, renderable.teleportProgress)) * Math.PI) * 0.36,
        });
      }

      ctx.save();
      ctx.globalAlpha = renderable.introAlpha;
      this.unitPainter.paint(ctx, {
        unit,
        x,
        y,
        elapsed,
        dayNight,
      });
      ctx.restore();
      return;
    }

    if (kind === "corpse") {
      this.unitPainter.paintCorpse(ctx, {
        corpse: item,
        x,
        y,
        elapsed,
      });
      return;
    }

    if (kind === "resourceNode") {
      this.resourceNodePainter.paint(ctx, {
        node: item,
        x,
        y,
        elapsed,
        activeWorkerCount: renderable.activeWorkerCount,
        alpha: renderable.alpha,
      });
      return;
    }

    if (kind === "herb") {
      this.herbPainter.paint(ctx, {
        x,
        y,
        loadsRemaining: item.loadsRemaining,
      });
      return;
    }

    if (kind === "treasure") {
      this.treasurePainter.paint(ctx, {
        treasure: item,
        x,
        y,
        elapsed,
      });
      return;
    }

    this.tilePainter.paintBuildingObject(ctx, {
      tile: item,
      x,
      y,
    });
  }

  shouldFadeTree(node, x, y, unitRenderables) {
    return (
      node.type === "wood" &&
      this.camera.zoom >= TREE_OCCLUSION_MIN_ZOOM &&
      unitRenderables.length > 0 &&
      this.isTreeOccludingUnit(x, y, unitRenderables)
    );
  }

  isTreeOccludingUnit(treeX, treeY, unitRenderables) {
    for (const unit of unitRenderables) {
      const dx = Math.abs(unit.x - treeX);
      const dy = unit.y - treeY;

      if (dx <= 48 && dy >= -92 && dy <= 10) {
        return true;
      }
    }

    return false;
  }

  paintFog(ctx, world, fogOfWar, visibleTiles) {
    if (!fogOfWar) {
      return;
    }

    const cache = this.getFogCache(world, fogOfWar, visibleTiles);

    ctx.save();
    ctx.globalAlpha = 0.78;
    this.drawCacheSlice(ctx, cache);
    ctx.restore();
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

    this.paintFogBase(ctx, terrainCache.bounds);
    ctx.translate(-terrainCache.bounds.x, -terrainCache.bounds.y);
    ctx.globalCompositeOperation = "destination-out";

    let index = 0;
    const tiles = world.tilesByDrawOrder;

    await runChunkedWork((deadlineMs) => {
      while (index < tiles.length && performance.now() < deadlineMs) {
        const tile = tiles[index];

        if (fogOfWar.isRevealed(tile)) {
          this.eraseFogAtTile(ctx, tile);
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

      this.paintFogBase(ctx, terrainCache.bounds);
      ctx.translate(-terrainCache.bounds.x, -terrainCache.bounds.y);
      ctx.globalCompositeOperation = "destination-out";

      for (const tile of world.tilesByDrawOrder) {
        if (fogOfWar.isRevealed(tile)) {
          this.eraseFogAtTile(ctx, tile);
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

    for (const tile of tiles) {
      this.eraseFogAtTile(ctx, tile);
    }

    ctx.restore();
  }

  paintFogBase(ctx, bounds) {
    ctx.fillStyle = "#070a0c";
    ctx.fillRect(0, 0, bounds.width, bounds.height);
  }

  eraseFogAtTile(ctx, tile) {
    const center = this.getTileCenter(tile);
    const brush = this.getFogRevealBrush();

    ctx.drawImage(brush, center.x - brush.width / 2, center.y - brush.height / 2);
  }

  getFogRevealBrush() {
    const key = `${this.config.tileWidth}:${this.config.tileHeight}`;

    if (this.fogRevealBrush && this.fogRevealBrushKey === key) {
      return this.fogRevealBrush;
    }

    const canvas = document.createElement("canvas");
    const width = Math.ceil(this.config.tileWidth * 1.8);
    const height = Math.ceil(this.config.tileHeight * 2.7);

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.max(width, height) * 0.5;
    const gradient = ctx.createRadialGradient(cx, cy, radius * 0.12, cx, cy, radius);

    gradient.addColorStop(0, "rgba(0, 0, 0, 1)");
    gradient.addColorStop(0.58, "rgba(0, 0, 0, 1)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    this.fogRevealBrush = canvas;
    this.fogRevealBrushKey = key;
    return canvas;
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
    let minCornerColumn = Number.POSITIVE_INFINITY;
    let maxCornerColumn = Number.NEGATIVE_INFINITY;
    let minCornerRow = Number.POSITIVE_INFINITY;
    let maxCornerRow = Number.NEGATIVE_INFINITY;

    for (const corner of corners) {
      minCornerColumn = Math.min(minCornerColumn, corner.column);
      maxCornerColumn = Math.max(maxCornerColumn, corner.column);
      minCornerRow = Math.min(minCornerRow, corner.row);
      maxCornerRow = Math.max(maxCornerRow, corner.row);
    }

    const minColumn = clampInt(Math.floor(minCornerColumn) - 4, 0, world.columns - 1);
    const maxColumn = clampInt(Math.ceil(maxCornerColumn) + 4, 0, world.columns - 1);
    const minRow = clampInt(Math.floor(minCornerRow) - 4, 0, world.rows - 1);
    const maxRow = clampInt(Math.ceil(maxCornerRow) + 4, 0, world.rows - 1);
    const tiles = this.visibleTiles;

    tiles.length = 0;

    for (let diagonal = minColumn + minRow; diagonal <= maxColumn + maxRow; diagonal += 1) {
      for (let row = minRow; row <= maxRow; row += 1) {
        const column = diagonal - row;

        if (column < minColumn || column > maxColumn) {
          continue;
        }

        const tile = world.getTile(column, row);

        if (tile) {
          tiles.push(tile);
        }
      }
    }

    return tiles;
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

  if (type === "rest") {
    return "rgba(32, 69, 55, 0.92)";
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

  if (type === "question") {
    return "rgba(71, 54, 25, 0.94)";
  }

  return "rgba(74, 48, 20, 0.92)";
}

function getWorkingResourceNodeCounts(units = []) {
  const counts = new Map();

  for (const unit of units) {
    if (unit.stage !== "harvesting" || !unit.targetResourceNodeId) {
      continue;
    }

    counts.set(unit.targetResourceNodeId, (counts.get(unit.targetResourceNodeId) || 0) + 1);
  }

  return counts;
}

function mixColor(fromHex, toHex, amount) {
  const from = parseHex(fromHex);
  const to = parseHex(toHex);
  const mix = (start, end) => Math.round(start + (end - start) * amount);

  return `rgb(${mix(from.r, to.r)}, ${mix(from.g, to.g)}, ${mix(from.b, to.b)})`;
}

function easeOutCubic(value) {
  return 1 - Math.pow(1 - value, 3);
}

function getIntroUnitPresentation(intro, unit, targetX, targetY, portalPoint) {
  if (!intro?.active) {
    return {
      x: targetX,
      y: targetY,
      scale: 1,
      alpha: 1,
      teleportProgress: 1,
    };
  }

  if (unit.faction !== "player") {
    return null;
  }

  const unitIndex = intro.playerUnitIds?.indexOf(unit.id) ?? -1;
  const sequenceIndex = unitIndex >= 0 ? unitIndex : 0;
  const teleportProgress = getIntroTeleportUnitProgress(intro.elapsedMs, sequenceIndex);

  if (teleportProgress <= 0) {
    return null;
  }

  const start = portalPoint || { x: targetX, y: targetY };
  const walkStartMs = Number.isFinite(intro.walkStartMs) ? intro.walkStartMs : getIntroTeleportUnitStartMs(sequenceIndex) + 560;
  const walkDurationMs = Number.isFinite(intro.walkDurationMs) ? intro.walkDurationMs : 3600;
  const walkProgress = clamp01((intro.elapsedMs - walkStartMs) / walkDurationMs);
  const travelProgress = walkProgress;
  const easedTravel = easeOutCubic(travelProgress);
  const arrivalArc = Math.sin(travelProgress * Math.PI) * 22;
  const popProgress = clamp01((teleportProgress - 0.04) / 0.72);
  const scale = teleportProgress >= 1 ? 1 : Math.max(0.16, Math.min(1.08, easeOutBack(popProgress)));

  return {
    x: lerp(start.x, targetX, easedTravel),
    y: lerp(start.y - 6, targetY, easedTravel) - arrivalArc,
    scale,
    alpha: clamp01(teleportProgress / 0.18),
    teleportProgress: teleportProgress >= 1 ? 1 : teleportProgress,
  };
}

function getIntroFireProgress(intro) {
  if (!intro?.active || !Number.isFinite(intro.fireStartMs) || !Number.isFinite(intro.fireDurationMs)) {
    return 1;
  }

  return clamp01((intro.elapsedMs - intro.fireStartMs) / intro.fireDurationMs);
}

function easeOutBack(value) {
  const overshoot = 1.7;

  return 1 + (overshoot + 1) * Math.pow(value - 1, 3) + overshoot * Math.pow(value - 1, 2);
}

function lerp(from, to, amount) {
  return from + (to - from) * amount;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
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

function isPointInRect(x, y, rect, padding = 0) {
  return (
    x >= rect.x - padding &&
    x <= rect.x + rect.width + padding &&
    y >= rect.y - padding &&
    y <= rect.y + rect.height + padding
  );
}

function isRectInRect(bounds, rect) {
  return (
    bounds.x + bounds.width >= rect.x &&
    bounds.x <= rect.x + rect.width &&
    bounds.y + bounds.height >= rect.y &&
    bounds.y <= rect.y + rect.height
  );
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
      window.setTimeout(() => {
        const start = performance.now();
        const isDone = work(start + 8);

        if (isDone) {
          resolve();
          return;
        }

        schedule();
      }, 0);
    };

    schedule();
  });
}

function clampInt(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
