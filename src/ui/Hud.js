export class Hud {
  constructor(root) {
    this.nodes = {
      turn: root.querySelector('[data-ui="turn"]'),
      water: root.querySelector('[data-ui="water"]'),
      supplies: root.querySelector('[data-ui="supplies"]'),
      gold: root.querySelector('[data-ui="gold"]'),
      fps: root.querySelector('[data-ui="fps"]'),
      tileName: root.querySelector('[data-ui="tile-name"]'),
      tileCoords: root.querySelector('[data-ui="tile-coords"]'),
      unitName: root.querySelector('[data-ui="unit-name"]'),
      unitRole: root.querySelector('[data-ui="unit-role"]'),
      unitCoords: root.querySelector('[data-ui="unit-coords"]'),
      unitMove: root.querySelector('[data-ui="unit-move"]'),
    };
  }

  setResources({ turn, water, supplies, gold }) {
    this.nodes.turn.textContent = String(turn).padStart(3, "0");
    this.nodes.water.textContent = String(water);
    this.nodes.supplies.textContent = String(supplies);
    this.nodes.gold.textContent = String(gold);
  }

  setFps(fps) {
    this.nodes.fps.textContent = String(fps);
  }

  setTile(tile) {
    if (!tile) {
      return;
    }

    this.nodes.tileName.textContent = tile.label;
    this.nodes.tileCoords.textContent = `${tile.column}, ${tile.row}`;
  }

  setSelection(unit) {
    if (!unit) {
      this.nodes.unitName.textContent = "No unit";
      this.nodes.unitRole.textContent = "-";
      this.nodes.unitCoords.textContent = "-";
      this.nodes.unitMove.textContent = "-";
      return;
    }

    this.nodes.unitName.textContent = unit.name;
    this.nodes.unitRole.textContent = unit.label;
    this.nodes.unitCoords.textContent = `${unit.column}, ${unit.row}`;
    this.nodes.unitMove.textContent = `Move ${unit.moveRange} pts`;
  }
}
