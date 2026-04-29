import { isTilePassable } from "./tileTypes.js";

const RESOURCE_DEFINITIONS = {
  fish: {
    label: "Fish Shoal",
    loads: 4,
    value: 1,
    maxWorkers: 1,
    workMs: { min: 3000, max: 30000 },
    tileTypes: new Set(["water"]),
  },
  berries: {
    label: "Berry Bush",
    loads: 5,
    value: 1,
    maxWorkers: 4,
    workMs: 6000,
    tileTypes: new Set(["forest", "flower", "grass"]),
  },
  wood: {
    label: "Timber Tree",
    loads: 4,
    value: 1,
    maxWorkers: 4,
    workMs: 15000,
    tileTypes: new Set(["forest"]),
  },
  rock: {
    label: "Rock Deposit",
    loads: 5,
    value: 1,
    maxWorkers: 2,
    workMs: 12000,
    tileTypes: new Set(["rock", "obsidian"]),
  },
};

export function getResourceDefinition(type) {
  return RESOURCE_DEFINITIONS[type] || null;
}

export class ResourceNodeManager {
  constructor({ world, counts, reservedKeys = new Set() }) {
    this.world = world;
    this.nodes = Object.entries(counts).flatMap(([type, count]) =>
      createNodes({ world, type, count, reservedKeys }),
    );
  }

  getNodeAt(column, row) {
    return this.nodes.find(
      (node) =>
        node.column === column &&
        node.row === row &&
        node.loadsRemaining > 0 &&
        getReservationCount(node) < getMaxWorkers(node),
    );
  }

  getActiveNodeAt(column, row) {
    return this.nodes.find(
      (node) => node.column === column && node.row === row && node.loadsRemaining > 0 && !node.cleaned,
    );
  }

  getDepletedCleanableNodeAt(column, row) {
    return this.nodes.find(
      (node) =>
        node.column === column &&
        node.row === row &&
        node.loadsRemaining <= 0 &&
        !node.cleaned &&
        isCleanableNode(node),
    );
  }

  reserve(nodeId, unitId) {
    const node = this.getById(nodeId);

    if (!node || node.loadsRemaining <= 0 || getReservationCount(node) >= getMaxWorkers(node)) {
      return false;
    }

    node.reservedBy.add(unitId);
    return true;
  }

  pickLoad(nodeId, unitId) {
    const node = this.getById(nodeId);

    if (!node || node.loadsRemaining <= 0 || !node.reservedBy.has(unitId)) {
      return null;
    }

    node.loadsRemaining -= 1;
    node.reservedBy.delete(unitId);
    return {
      type: node.type,
      value: node.value,
    };
  }

  release(nodeId, unitId) {
    const node = this.getById(nodeId);

    if (node && !unitId) {
      node.reservedBy.clear();
    } else if (node) {
      node.reservedBy.delete(unitId);
    }
  }

  getById(nodeId) {
    return this.nodes.find((node) => node.id === nodeId) || null;
  }

  getVisibleNodes() {
    return this.nodes.filter((node) => node.loadsRemaining > 0 && !node.cleaned);
  }

  cleanAt(column, row) {
    const node = this.getDepletedCleanableNodeAt(column, row);

    if (!node) {
      return false;
    }

    node.cleaned = true;
    node.reservedBy.clear();
    return true;
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
      reservedBy: new Set(),
      cleaned: false,
    });
    reservedKeys.add(tile.id);
  }

  return nodes;
}

function isCleanableNode(node) {
  return node.type === "wood" || node.type === "berries" || node.type === "fish" || node.type === "rock";
}

function getMaxWorkers(node) {
  return Math.min(getResourceDefinition(node.type)?.maxWorkers || 1, node.loadsRemaining);
}

function getReservationCount(node) {
  return node.reservedBy?.size || 0;
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
