const DIRECTIONS = [
  { column: 1, row: 0 },
  { column: -1, row: 0 },
  { column: 0, row: 1 },
  { column: 0, row: -1 },
];

export function findReachableTiles({ world, start, maxDistance, blockedKeys }) {
  const startKey = toKey(start.column, start.row);
  const frontier = [{ column: start.column, row: start.row }];
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
    const current = frontier.shift();
    const currentNode = visited.get(toKey(current.column, current.row));

    if (currentNode.distance >= maxDistance) {
      continue;
    }

    for (const direction of DIRECTIONS) {
      const next = {
        column: current.column + direction.column,
        row: current.row + direction.row,
      };
      const nextKey = toKey(next.column, next.row);

      if (visited.has(nextKey) || blockedKeys.has(nextKey)) {
        continue;
      }

      if (!world.getTile(next.column, next.row)) {
        continue;
      }

      visited.set(nextKey, {
        column: next.column,
        row: next.row,
        distance: currentNode.distance + 1,
        previous: toKey(current.column, current.row),
      });
      frontier.push(next);
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

export function toKey(column, row) {
  return `${column}:${row}`;
}
