import { TILE_TYPES } from "./tileTypes.js";

const BIOME_CENTERS = [
  { id: "snow", label: "Snow Mountain", column: 0.18, row: 0.18 },
  { id: "desert", label: "Desert Expanse", column: 0.78, row: 0.23 },
  { id: "temperate", label: "Temperate Wilds", column: 0.5, row: 0.52 },
  { id: "volcanic", label: "Volcanic Scar", column: 0.2, row: 0.82 },
  { id: "paradise", label: "Paradise Reach", column: 0.82, row: 0.78 },
];

export function createDesertMap({ columns, rows, seed = Date.now() }) {
  const tiles = [];
  const campCenter = {
    column: Math.floor(columns / 2),
    row: Math.floor(rows / 2),
  };
  const lakeCenter = {
    column: Math.floor(columns * 0.36 + hash(seed, 12, 4) * 5),
    row: Math.floor(rows * 0.68 + hash(seed, 7, 17) * 4),
  };

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const tileSeed = hash(seed, column, row);
      const biome = chooseBiome({ column, row, columns, rows, seed, campCenter });
      const duneBand = Math.sin((column + seed * 0.01) * 0.38) + Math.cos(row * 0.29);
      const ridge = Math.sin((column - row) * 0.21 + seed) * 0.5;
      const dryness = noise(seed, column * 0.16, row * 0.16);
      const mineral = noise(seed + 81, column * 0.15, row * 0.15);
      const roughness = noise(seed + 191, column * 0.23, row * 0.23);
      const lakeDistance = normalizedDistance(column, row, lakeCenter.column, lakeCenter.row, 8.4, 5.8);
      const campDistance = distanceTo(column, row, campCenter.column, campCenter.row);
      const forceOpenCamp = campDistance <= 6.2;
      const type = chooseType({
        biome: biome.id,
        duneBand,
        ridge,
        dryness,
        mineral,
        roughness,
        lakeDistance,
        forceOpenCamp,
      });

      tiles.push({
        id: `${column}:${row}`,
        column,
        row,
        type,
        biome: biome.id,
        biomeLabel: biome.label,
        label: TILE_TYPES[type].label,
        seed: tileSeed,
        texture: tileSeed,
        elevation: getElevation(type, duneBand, ridge, roughness),
        lightness: (tileSeed - 0.5) * 0.055,
        isEmpty: false,
        hasRoad: false,
        canBuild: false,
        building: null,
      });
    }
  }

  const world = {
    seed,
    columns,
    rows,
    version: 0,
    tiles,
    tilesByDrawOrder: [...tiles].sort((a, b) => a.column + a.row - (b.column + b.row)),
    getTile(column, row) {
      if (column < 0 || row < 0 || column >= columns || row >= rows) {
        return null;
      }

      return tiles[row * columns + column];
    },
    touchTile() {
      this.version += 1;
    },
  };

  repairUnreachableTerrain({
    tiles,
    columns,
    rows,
    campCenter,
  });

  return world;
}

function repairUnreachableTerrain({ tiles, columns, rows, campCenter }) {
  const start = findNearestPassableTile({ tiles, columns, rows, origin: campCenter });

  if (!start) {
    return;
  }

  let reachable = collectReachableTiles({ tiles, columns, rows, start });
  const components = collectUnreachableComponents({ tiles, columns, rows, reachable });

  for (const component of components) {
    const anchor = component.reduce((best, tile) =>
      distanceTo(tile.column, tile.row, campCenter.column, campCenter.row) <
      distanceTo(best.column, best.row, campCenter.column, campCenter.row)
        ? tile
        : best,
    );

    carvePathToReachable({
      tiles,
      columns,
      rows,
      from: anchor,
      reachable,
    });
    reachable = collectReachableTiles({ tiles, columns, rows, start });
  }
}

