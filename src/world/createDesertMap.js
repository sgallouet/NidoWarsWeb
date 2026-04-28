import { TILE_TYPES } from "./tileTypes.js";

export function createDesertMap({ columns, rows, seed }) {
  const tiles = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const tileSeed = hash(seed, column, row);
      const duneBand = Math.sin((column + seed * 0.01) * 0.48) + Math.cos(row * 0.34);
      const ridge = Math.sin((column - row) * 0.28 + seed) * 0.5;
      const dryness = noise(seed, column * 0.27, row * 0.27);
      const mineral = noise(seed + 81, column * 0.21, row * 0.21);
      const roughness = noise(seed + 191, column * 0.35, row * 0.35);
      const oasis = distanceTo(column, row, 7, 21) < 2.1 || distanceTo(column, row, 23, 8) < 1.8;
      const type = chooseType({ oasis, duneBand, ridge, dryness, mineral, roughness });

      tiles.push({
        id: `${column}:${row}`,
        column,
        row,
        type,
        label: TILE_TYPES[type].label,
        seed: tileSeed,
        texture: tileSeed,
        elevation: Math.max(0, Math.round((duneBand + ridge + roughness - 0.74) * 1.55)),
        lightness: (tileSeed - 0.5) * 0.055,
      });
    }
  }

  return {
    columns,
    rows,
    tiles,
    tilesByDrawOrder: [...tiles].sort((a, b) => a.column + a.row - (b.column + b.row)),
    getTile(column, row) {
      if (column < 0 || row < 0 || column >= columns || row >= rows) {
        return null;
      }

      return tiles[row * columns + column];
    },
  };
}

function chooseType({ oasis, duneBand, ridge, dryness, mineral, roughness }) {
  if (oasis) {
    return "oasis";
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

function distanceTo(column, row, targetColumn, targetRow) {
  const dx = column - targetColumn;
  const dy = row - targetRow;

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
