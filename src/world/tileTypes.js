export const TILE_TYPES = {
  sand: {
    label: "Open Sand",
    movementCost: 2,
    passable: true,
    colors: {
      light: "#eec878",
      base: "#d7a85d",
      shadow: "#a87436",
    },
  },
  dune: {
    label: "Crescent Dune",
    movementCost: 2,
    passable: true,
    colors: {
      light: "#f3d08b",
      base: "#d9a85b",
      shadow: "#a96c32",
    },
  },
  rock: {
    label: "Mountain Ridge",
    movementCost: Infinity,
    passable: false,
    colors: {
      light: "#d9ad78",
      base: "#b88455",
      shadow: "#7d5537",
    },
  },
  scrub: {
    label: "Dry Scrub",
    movementCost: 1,
    passable: true,
    colors: {
      light: "#ddbf77",
      base: "#c79b57",
      shadow: "#8f7138",
    },
  },
  salt: {
    label: "Salt Flat",
    movementCost: 1,
    passable: true,
    colors: {
      light: "#efe1b9",
      base: "#d2c18e",
      shadow: "#a29268",
    },
  },
  oasis: {
    label: "Oasis",
    movementCost: 1,
    passable: true,
    colors: {
      light: "#e4c47d",
      base: "#bd9653",
      shadow: "#806434",
    },
  },
};

export function getTileMovementCost(tile) {
  return TILE_TYPES[tile.type].movementCost;
}

export function isTilePassable(tile) {
  return TILE_TYPES[tile.type].passable;
}
