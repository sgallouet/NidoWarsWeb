import { buildPath, findReachableTiles, toKey } from "./pathfinding.js";

const MOVE_SEGMENT_MS = 150;

export class UnitManager {
  constructor({ world, units }) {
    this.world = world;
    this.units = units;
    this.selectedUnitId = null;
    this.reachableTiles = new Map();
    this.previewPath = [];
    this.commandPath = [];
    this.playerMoveCompleted = false;
    this.playerCanAct = true;
  }

  update(delta) {
    for (const unit of this.units) {
      this.updateMovement(unit, delta);
    }
  }

  getSelectedUnit() {
    return this.units.find((unit) => unit.id === this.selectedUnitId) || null;
  }

  getUnitAt(column, row) {
    return this.units.find((unit) => unit.column === column && unit.row === row) || null;
  }

  getPlayerUnit() {
    return this.units.find((unit) => unit.faction === "player") || null;
  }

  hasMovingUnits() {
    return this.units.some((unit) => unit.movementSegment);
  }

  selectUnit(unitId) {
    const unit = this.units.find((candidate) => candidate.id === unitId);

    if (!unit || unit.faction !== "player") {
      return false;
    }

    this.selectedUnitId = unit.id;
    this.refreshReachableTiles();
    this.commandPath = [];
    return true;
  }

  clearSelection() {
    this.selectedUnitId = null;
    this.reachableTiles = new Map();
    this.previewPath = [];
    this.commandPath = [];
  }

  setPreviewTile(tile) {
    const selectedUnit = this.getSelectedUnit();

    if (!selectedUnit || !this.playerCanAct || selectedUnit.movementSegment || !tile) {
      this.previewPath = [];
      return;
    }

    this.previewPath = this.getPathTo(tile);
  }

  tryMoveSelectedTo(tile) {
    const selectedUnit = this.getSelectedUnit();

    if (!selectedUnit || !this.playerCanAct || this.hasMovingUnits() || !tile) {
      return false;
    }

    const path = this.getPathTo(tile);

    if (path.length < 2) {
      return false;
    }

    selectedUnit.movementQueue = path.slice(1);
    this.commandPath = path;
    this.previewPath = [];
    this.playerCanAct = false;
    this.startNextSegment(selectedUnit);
    return true;
  }

  beginPlayerTurn() {
    this.playerCanAct = true;
    this.refreshReachableTiles();
  }

  consumePlayerMoveCompleted() {
    const completed = this.playerMoveCompleted;

    this.playerMoveCompleted = false;
    return completed;
  }

  moveMonstersTowardPlayer() {
    const player = this.getPlayerUnit();

    if (!player || this.hasMovingUnits()) {
      return false;
    }

    const reservedDestinations = new Set();
    let issuedMove = false;

    for (const monster of this.units.filter((unit) => unit.faction === "monster")) {
      const reachableTiles = findReachableTiles({
        world: this.world,
        start: monster,
        maxDistance: monster.moveRange,
        blockedKeys: this.getBlockedKeys(monster.id),
      });
      let bestNode = null;
      let bestScore = Infinity;

      for (const node of reachableTiles.values()) {
        const nodeKey = toKey(node.column, node.row);

        if (node.distance === 0 || reservedDestinations.has(nodeKey)) {
          continue;
        }

        const score = Math.abs(node.column - player.column) + Math.abs(node.row - player.row);

        if (score < bestScore) {
          bestScore = score;
          bestNode = node;
        }
      }

      if (!bestNode) {
        continue;
      }

      const path = buildPath(reachableTiles, bestNode);

      if (path.length < 2) {
        continue;
      }

      monster.movementQueue = path.slice(1);
      reservedDestinations.add(toKey(bestNode.column, bestNode.row));
      this.startNextSegment(monster);
      issuedMove = true;
    }

    if (!issuedMove) {
      this.beginPlayerTurn();
    }

    return issuedMove;
  }

  getReachableTileList() {
    return [...this.reachableTiles.values()];
  }

  getPathTo(tile) {
    if (!this.reachableTiles.has(toKey(tile.column, tile.row))) {
      return [];
    }

    if (this.getUnitAt(tile.column, tile.row)) {
      return [];
    }

    return buildPath(this.reachableTiles, tile);
  }

  getDisplayPath() {
    return this.previewPath.length > 0 ? this.previewPath : this.commandPath;
  }

  refreshReachableTiles() {
    const selectedUnit = this.getSelectedUnit();

    if (!selectedUnit) {
      this.reachableTiles = new Map();
      return;
    }

    this.reachableTiles = findReachableTiles({
      world: this.world,
      start: selectedUnit,
      maxDistance: selectedUnit.moveRange,
      blockedKeys: this.getBlockedKeys(selectedUnit.id),
    });
  }

  getBlockedKeys(exceptUnitId) {
    return new Set(
      this.units
        .filter((unit) => unit.id !== exceptUnitId)
        .map((unit) => toKey(unit.column, unit.row)),
    );
  }

  updateMovement(unit, delta) {
    if (!unit.movementSegment) {
      return;
    }

    unit.movementSegment.elapsed += delta;

    const progress = Math.min(1, unit.movementSegment.elapsed / MOVE_SEGMENT_MS);
    const eased = easeInOut(progress);

    unit.visualColumn = lerp(unit.movementSegment.from.column, unit.movementSegment.to.column, eased);
    unit.visualRow = lerp(unit.movementSegment.from.row, unit.movementSegment.to.row, eased);

    if (progress < 1) {
      return;
    }

    unit.column = unit.movementSegment.to.column;
    unit.row = unit.movementSegment.to.row;
    unit.visualColumn = unit.column;
    unit.visualRow = unit.row;
    unit.movementSegment = null;
    this.startNextSegment(unit);

    if (!unit.movementSegment && unit.id === this.selectedUnitId) {
      this.commandPath = [];
      this.refreshReachableTiles();
    }

    if (!unit.movementSegment && unit.faction === "player") {
      this.playerMoveCompleted = true;
    }
  }

  startNextSegment(unit) {
    const nextTile = unit.movementQueue.shift();

    if (!nextTile) {
      return;
    }

    unit.movementSegment = {
      from: {
        column: unit.column,
        row: unit.row,
      },
      to: nextTile,
      elapsed: 0,
    };
  }
}

function easeInOut(value) {
  return value < 0.5 ? 2 * value * value : 1 - Math.pow(-2 * value + 2, 2) / 2;
}

function lerp(a, b, amount) {
  return a + (b - a) * amount;
}
