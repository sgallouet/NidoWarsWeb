import { isTilePassable } from "./tileTypes.js";

const DEFAULT_TREASURE_VALUE = 25;
const STATIC_TREASURE_AGE_MS = 2000;

export class TreasureManager {
  constructor({ world, count, reservedKeys = new Set() }) {
    this.world = world;
    this.treasures = createTreasures({ world, count, reservedKeys });
    this.nextDropId = 1;
  }

  update(delta) {
    for (const treasure of this.treasures) {
      if (treasure.status !== "collected" && treasure.ageMs < STATIC_TREASURE_AGE_MS) {
        treasure.ageMs += delta;
      }
    }
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
      return { gold: 0, items: [] };
    }

    treasure.status = "collected";
    treasure.carriedBy = null;
    return {
      gold: treasure.value || 0,
      items: treasure.items || [],
      label: treasure.label || "Treasure",
      category: treasure.category || "chest",
    };
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

  addLootDrop({ tile, loot }) {
    if (!tile || !loot || (loot.gold <= 0 && (!loot.items || loot.items.length === 0))) {
      return null;
    }

    const treasure = {
      id: `loot-${this.nextDropId}`,
      column: tile.column,
      row: tile.row,
      value: loot.gold || 0,
      items: loot.items || [],
      label: loot.label || loot.items?.[0]?.name || "Loot",
      category: "loot",
      status: "available",
      carriedBy: null,
      ageMs: 0,
      burstSeed: Math.random(),
    };

    this.nextDropId += 1;
    this.treasures.push(treasure);
    return treasure;
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
      items: [],
      label: "Treasure Chest",
      category: "chest",
      status: "available",
      carriedBy: null,
      ageMs: STATIC_TREASURE_AGE_MS,
      burstSeed: Math.random(),
    });
    reservedKeys.add(tile.id);
  }

  return treasures;
}