function collectReachableTiles({ tiles, columns, rows, start }) {
  const reachable = new Set();
  const queue = [start];
  reachable.add(start.id);

  while (queue.length > 0) {
    const current = queue.shift();

    for (const neighbor of getNeighbors({ tiles, columns, rows, tile: current })) {
      if (reachable.has(neighbor.id) || !isPassableTile(neighbor)) {
        continue;
      }

      reachable.add(neighbor.id);
      queue.push(neighbor);
    }
  }

  return reachable;
}

function collectUnreachableComponents({ tiles, columns, rows, reachable }) {
  const visited = new Set(reachable);
  const components = [];

  for (const tile of tiles) {
    if (visited.has(tile.id) || !isPassableTile(tile)) {
      continue;
    }

    const component = [];
    const queue = [tile];
    visited.add(tile.id);

    while (queue.length > 0) {
      const current = queue.shift();
      component.push(current);

      for (const neighbor of getNeighbors({ tiles, columns, rows, tile: current })) {
        if (visited.has(neighbor.id) || !isPassableTile(neighbor)) {
          continue;
        }

        visited.add(neighbor.id);
        queue.push(neighbor);
      }
    }

    components.push(component);
  }

  return components;
}

function carvePathToReachable({ tiles, columns, rows, from, reachable }) {
  let current = from;
  const target = findClosestReachableTile({ tiles, columns, rows, from, reachable });
  const visited = new Set();

  if (!target) {
    return;
  }

  while (current && current.id !== target.id && !visited.has(current.id)) {
    visited.add(current.id);
    makeTilePassable(current);

    const nextColumn =
      current.column === target.column ? current.column : current.column + Math.sign(target.column - current.column);
    const nextRow =
      current.column === target.column && current.row !== target.row
        ? current.row + Math.sign(target.row - current.row)
        : current.row;

    current = getTileAt(tiles, columns, rows, nextColumn, nextRow);
  }

  if (current) {
    makeTilePassable(current);
  }
}

function findClosestReachableTile({ tiles, columns, rows, from, reachable }) {
  let bestTile = null;
  let bestDistance = Infinity;

  for (const key of reachable) {
    const [column, row] = key.split(":").map(Number);
    const tile = getTileAt(tiles, columns, rows, column, row);
    const distance = Math.abs(from.column - column) + Math.abs(from.row - row);

    if (tile && distance < bestDistance) {
      bestTile = tile;
      bestDistance = distance;
    }

    if (bestDistance <= 1) {
      return bestTile;
    }
  }

  return bestTile;
}

function findNearestPassableTile({ tiles, columns, rows, origin }) {
  for (let radius = 0; radius < Math.max(columns, rows); radius += 1) {
    for (let row = origin.row - radius; row <= origin.row + radius; row += 1) {
      for (let column = origin.column - radius; column <= origin.column + radius; column += 1) {
        const tile = getTileAt(tiles, columns, rows, column, row);

        if (tile && isPassableTile(tile)) {
          return tile;
        }
      }
    }
  }

  return null;
}

function getNeighbors({ tiles, columns, rows, tile }) {
  return [
    getTileAt(tiles, columns, rows, tile.column + 1, tile.row),
    getTileAt(tiles, columns, rows, tile.column - 1, tile.row),
    getTileAt(tiles, columns, rows, tile.column, tile.row + 1),
    getTileAt(tiles, columns, rows, tile.column, tile.row - 1),
  ].filter(Boolean);
}

function getTileAt(tiles, columns, rows, column, row) {
  if (column < 0 || row < 0 || column >= columns || row >= rows) {
    return null;
  }

  return tiles[row * columns + column];
}

function isPassableTile(tile) {
  return TILE_TYPES[tile.type].passable;
}

function makeTilePassable(tile) {
  if (isPassableTile(tile)) {
    return;
  }

  tile.type = getBridgeType(tile.biome);
  tile.label = TILE_TYPES[tile.type].label;
  tile.elevation = 0;
}

function getBridgeType(biome) {
  if (biome === "snow") {
    return "snow";
  }

  if (biome === "volcanic") {
    return "ash";
  }

  if (biome === "temperate" || biome === "paradise") {
    return "grass";
  }

  return "scrub";
}

