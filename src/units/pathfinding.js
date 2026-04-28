import { getTileMovementCost, isTilePassable } from "../world/tileTypes.js";

const DIRECTIONS = [
  { column: 1, row: 0 },
  { column: -1, row: 0 },
  { column: 0, row: 1 },
  { column: 0, row: -1 },
];

export function findPath({ world, start, destination, blockedKeys = new Set() }) {
  const destinationKey = toKey(destination.column, destination.row);
  const reachable = findReachableTiles({
    world,
    start,
    maxDistance: Infinity,
    blockedKeys,
    stopKey: destinationKey,
  });

  return buildPath(reachable, destination);
}

export function findReachableTiles({ world, start, maxDistance, blockedKeys, stopKey = null }) {
  const startKey = toKey(start.column, start.row);
  const frontier = [{ column: start.column, row: start.row, distance: 0 }];
  const visited = new Map([
    [
      startKey,
      {
        column: start.column,
        row: start.row,
        distance: 0,
        previous: null,
      },
    ],
  ]);

  while (frontier.length > 0) {
    frontier.sort((a, b) => a.distance - b.distance);
    const current = frontier.shift();
    const currentKey = toKey(current.column, current.row);
    const currentNode = visited.get(currentKey);

    if (stopKey && currentKey === stopKey) {
      break;
    }

    if (current.distance > currentNode.distance || currentNode.distance >= maxDistance) {
      continue;
    }

    for (const direction of DIRECTIONS) {
      const next = {
        column: current.column + direction.column,
        row: current.row + direction.row,
      };
      const nextKey = toKey(next.column, next.row);
      const tile = world.getTile(next.column, next.row);

      if (!tile || blockedKeys.has(nextKey) || !isTilePassable(tile)) {
        continue;
      }

      const nextDistance = currentNode.distance + getTileMovementCost(tile);

      if (nextDistance > maxDistance) {
        continue;
      }

      const existing = visited.get(nextKey);

      if (existing && existing.distance <= nextDistance) {
        continue;
      }

      visited.set(nextKey, {
        column: next.column,
        row: next.row,
        distance: nextDistance,
        previous: currentKey,
      });
      frontier.push({ ...next, distance: nextDistance });
    }
  }

  return visited;
}

export function buildPath(reachableTiles, destination) {
  const destinationKey = toKey(destination.column, destination.row);

  if (!reachableTiles.has(destinationKey)) {
    return [];
  }

  const path = [];
  let cursor = destinationKey;

  while (cursor) {
    const node = reachableTiles.get(cursor);

    path.push({
      column: node.column,
      row: node.row,
    });
    cursor = node.previous;
  }

  return path.reverse();
}

export function findNearestPassableTile(world, origin, blockedKeys = new Set()) {
  const maxRadius = Math.max(world.columns, world.rows);

  for (let radius = 0; radius < maxRadius; radius += 1) {
    for (let row = origin.row - radius; row <= origin.row + radius; row += 1) {
      for (let column = origin.column - radius; column <= origin.column + radius; column += 1) {
        const tile = world.getTile(column, row);

        if (!tile || blockedKeys.has(tile.id) || !isTilePassable(tile)) {
          continue;
        }

        return tile;
      }
    }
  }

  return null;
}

export function getRandomPassableTileNear(world, origin, radius, blockedKeys = new Set()) {
  const candidates = [];

  for (let row = origin.row - radius; row <= origin.row + radius; row += 1) {
    for (let column = origin.column - radius; column <= origin.column + radius; column += 1) {
      const tile = world.getTile(column, row);

      if (!tile || blockedKeys.has(tile.id) || !isTilePassable(tile)) {
        continue;
      }

      const distance = Math.abs(column - origin.column) + Math.abs(row - origin.row);

      if (distance > 0 && distance <= radius) {
        candidates.push(tile);
      }
    }
  }

  return candidates[Math.floor(Math.random() * candidates.length)] || null;
}

export function toKey(column, row) {
  return `${column}:${row}`;
}
