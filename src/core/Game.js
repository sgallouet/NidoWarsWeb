import { GameLoop } from "./GameLoop.js";
import { InputController } from "../engine/InputController.js";
import { Camera2D } from "../rendering/Camera2D.js";
import { CanvasRenderer } from "../rendering/CanvasRenderer.js";
import { createDesertMap } from "../world/createDesertMap.js";
import { DayNightCycle } from "../world/DayNightCycle.js";
import { FogOfWar } from "../world/FogOfWar.js";
import { HerbManager } from "../world/HerbManager.js";
import { ResourceNodeManager } from "../world/ResourceNodeManager.js";
import { Hud } from "../ui/Hud.js";
import { PerformanceMonitor } from "../ui/PerformanceMonitor.js";
import { TreasureManager } from "../world/TreasureManager.js";
import { UnitManager } from "../units/UnitManager.js";
import { createStartingUnits, findCampTile } from "../units/unitDefinitions.js";

export class Game {
  constructor({ canvas, root, config }) {
    this.config = config;
    this.resources = { ...config.resources };
    this.dayNightCycle = new DayNightCycle(config.timeOfDay);
    this.world = createDesertMap(config.map);
    this.fogOfWar = new FogOfWar(this.world);
    this.campTile = findCampTile(this.world);
    const startingUnits = createStartingUnits(this.world, this.campTile);
    const reservedSpawnKeys = new Set([
      this.campTile.id,
      ...startingUnits.map((unit) => `${unit.column}:${unit.row}`),
    ]);
    this.treasures = new TreasureManager({
      world: this.world,
      count: 36,
      reservedKeys: reservedSpawnKeys,
    });
    this.herbs = new HerbManager({
      world: this.world,
      count: 90,
      reservedKeys: reservedSpawnKeys,
    });
    this.resourceNodes = new ResourceNodeManager({
      world: this.world,
      counts: {
        fish: 54,
        berries: 72,
        wood: 60,
        rock: 60,
      },
      reservedKeys: reservedSpawnKeys,
    });
    this.units = new UnitManager({
      world: this.world,
      units: startingUnits,
      campTile: this.campTile,
      fogOfWar: this.fogOfWar,
      treasureManager: this.treasures,
      herbManager: this.herbs,
      resourceNodeManager: this.resourceNodes,
      onGoldDelivered: (gold) => this.addGold(gold),
      onHerbsDelivered: (herbs) => this.addHerbs(herbs),
      onResourceDelivered: (type, amount) => this.addResource(type, amount),
    });
    this.camera = new Camera2D(config.render);
    this.hud = new Hud(root);
    this.renderer = new CanvasRenderer({
      canvas,
      camera: this.camera,
      config: config.render,
    });
    this.performanceMonitor = new PerformanceMonitor({
      canvas: root.querySelector('[data-ui="perf-graph"]'),
      valueNode: root.querySelector('[data-ui="frame-ms"]'),
    });
    this.helpButton = root.querySelector('[data-ui="help-toggle"]');
    this.helpPanel = root.querySelector('[data-ui="help-panel"]');
    this.helpCloseButton = root.querySelector('[data-ui="help-close"]');
    this.loadingPanel = root.querySelector('[data-ui="loading-panel"]');
    this.loadingFill = root.querySelector('[data-ui="loading-fill"]');
    this.loadingValue = root.querySelector('[data-ui="loading-value"]');
    this.isPaused = false;
    this.pausedElapsed = 0;
    this.hudRefreshMs = 0;
    this.lastHudTileId = null;
    this.input = new InputController({
      canvas,
      camera: this.camera,
      renderer: this.renderer,
      world: this.world,
      units: this.units,
      onTileClick: (tile) => this.handleTileClick(tile),
    });
    this.loop = new GameLoop((frame) => this.update(frame));
  }

  async start() {
    this.renderer.resize();
    this.performanceMonitor.resize();
    this.camera.frameWorld(this.world, this.renderer.viewport);
    this.hud.setResources(this.resources);
    this.hud.setCycle(this.dayNightCycle.getState());
    this.hud.setTile(this.campTile);
    this.units.revealStartingArea();
    this.hud.setUnitSummary(this.units.units);
    this.setupHelpOverlay();
    this.setLoadingProgress(0);
    this.setLoadingVisible(true);

    await this.renderer.prepareWorld(this.world, this.fogOfWar, (progress) => {
      this.setLoadingProgress(progress);
    });

    this.setLoadingVisible(false);

    window.addEventListener("resize", () => {
      this.renderer.resize();
      this.performanceMonitor.resize();
      this.camera.frameWorld(this.world, this.renderer.viewport);
    });

    this.loop.start();
  }

