import { isTilePassable } from "./tileTypes.js";

const DEFAULT_HERB_LOADS = 5;

export class HerbManager {
  constructor({ world, count, reservedKeys = new Set() }) {
    this.world = world;
    this.herbs = createHerbs({ world, count, reservedKeys });
  }

  getHerbAt(column, row) {
    return this.herbs.find(
      (herb) => herb.column === column && herb.row === row && herb.loadsRemaining > 0 && !herb.reservedBy,
    );
  }

  reserve(herbId, unitId) {
    const herb = this.getById(herbId);

    if (!herb || herb.loadsRemaining <= 0 || herb.reservedBy) {
      return false;
    }

    herb.reservedBy = unitId;
    return true;
  }

  pickLoad(herbId, unitId) {
    const herb = this.getById(herbId);

    if (!herb || herb.loadsRemaining <= 0 || herb.reservedBy !== unitId) {
      return false;
    }

    herb.loadsRemaining -= 1;
    return true;
  }

  release(herbId, unitId) {
    const herb = this.getById(herbId);

    if (herb && (!unitId || herb.reservedBy === unitId)) {
      herb.reservedBy = null;
    }
  }

  getById(herbId) {
    return this.herbs.find((herb) => herb.id === herbId) || null;
  }

  getVisibleHerbs() {
    return this.herbs.filter((herb) => herb.loadsRemaining > 0);
  }
}

function createHerbs({ world, count, reservedKeys }) {
  const candidates = world.tiles.filter((tile) => {
    if (!isTilePassable(tile) || reservedKeys.has(tile.id)) {
      return false;
    }

    return tile.type === "scrub" || tile.type === "oasis";
  });
  const herbs = [];
  let cursor = Math.floor(Math.random() * Math.max(1, candidates.length));

  while (herbs.length < count && candidates.length > 0) {
    cursor = (cursor + 5 + Math.floor(Math.random() * 13)) % candidates.length;
    const tile = candidates.splice(cursor, 1)[0];

    herbs.push({
      id: `herb-${tile.id}`,
      column: tile.column,
      row: tile.row,
      loadsRemaining: DEFAULT_HERB_LOADS,
      reservedBy: null,
    });
  }

  return herbs;
}
