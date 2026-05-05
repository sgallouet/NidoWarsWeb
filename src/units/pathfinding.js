import { getTileMovementCost, isTilePassable } from "../world/tileTypes.js";

const DIRECTIONS = [
  { column: 1, row: 0 },
  { column: -1, row: 0 },
  { column: 0, row: 1 },
  { column: 0, row: -1 },
];

export function findPath({ world, start, destination, blockedKeys = new Set() }) {
  const search = createPathSearch({
    world,
    start,
    destination,
    blockedKeys,
  });

  search.run();
  return search.getPath();
}

export function findReachableTiles({ world, start, maxDistance, blockedKeys, stopKey = null }) {
  const search = createPathSearch({
    world,
    start,
    maxDistance,
    blockedKeys,
    stopKey,
  });

  search.run();
  return search.reachableTiles;
}

export function createPathSearch({
  world,
  start,
  destination = null,
  maxDistance = Infinity,
  blockedKeys = new Set(),
  stopKey = destination ? toKey(destination.column, destination.row) : null,
}) {
  const startKey = toKey(start.column, start.row);
  const frontier = new MinHeap((a, b) => a.distance - b.distance);
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
  let isDone = false;

  frontier.push({ column: start.column, row: start.row, distance: 0 });

  return {
    get done() {
      return isDone;
    },
    get reachableTiles() {
      return visited;
    },
    run() {
      this.step(() => true);
    },
    step(shouldContinue = () => true) {
      while (!isDone && frontier.size > 0 && shouldContinue()) {
        stepSearch();
      }

      if (frontier.size === 0) {
        isDone = true;
      }

      return isDone;
    },
    getPath() {
      if (!destination) {
        return [];
      }

      return buildPath(visited, destination);
    },
  };

  function stepSearch() {
    const current = frontier.pop();
    const currentKey = toKey(current.column, current.row);
    const currentNode = visited.get(currentKey);

    if (stopKey && currentKey === stopKey) {
      isDone = true;
      return;
    }

    if (current.distance > currentNode.distance || currentNode.distance >= maxDistance) {
      return;
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
      frontier.push({ column: next.column, row: next.row, distance: nextDistance });
    }
  }
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

class MinHeap {
  constructor(compare) {
    this.compare = compare;
    this.items = [];
  }

  get size() {
    return this.items.length;
  }

  push(item) {
    this.items.push(item);
    this.siftUp(this.items.length - 1);
  }

  pop() {
    const first = this.items[0];
    const last = this.items.pop();

    if (this.items.length > 0) {
      this.items[0] = last;
      this.siftDown(0);
    }

    return first;
  }

  siftUp(index) {
    let child = index;

    while (child > 0) {
      const parent = Math.floor((child - 1) / 2);

      if (this.compare(this.items[child], this.items[parent]) >= 0) {
        return;
      }

      this.swap(child, parent);
      child = parent;
    }
  }

  siftDown(index) {
    let parent = index;

    while (true) {
      const left = parent * 2 + 1;
      const right = left + 1;
      let smallest = parent;

      if (left < this.items.length && this.compare(this.items[left], this.items[smallest]) < 0) {
        smallest = left;
      }

      if (right < this.items.length && this.compare(this.items[right], this.items[smallest]) < 0) {
        smallest = right;
      }

      if (smallest === parent) {
        return;
      }

      this.swap(parent, smallest);
      parent = smallest;
    }
  }

  swap(first, second) {
    const item = this.items[first];

    this.items[first] = this.items[second];
    this.items[second] = item;
  }
}
