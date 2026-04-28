import { GameLoop } from "./GameLoop.js";
import { FpsCounter } from "./FpsCounter.js";
import { InputController } from "../engine/InputController.js";
import { Camera2D } from "../rendering/Camera2D.js";
import { CanvasRenderer } from "../rendering/CanvasRenderer.js";
import { createDesertMap } from "../world/createDesertMap.js";
import { Hud } from "../ui/Hud.js";
import { UnitManager } from "../units/UnitManager.js";
import { createStartingUnits } from "../units/unitDefinitions.js";

export class Game {
  constructor({ canvas, root, config }) {
    this.config = config;
    this.world = createDesertMap(config.map);
    this.units = new UnitManager({
      world: this.world,
      units: createStartingUnits(),
    });
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
    this.hud.setResources(this.config.resources);
    this.hud.setTile(this.world.getTile(14, 14));
    this.units.selectUnit("warrior-01");
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

    const hoveredTile = this.input.getHoveredTile();

    if (hoveredTile) {
      this.hud.setTile(hoveredTile);
    }

    this.hud.setSelection(this.units.getSelectedUnit());

    this.renderer.render({
      world: this.world,
      units: this.units.units,
      selectedUnit: this.units.getSelectedUnit(),
      reachableTiles: this.units.getReachableTileList(),
      movementPath: this.units.getDisplayPath(),
      hoveredTile,
      elapsed: frame.elapsed,
    });
  }
}
