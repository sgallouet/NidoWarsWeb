import { isTilePassable } from "./tileTypes.js";

const DEFAULT_TREASURE_VALUE = 25;

export class TreasureManager {
  constructor({ world, count, reservedKeys = new Set() }) {
    this.world = world;
    this.treasures = createTreasures({ world, count, reservedKeys });
  }

  collectAt(column, row) {
    const treasure = this.treasures.find(
      (candidate) => candidate.column === column && candidate.row === row && !candidate.collected,
    );

    if (!treasure) {
      return 0;
    }

    treasure.collected = true;
    return treasure.value;
  }

  getVisibleTreasures() {
    return this.treasures.filter((treasure) => !treasure.collected);
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
      collected: false,
    });
  }

  return treasures;
}
