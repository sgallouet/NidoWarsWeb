export class Hud {
  constructor(root) {
    this.nodes = {
      gold: root.querySelector('[data-ui="gold"]'),
      units: root.querySelector('[data-ui="units"]'),
      fps: root.querySelector('[data-ui="fps"]'),
      tileName: root.querySelector('[data-ui="tile-name"]'),
      tileCoords: root.querySelector('[data-ui="tile-coords"]'),
      unitName: root.querySelector('[data-ui="unit-name"]'),
      unitRole: root.querySelector('[data-ui="unit-role"]'),
      unitCoords: root.querySelector('[data-ui="unit-coords"]'),
      unitMove: root.querySelector('[data-ui="unit-move"]'),
    };
  }

  setResources({ gold }) {
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

  setUnitSummary(units) {
    const playerUnits = units.filter((unit) => unit.faction === "player");
    const activeOrders = playerUnits.filter((unit) => unit.order !== "patrol").length;
    const haulingUnits = playerUnits.filter((unit) => unit.carryingTreasureId).length;

    this.nodes.units.textContent = String(playerUnits.length);
    this.nodes.unitName.textContent = "Fire Camp";
    this.nodes.unitRole.textContent = activeOrders > 0 ? `${activeOrders} active order` : "Patrol active";
    this.nodes.unitCoords.textContent = haulingUnits > 0 ? `${haulingUnits} carrying` : `${playerUnits.length} warriors`;
    this.nodes.unitMove.textContent = "Realtime orders";
  }
}
