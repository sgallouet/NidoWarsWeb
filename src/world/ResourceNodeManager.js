import { isTilePassable } from "./tileTypes.js";

const RESOURCE_DEFINITIONS = {
  fish: {
    label: "Fish Shoal",
    loads: 4,
    value: 1,
    tileTypes: new Set(["water"]),
  },
  berries: {
    label: "Berry Bush",
    loads: 5,
    value: 1,
    tileTypes: new Set(["forest", "flower", "grass"]),
  },
  wood: {
    label: "Timber Tree",
    loads: 4,
    value: 1,
    tileTypes: new Set(["forest"]),
  },
  rock: {
    label: "Rock Deposit",
    loads: 5,
    value: 1,
    tileTypes: new Set(["rock", "obsidian"]),
  },
};

export class ResourceNodeManager {
  constructor({ world, counts, reservedKeys = new Set() }) {
    this.world = world;
    this.nodes = Object.entries(counts).flatMap(([type, count]) =>
      createNodes({ world, type, count, reservedKeys }),
    );
  }

  getNodeAt(column, row) {
    return this.nodes.find(
      (node) => node.column === column && node.row === row && node.loadsRemaining > 0 && !node.reservedBy,
    );
  }

  reserve(nodeId, unitId) {
    const node = this.getById(nodeId);

    if (!node || node.loadsRemaining <= 0 || node.reservedBy) {
      return false;
    }

    node.reservedBy = unitId;
    return true;
  }

  pickLoad(nodeId, unitId) {
    const node = this.getById(nodeId);

    if (!node || node.loadsRemaining <= 0 || node.reservedBy !== unitId) {
      return null;
    }

    node.loadsRemaining -= 1;
    return {
      type: node.type,
      value: node.value,
    };
  }

  release(nodeId, unitId) {
    const node = this.getById(nodeId);

    if (node && (!unitId || node.reservedBy === unitId)) {
      node.reservedBy = null;
    }
  }

  getById(nodeId) {
    return this.nodes.find((node) => node.id === nodeId) || null;
  }

  getVisibleNodes() {
    return this.nodes.filter((node) => node.loadsRemaining > 0);
  }
}

function createNodes({ world, type, count, reservedKeys }) {
  const definition = RESOURCE_DEFINITIONS[type];
  const candidates = world.tiles.filter((tile) => isResourceCandidate(tile, definition, reservedKeys));
  const nodes = [];
  let cursor = Math.floor(Math.random() * Math.max(1, candidates.length));

  while (nodes.length < count && candidates.length > 0) {
    cursor = (cursor + 3 + Math.floor(Math.random() * 17)) % candidates.length;
    const tile = candidates.splice(cursor, 1)[0];

    nodes.push({
      id: `${type}-${tile.id}`,
      type,
      label: definition.label,
      column: tile.column,
      row: tile.row,
      loadsRemaining: definition.loads,
      value: definition.value,
      reservedBy: null,
    });
    reservedKeys.add(tile.id);
  }

  return nodes;
}

function isResourceCandidate(tile, definition, reservedKeys) {
  if (!definition.tileTypes.has(tile.type) || reservedKeys.has(tile.id)) {
    return false;
  }

  if (tile.type === "water" || tile.type === "rock" || tile.type === "obsidian") {
    return true;
  }

  return isTilePassable(tile);
}
