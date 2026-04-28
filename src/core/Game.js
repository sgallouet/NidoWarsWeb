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
import { createStartingUnits } from "../units/unitDefinitions.js";

export class Game {
  constructor({ canvas, root, config }) {
    this.config = config;
    this.resources = { ...config.resources };
    this.world = createDesertMap(config.map);
    this.units = new UnitManager({
      world: this.world,
      units: createStartingUnits(this.world),
    });
    this.fogOfWar = new FogOfWar(this.world);
    this.treasures = new TreasureManager({
      world: this.world,
      count: 12,
      reservedKeys: new Set(this.units.units.map((unit) => `${unit.column}:${unit.row}`)),
    });
    this.aiDelayMs = null;
    this.aiMoving = false;
    this.camera = new Camera2D(config.render);
    this.hud = new Hud(root);
    this.renderer = new CanvasRenderer({
      canvas,
      camera: this.camera,
      config: config.render,
    });
    this.fpsCounter = new FpsCounter();
    this.input = new InputController({
      canvas,
      camera: this.camera,
      renderer: this.renderer,
      world: this.world,
      units: this.units,
    });
    this.loop = new GameLoop((frame) => this.update(frame));
  }

  start() {
    this.renderer.resize();
    this.camera.frameWorld(this.world, this.renderer.viewport);
    this.hud.setResources(this.resources);
    this.hud.setTile(this.world.getTile(14, 14));
    this.units.selectUnit("warrior-01");
    this.revealPlayerSurroundings();
    this.collectTreasure();
    this.hud.setSelection(this.units.getSelectedUnit());

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
    this.updateAiTurn(frame.delta);
    this.collectTreasure();

    const hoveredTile = this.input.getHoveredTile();

    if (hoveredTile) {
      this.hud.setTile(hoveredTile);
    }

    this.hud.setSelection(this.units.getSelectedUnit());

    this.renderer.render({
      world: this.world,
      units: this.units.units,
      treasures: this.treasures.getVisibleTreasures(),
      fogOfWar: this.fogOfWar,
      selectedUnit: this.units.getSelectedUnit(),
      reachableTiles: this.units.getReachableTileList(),
      movementPath: this.units.getDisplayPath(),
      hoveredTile,
      elapsed: frame.elapsed,
    });
  }

  updateAiTurn(delta) {
    if (this.units.consumePlayerMoveCompleted()) {
      this.revealPlayerSurroundings();
      this.aiDelayMs = 2000;
    }

    if (this.aiDelayMs !== null && !this.units.hasMovingUnits()) {
      this.aiDelayMs -= delta;

      if (this.aiDelayMs <= 0) {
        this.aiMoving = this.units.moveMonstersTowardPlayer();
        this.aiDelayMs = null;
      }
    }

    if (this.aiMoving && !this.units.hasMovingUnits()) {
      this.aiMoving = false;
      this.units.beginPlayerTurn();
    }
  }

  revealPlayerSurroundings() {
    const player = this.units.getPlayerUnit();

    if (player) {
      this.fogOfWar.revealAround(player, 5);
    }
  }

  collectTreasure() {
    const player = this.units.getPlayerUnit();

    if (!player) {
      return;
    }

    const gold = this.treasures.collectAt(player.column, player.row);

    if (gold <= 0) {
      return;
    }

    this.resources.gold += gold;
    this.hud.setResources(this.resources);
  }
}
