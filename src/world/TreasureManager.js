import { isTilePassable } from "./tileTypes.js";

const DEFAULT_TREASURE_VALUE = 25;

export class TreasureManager {
  constructor({ world, count, reservedKeys = new Set() }) {
    this.world = world;
    this.treasures = createTreasures({ world, count, reservedKeys });
  }

  getTreasureAt(column, row) {
    return this.treasures.find(
      (treasure) =>
        treasure.column === column &&
        treasure.row === row &&
        treasure.status !== "collected" &&
        treasure.status !== "carried",
    );
  }

  reserve(treasureId) {
    const treasure = this.getById(treasureId);

    if (!treasure || treasure.status !== "available") {
      return false;
    }

    treasure.status = "reserved";
    return true;
  }

  pickUp(treasureId, unitId) {
    const treasure = this.getById(treasureId);

    if (!treasure || treasure.status === "collected") {
      return false;
    }

    treasure.status = "carried";
    treasure.carriedBy = unitId;
    return true;
  }

  deposit(treasureId) {
    const treasure = this.getById(treasureId);

    if (!treasure || treasure.status !== "carried") {
      return 0;
    }

    treasure.status = "collected";
    treasure.carriedBy = null;
    return treasure.value;
  }

  release(treasureId) {
    const treasure = this.getById(treasureId);

    if (treasure && treasure.status !== "collected") {
      treasure.status = "available";
      treasure.carriedBy = null;
    }
  }

  getById(treasureId) {
    return this.treasures.find((treasure) => treasure.id === treasureId) || null;
  }

  getVisibleTreasures() {
    return this.treasures.filter((treasure) => treasure.status !== "collected");
  }
}

function createTreasures({ world, count, reservedKeys }) {
  const candidates = world.tiles.filter((tile) => {
    if (!isTilePassable(tile) || reservedKeys.has(tile.id)) {
      return false;
    }

    return tile.type !== "oasis";
  });
  const treasures = [];
  let cursor = Math.floor(Math.random() * candidates.length);

  while (treasures.length < count && candidates.length > 0) {
    cursor = (cursor + 7 + Math.floor(Math.random() * 17)) % candidates.length;
    const tile = candidates.splice(cursor, 1)[0];

    treasures.push({
      id: `treasure-${tile.id}`,
      column: tile.column,
      row: tile.row,
      value: DEFAULT_TREASURE_VALUE,
      status: "available",
      carriedBy: null,
    });
    reservedKeys.add(tile.id);
  }

  return treasures;
}