  setLoadingVisible(isVisible) {
    if (!this.loadingPanel) {
      return;
    }

    this.loadingPanel.hidden = !isVisible;
  }

  setLoadingProgress(progress) {
    const clamped = Math.max(0, Math.min(1, progress || 0));
    const percent = Math.round(clamped * 100);

    if (this.loadingFill) {
      this.loadingFill.style.transform = `scaleX(${clamped})`;
    }

    if (this.loadingValue) {
      this.loadingValue.textContent = `${percent}%`;
    }
  }

  update(frame) {
    const frameStart = performance.now();

    const delta = this.isPaused ? 0 : frame.delta;
    const elapsed = this.isPaused ? this.pausedElapsed : frame.elapsed;

    if (!this.isPaused) {
      this.units.update(delta);
      this.dayNightCycle.update(delta);
    }

    const dayNight = this.dayNightCycle.getState();

    const hoveredTile = this.input.getHoveredTile();

    if (hoveredTile && hoveredTile.id !== this.lastHudTileId) {
      this.hud.setTile(hoveredTile);
      this.lastHudTileId = hoveredTile.id;
    }

    this.hudRefreshMs += delta;

    if (this.hudRefreshMs >= 250) {
      this.hudRefreshMs = 0;
      this.hud.setUnitSummary(this.units.units);
      this.hud.setCycle(dayNight);
    }

    this.renderer.render({
      world: this.world,
      units: this.units.units,
      corpses: this.units.getCorpses(),
      treasures: this.treasures.getVisibleTreasures(),
      herbs: this.herbs.getVisibleHerbs(),
      resourceNodes: this.resourceNodes.getVisibleNodes(),
      fogOfWar: this.fogOfWar,
      campTile: this.campTile,
      orderMarkers: this.units.getOrderMarkers(),
      hoveredTile,
      dayNight,
      elapsed,
    });

    this.performanceMonitor.record(performance.now() - frameStart);
  }

  setupHelpOverlay() {
    if (!this.helpButton || !this.helpPanel || !this.helpCloseButton) {
      return;
    }

    this.helpButton.addEventListener("click", () => this.setHelpOpen(true));
    this.helpCloseButton.addEventListener("click", () => this.setHelpOpen(false));
    this.helpPanel.addEventListener("click", (event) => {
      if (event.target === this.helpPanel) {
        this.setHelpOpen(false);
      }
    });
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && this.isPaused) {
        this.setHelpOpen(false);
      }
    });
  }

  setHelpOpen(isOpen) {
    this.isPaused = isOpen;
    this.helpPanel.hidden = !isOpen;
    this.helpButton.setAttribute("aria-expanded", String(isOpen));

    if (isOpen) {
      this.pausedElapsed = this.loop.elapsed;
      this.helpCloseButton.focus();
    } else {
      this.helpButton.focus();
    }
  }

  handleTileClick(tile) {
    if (!tile) {
      return;
    }

    const treasure = this.treasures.getTreasureAt(tile.column, tile.row);

    if (treasure) {
      this.units.commandGatherTreasure(treasure);
      return;
    }

    const herb = this.herbs.getHerbAt(tile.column, tile.row);

    if (herb) {
      this.units.commandGatherHerb(herb);
      return;
    }

    const resourceNode = this.resourceNodes.getNodeAt(tile.column, tile.row);

    if (resourceNode) {
      this.units.commandGatherResource(resourceNode);
      return;
    }

    if (!this.fogOfWar.isRevealed(tile)) {
      this.units.commandExplore(tile);
    }
  }

  addGold(gold) {
    this.resources.gold += gold;
    this.hud.setResources(this.resources);
  }

  addHerbs(herbs) {
    this.resources.herbs += herbs;
    this.hud.setResources(this.resources);
  }

  addResource(type, amount) {
    this.resources[type] += amount;
    this.hud.setResources(this.resources);
  }
}
