import { isTilePassable } from "./tileTypes.js";

const DEFAULT_HERB_LOADS = 5;
export const HERB_WORK_MS = 6000;
const MAX_HERB_WORKERS = 4;

export class HerbManager {
  constructor({ world, count, reservedKeys = new Set() }) {
    this.world = world;
    this.herbs = createHerbs({ world, count, reservedKeys });
  }

  getHerbAt(column, row) {
    return this.herbs.find(
      (herb) =>
        herb.column === column &&
        herb.row === row &&
        herb.loadsRemaining > 0 &&
        getReservationCount(herb) < getMaxHerbWorkers(herb),
    );
  }

  getActiveHerbAt(column, row) {
    return this.herbs.find(
      (herb) => herb.column === column && herb.row === row && herb.loadsRemaining > 0 && !herb.cleaned,
    );
  }

  getDepletedHerbAt(column, row) {
    return this.herbs.find(
      (herb) => herb.column === column && herb.row === row && herb.loadsRemaining <= 0 && !herb.cleaned,
    );
  }

  reserve(herbId, unitId) {
    const herb = this.getById(herbId);

    if (!herb || herb.loadsRemaining <= 0 || getReservationCount(herb) >= getMaxHerbWorkers(herb)) {
      return false;
    }

    herb.reservedBy.add(unitId);
    return true;
  }

  pickLoad(herbId, unitId) {
    const herb = this.getById(herbId);

    if (!herb || herb.loadsRemaining <= 0 || !herb.reservedBy.has(unitId)) {
      return false;
    }

    herb.loadsRemaining -= 1;
    herb.reservedBy.delete(unitId);
    return true;
  }

  release(herbId, unitId) {
    const herb = this.getById(herbId);

    if (herb && !unitId) {
      herb.reservedBy.clear();
    } else if (herb) {
      herb.reservedBy.delete(unitId);
    }
  }

  getById(herbId) {
    return this.herbs.find((herb) => herb.id === herbId) || null;
  }

  getVisibleHerbs() {
    return this.herbs.filter((herb) => herb.loadsRemaining > 0 && !herb.cleaned);
  }

  cleanAt(column, row) {
    const herb = this.getDepletedHerbAt(column, row);

    if (!herb) {
      return false;
    }

    herb.cleaned = true;
    herb.reservedBy.clear();
    return true;
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
      reservedBy: new Set(),
      cleaned: false,
    });
    reservedKeys.add(tile.id);
  }

  return herbs;
}

function getReservationCount(herb) {
  return herb.reservedBy?.size || 0;
}

function getMaxHerbWorkers(herb) {
  return Math.min(MAX_HERB_WORKERS, herb.loadsRemaining);
}
