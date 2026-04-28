import { GameLoop } from "./GameLoop.js";
import { FpsCounter } from "./FpsCounter.js";
import { InputController } from "../engine/InputController.js";
import { Camera2D } from "../rendering/Camera2D.js";
import { CanvasRenderer } from "../rendering/CanvasRenderer.js";
import { createDesertMap } from "../world/createDesertMap.js";
import { FogOfWar } from "../world/FogOfWar.js";
import { Hud } from "../ui/Hud.js";
import { TreasureManager } from "../world/TreasureManager.js";
import { UnitManager } from "../units/UnitManager.js";
import { createStartingUnits, findCampTile } from "../units/unitDefinitions.js";

export class Game {
  constructor({ canvas, root, config }) {
    this.config = config;
    this.resources = { ...config.resources };
    this.world = createDesertMap(config.map);
    this.fogOfWar = new FogOfWar(this.world);
    this.campTile = findCampTile(this.world);
    const startingUnits = createStartingUnits(this.world, this.campTile);
    this.treasures = new TreasureManager({
      world: this.world,
      count: 12,
      reservedKeys: new Set([
        this.campTile.id,
        ...startingUnits.map((unit) => `${unit.column}:${unit.row}`),
      ]),
    });
    this.units = new UnitManager({
      world: this.world,
      units: startingUnits,
      campTile: this.campTile,
      fogOfWar: this.fogOfWar,
      treasureManager: this.treasures,
      onGoldDelivered: (gold) => this.addGold(gold),
    });
    this.camera = new Camera2D(config.render);
    this.hud = new Hud(root);
    this.renderer = new CanvasRenderer({
      canvas,
      camera: this.camera,
      config: config.render,
    });
    this.fpsCounter = new FpsCounter();
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

  start() {
    this.renderer.resize();
    this.camera.frameWorld(this.world, this.renderer.viewport);
    this.hud.setResources(this.resources);
    this.hud.setTile(this.campTile);
    this.units.revealStartingArea();
    this.hud.setUnitSummary(this.units.units);

    window.addEventListener("resize", () => {
      this.renderer.resize();
      this.camera.frameWorld(this.world, this.renderer.viewport);
    });

    this.loop.start();
  }

  update(frame) {
    const fps = this.fpsCounter.record(frame.delta);

    if (fps !== null) {
      this.hud.setFps(fps);
    }

    this.units.update(frame.delta);

    const hoveredTile = this.input.getHoveredTile();

    if (hoveredTile && hoveredTile.id !== this.lastHudTileId) {
      this.hud.setTile(hoveredTile);
      this.lastHudTileId = hoveredTile.id;
    }

    this.hudRefreshMs += frame.delta;

    if (this.hudRefreshMs >= 250) {
      this.hudRefreshMs = 0;
      this.hud.setUnitSummary(this.units.units);
    }

    this.renderer.render({
      world: this.world,
      units: this.units.units,
      treasures: this.treasures.getVisibleTreasures(),
      fogOfWar: this.fogOfWar,
      campTile: this.campTile,
      orderMarkers: this.units.getOrderMarkers(),
      hoveredTile,
      elapsed: frame.elapsed,
    });
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

    if (!this.fogOfWar.isRevealed(tile)) {
      this.units.commandExplore(tile);
    }
  }

  addGold(gold) {
    this.resources.gold += gold;
    this.hud.setResources(this.resources);
  }
}
