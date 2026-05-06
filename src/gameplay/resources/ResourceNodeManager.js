import { isTilePassable } from "../../content/tiles/definitions.js";
import { RESOURCE_DEFINITIONS, getResourceDefinition } from "../../content/resources/definitions.js";

export { getResourceDefinition } from "../../content/resources/definitions.js";

export class ResourceNodeManager {
  constructor({ world, counts, reservedKeys = new Set(), startAreaReservedKeys = new Set() }) {
    this.world = world;
    this.nodes = Object.entries(counts).flatMap(([type, count]) =>
      createNodes({ world, type, count, reservedKeys, startAreaReservedKeys }),
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

function createNodes({ world, type, count, reservedKeys, startAreaReservedKeys }) {
  const definition = RESOURCE_DEFINITIONS[type];
  const candidates = world.tiles.filter((tile) =>
    isResourceCandidate(tile, definition, reservedKeys, world, startAreaReservedKeys),
  );
  const nodes = [];
  const preferredNodes = createPreferredStartAreaNodes({
    world,
    type,
    count,
    candidates,
    definition,
    reservedKeys,
  });
  const usedCandidateIds = new Set(preferredNodes.map((node) => `${node.column}:${node.row}`));
  const remainingCandidates = candidates.filter((tile) => !usedCandidateIds.has(tile.id));
  let cursor = Math.floor(Math.random() * Math.max(1, candidates.length));

  nodes.push(...preferredNodes);

  while (nodes.length < count && remainingCandidates.length > 0) {
    cursor = (cursor + 3 + Math.floor(Math.random() * 17)) % remainingCandidates.length;
    const tile = remainingCandidates.splice(cursor, 1)[0];

    nodes.push(createNode({ tile, type, definition }));
    reservedKeys.add(tile.id);
  }

  return nodes;
}

function createPreferredStartAreaNodes({ world, type, count, candidates, definition, reservedKeys }) {
  const startAreaSpawn = definition.startAreaSpawn;

  if (!startAreaSpawn || !world.campCenter) {
    return [];
  }

  const targetCount = Math.min(candidates.length, Math.round(count * startAreaSpawn.portion));
  const startCandidates = candidates
    .filter((tile) => isWithinStartAreaSpawn(tile, world, startAreaSpawn))
    .sort((a, b) => getStartAreaSortScore(a, world) - getStartAreaSortScore(b, world));
  const nodes = [];
  let cursor = Math.floor(Math.random() * Math.max(1, startCandidates.length));

  while (nodes.length < targetCount && startCandidates.length > 0) {
    cursor = (cursor + 2 + Math.floor(Math.random() * 7)) % startCandidates.length;
    const tile = startCandidates.splice(cursor, 1)[0];

    nodes.push(createNode({ tile, type, definition }));
    reservedKeys.add(tile.id);
  }

  return nodes;
}

function createNode({ tile, type, definition }) {
  return {
    id: `${type}-${tile.id}`,
    type,
    label: definition.label,
    column: tile.column,
    row: tile.row,
    loadsRemaining: definition.loads,
    value: definition.value,
    reservedBy: new Set(),
    cleaned: false,
  };
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

function isResourceCandidate(tile, definition, reservedKeys, world, startAreaReservedKeys) {
  if (!definition.tileTypes.has(tile.type)) {
    return false;
  }

  if (
    reservedKeys.has(tile.id) &&
    !canUseReservedStartAreaTile(tile, definition, world, startAreaReservedKeys)
  ) {
    return false;
  }

  if (tile.type === "water" || tile.type === "rock" || tile.type === "obsidian") {
    return true;
  }

  return isTilePassable(tile);
}

function canUseReservedStartAreaTile(tile, definition, world, startAreaReservedKeys) {
  return Boolean(
    definition.startAreaSpawn &&
      world.campCenter &&
      startAreaReservedKeys.has(tile.id) &&
      isWithinStartAreaSpawn(tile, world, definition.startAreaSpawn),
  );
}

function isWithinStartAreaSpawn(tile, world, startAreaSpawn) {
  const distance = getDistanceFromCamp(tile, world);

  return distance >= startAreaSpawn.minDistance && distance <= startAreaSpawn.maxDistance;
}

function getStartAreaSortScore(tile, world) {
  const distance = getDistanceFromCamp(tile, world);
  const roughness = Math.abs(tile.column - world.campCenter.column) + Math.abs(tile.row - world.campCenter.row);

  return distance + roughness * 0.025 + getTileJitter(tile) * 1.8;
}

function getDistanceFromCamp(tile, world) {
  const dx = tile.column - world.campCenter.column;
  const dy = tile.row - world.campCenter.row;

  return Math.sqrt(dx * dx + dy * dy);
}

function getTileJitter(tile) {
  const value = Math.sin((tile.seed || 0.5) * 91.7 + tile.column * 127.1 + tile.row * 311.7) * 43758.5453;

  return value - Math.floor(value);
}
