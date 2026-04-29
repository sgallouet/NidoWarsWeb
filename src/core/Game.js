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
import { BUILDINGS, getBuildingById } from "../world/buildings.js";
import { TILE_TYPES } from "../world/tileTypes.js";

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
      onTileCleaned: (tile) => this.cleanTile(tile),
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
    this.buildMenu = root.querySelector('[data-ui="build-menu"]');
    this.buildGrid = root.querySelector('[data-ui="build-grid"]');
    this.buildCloseButton = root.querySelector('[data-ui="build-close"]');
    this.buildTileLabel = root.querySelector('[data-ui="build-tile"]');
    this.loadingPanel = root.querySelector('[data-ui="loading-panel"]');
    this.loadingFill = root.querySelector('[data-ui="loading-fill"]');
    this.loadingValue = root.querySelector('[data-ui="loading-value"]');
    this.isPaused = false;
    this.isHelpOpen = false;
    this.isBuildMenuOpen = false;
    this.selectedBuildTile = null;
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
    this.setupBuildMenu();
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
      this.dayNightCycle.update(delta);
    }

    const dayNight = this.dayNightCycle.getState();

    if (!this.isPaused) {
      this.units.update(delta, dayNight);
    }

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
      if (event.key === "Escape" && this.isHelpOpen) {
        this.setHelpOpen(false);
      }
    });
  }

  setHelpOpen(isOpen) {
    this.isHelpOpen = isOpen;
    this.syncPauseState();
    this.helpPanel.hidden = !isOpen;
    this.helpButton.setAttribute("aria-expanded", String(isOpen));

    if (isOpen) {
      this.pausedElapsed = this.loop.elapsed;
      this.helpCloseButton.focus();
    } else {
      this.helpButton.focus();
    }
  }

  setupBuildMenu() {
    if (!this.buildMenu || !this.buildGrid || !this.buildCloseButton) {
      return;
    }

    this.buildCloseButton.addEventListener("click", () => this.setBuildMenuOpen(false));
    this.buildMenu.addEventListener("click", (event) => {
      if (event.target === this.buildMenu) {
        this.setBuildMenuOpen(false);
      }
    });
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && this.isBuildMenuOpen) {
        this.setBuildMenuOpen(false);
      }
    });
  }

  setBuildMenuOpen(isOpen, tile = null) {
    if (!this.buildMenu) {
      return;
    }

    this.isBuildMenuOpen = isOpen;
    this.selectedBuildTile = isOpen ? tile : null;
    if (isOpen) {
      this.pausedElapsed = this.loop.elapsed;
    }
    this.syncPauseState();
    this.buildMenu.hidden = !isOpen;

    if (isOpen) {
      this.renderBuildCards(tile);
      this.buildCloseButton?.focus();
    }
  }

  syncPauseState() {
    this.isPaused = this.isHelpOpen || this.isBuildMenuOpen;
  }

  handleTileClick(tile) {
    if (!tile) {
      return;
    }

    if (tile.canBuild && !tile.building) {
      this.setBuildMenuOpen(true, tile);
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

    if (this.isCleanableTile(tile)) {
      this.units.commandCleanTile(tile);
      return;
    }

    if (!this.fogOfWar.isRevealed(tile)) {
      this.units.commandExplore(tile);
    }
  }

  renderBuildCards(tile) {
    if (!this.buildGrid) {
      return;
    }

    this.buildGrid.innerHTML = "";

    if (this.buildTileLabel) {
      this.buildTileLabel.textContent = tile ? `${tile.column}, ${tile.row}` : "";
    }

    for (const building of BUILDINGS) {
      const card = document.createElement("article");
      card.className = `build-card build-card-${building.tone}`;

      const canAfford = this.canAfford(building.cost);
      const cost = formatResourceList(building.cost);
      const maintenance = formatResourceList(building.maintenance, "/day");

      card.innerHTML = `
        <div class="build-card-art" aria-hidden="true"><span></span></div>
        <div class="build-card-body">
          <h3>${building.name}</h3>
          <p>${building.effect}</p>
          <dl>
            <div><dt>Build</dt><dd>${cost}</dd></div>
            <div><dt>Keep</dt><dd>${maintenance}</dd></div>
          </dl>
          <button type="button" ${canAfford ? "" : "disabled"} data-building-id="${building.id}">
            ${canAfford ? "Build" : "Need materials"}
          </button>
        </div>
      `;

      const button = card.querySelector("button");
      button.addEventListener("click", () => this.buildOnSelectedTile(building.id));
      this.buildGrid.append(card);
    }
  }

  buildOnSelectedTile(buildingId) {
    const tile = this.selectedBuildTile;
    const building = getBuildingById(buildingId);

    if (!tile || !building || tile.building || !tile.canBuild || !this.canAfford(building.cost)) {
      return;
    }

    for (const [resource, amount] of Object.entries(building.cost)) {
      this.resources[resource] -= amount;
    }

    tile.building = building.id;
    tile.isEmpty = false;
    tile.canBuild = false;
    tile.hasRoad = false;
    this.refreshBuildSitesAndRoads();
    this.world.touchTile(tile);
    this.hud.setResources(this.resources);
    this.setBuildMenuOpen(false);
  }

  canAfford(cost) {
    return Object.entries(cost).every(([resource, amount]) => (this.resources[resource] || 0) >= amount);
  }

  isCleanableTile(tile) {
    return Boolean(
      this.herbs.getDepletedHerbAt(tile.column, tile.row) ||
        this.resourceNodes.getDepletedCleanableNodeAt(tile.column, tile.row),
    );
  }

  cleanTile(tile) {
    const didCleanHerb = this.herbs.cleanAt(tile.column, tile.row);
    const didCleanNode = this.resourceNodes.cleanAt(tile.column, tile.row);

    if (!didCleanHerb && !didCleanNode) {
      return false;
    }

    tile.type = getEmptyTileType(tile);
    tile.label = TILE_TYPES[tile.type].label;
    tile.elevation = 0;
    tile.isEmpty = true;
    tile.building = null;
    tile.cleanReservedBy = null;
    this.refreshBuildSitesAndRoads();
    this.world.touchTile(tile);
    return true;
  }

  refreshBuildSitesAndRoads() {
    for (const tile of this.world.tiles) {
      tile.canBuild = false;
      tile.hasRoad = false;
    }

    for (const tile of this.world.tiles) {
      if (this.isRoadTile(tile)) {
        tile.hasRoad = true;
      }
    }

    for (const tile of this.world.tiles) {
      if (this.isBuildSiteCenter(tile)) {
        tile.canBuild = true;
      }
    }
  }

  isBuildSiteCenter(tile) {
    if (!tile?.isEmpty || tile.building) {
      return false;
    }

    for (let row = tile.row - 1; row <= tile.row + 1; row += 1) {
      for (let column = tile.column - 1; column <= tile.column + 1; column += 1) {
        const neighbor = this.world.getTile(column, row);

        if (!neighbor?.isEmpty || neighbor.building || neighbor.hasRoad) {
          return false;
        }
      }
    }

    return true;
  }

  isRoadTile(tile) {
    if (!tile?.isEmpty || tile.building || tile.id === this.campTile.id) {
      return false;
    }

    return (
      (this.isRoadAnchor(tile.column - 1, tile.row) && this.isRoadAnchor(tile.column + 1, tile.row)) ||
      (this.isRoadAnchor(tile.column, tile.row - 1) && this.isRoadAnchor(tile.column, tile.row + 1))
    );
  }

  isRoadAnchor(column, row) {
    const tile = this.world.getTile(column, row);

    return Boolean(tile && (tile.building || tile.id === this.campTile.id));
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

function getEmptyTileType(tile) {
  if (tile.biome === "snow") {
    return "snow";
  }

  if (tile.biome === "volcanic") {
    return "ash";
  }

  if (tile.biome === "desert") {
    return "sand";
  }

  return "grass";
}

function formatResourceList(resources, suffix = "") {
  return Object.entries(resources)
    .map(([resource, amount]) => `${capitalize(resource)} ${amount}${suffix}`)
    .join(", ");
}

function capitalize(value) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}
