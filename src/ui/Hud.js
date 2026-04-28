export class Hud {
  constructor(root) {
    this.nodes = {
      gold: root.querySelector('[data-ui="gold"]'),
      herbs: root.querySelector('[data-ui="herbs"]'),
      fish: root.querySelector('[data-ui="fish"]'),
      berries: root.querySelector('[data-ui="berries"]'),
      wood: root.querySelector('[data-ui="wood"]'),
      cycle: root.querySelector('[data-ui="cycle"]'),
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

  setResources({ gold, herbs, fish, berries, wood }) {
    this.nodes.gold.textContent = String(gold);
    this.nodes.herbs.textContent = String(herbs);
    this.nodes.fish.textContent = String(fish);
    this.nodes.berries.textContent = String(berries);
    this.nodes.wood.textContent = String(wood);
  }

  setFps(fps) {
    this.nodes.fps.textContent = String(fps);
  }

  setCycle(dayNight) {
    this.nodes.cycle.textContent = dayNight.label;
  }

  setTile(tile) {
    if (!tile) {
      return;
    }

    this.nodes.tileName.textContent = tile.biomeLabel ? `${tile.biomeLabel} - ${tile.label}` : tile.label;
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