function chooseBiome({ column, row, columns, rows, seed, campCenter }) {
  if (distanceTo(column, row, campCenter.column, campCenter.row) <= 7.5) {
    return BIOME_CENTERS.find((biome) => biome.id === "temperate");
  }

  const normalizedColumn = column / Math.max(1, columns - 1);
  const normalizedRow = row / Math.max(1, rows - 1);
  let bestBiome = BIOME_CENTERS[0];
  let bestScore = Infinity;

  for (const biome of BIOME_CENTERS) {
    const warp = (noise(seed + biome.id.length * 31, normalizedColumn * 4, normalizedRow * 4) - 0.5) * 0.12;
    const dx = normalizedColumn - biome.column + warp;
    const dy = normalizedRow - biome.row - warp;
    const score = dx * dx + dy * dy;

    if (score < bestScore) {
      bestBiome = biome;
      bestScore = score;
    }
  }

  return bestBiome;
}

function chooseType({ biome, duneBand, ridge, dryness, mineral, roughness, lakeDistance, forceOpenCamp }) {
  if (forceOpenCamp) {
    if (dryness < 0.22 && roughness > 0.42) {
      return "forest";
    }

    return dryness > 0.66 ? "grass" : "scrub";
  }

  if ((biome === "temperate" || biome === "paradise") && lakeDistance < 1) {
    return "water";
  }

  if (biome === "snow") {
    if (roughness > 0.68 || ridge > 0.34) {
      return "rock";
    }

    return mineral > 0.66 ? "ice" : "snow";
  }

  if (biome === "volcanic") {
    if (mineral > 0.72 || ridge > 0.42) {
      return "lava";
    }

    if (roughness > 0.62) {
      return "obsidian";
    }

    return "ash";
  }

  if (biome === "paradise") {
    if (mineral > 0.78) {
      return "oasis";
    }

    return dryness < 0.44 ? "flower" : "grass";
  }

  if (biome === "temperate") {
    if (roughness > 0.74 || ridge > 0.42) {
      return "rock";
    }

    return dryness < 0.42 ? "forest" : "grass";
  }

  if (mineral > 0.78 && dryness < 0.58) {
    return "salt";
  }

  if (roughness > 0.72 || ridge > 0.38) {
    return "rock";
  }

  if (dryness < 0.23 && roughness > 0.36) {
    return "scrub";
  }

  if (duneBand > 0.55 || dryness > 0.68) {
    return "dune";
  }

  return "sand";
}

function getElevation(type, duneBand, ridge, roughness) {
  if (type === "water" || type === "lava") {
    return 0;
  }

  if (type === "rock" || type === "obsidian") {
    return 2 + Math.max(0, Math.round((roughness + ridge) * 1.5));
  }

  return Math.max(0, Math.round((duneBand + ridge + roughness - 0.74) * 1.45));
}

function distanceTo(column, row, targetColumn, targetRow) {
  const dx = column - targetColumn;
  const dy = row - targetRow;

  return Math.sqrt(dx * dx + dy * dy);
}

function normalizedDistance(column, row, targetColumn, targetRow, radiusX, radiusY) {
  const dx = (column - targetColumn) / radiusX;
  const dy = (row - targetRow) / radiusY;

  return Math.sqrt(dx * dx + dy * dy);
}

function noise(seed, x, y) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = smoothstep(x - ix);
  const fy = smoothstep(y - iy);
  const a = hash(seed, ix, iy);
  const b = hash(seed, ix + 1, iy);
  const c = hash(seed, ix, iy + 1);
  const d = hash(seed, ix + 1, iy + 1);

  return lerp(lerp(a, b, fx), lerp(c, d, fx), fy);
}

function hash(seed, x, y) {
  const value = Math.sin(seed * 91.7 + x * 127.1 + y * 311.7) * 43758.5453123;

  return value - Math.floor(value);
}

function smoothstep(value) {
  return value * value * (3 - 2 * value);
}

function lerp(a, b, amount) {
  return a + (b - a) * amount;
}
