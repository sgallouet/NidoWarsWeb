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
  grass: {
    label: "Temperate Meadow",
    movementCost: 1,
    passable: true,
    colors: {
      light: "#b7d486",
      base: "#7fa961",
      shadow: "#4f7448",
    },
  },
  forest: {
    label: "Old Forest",
    movementCost: 1.25,
    passable: true,
    colors: {
      light: "#9cbf72",
      base: "#5f8b56",
      shadow: "#345b3f",
    },
  },
  flower: {
    label: "Paradise Bloom",
    movementCost: 1,
    passable: true,
    colors: {
      light: "#d6e892",
      base: "#8fcf77",
      shadow: "#4e9462",
    },
  },
  snow: {
    label: "Snowfield",
    movementCost: 1.5,
    passable: true,
    colors: {
      light: "#f7fbff",
      base: "#d7e7ec",
      shadow: "#9cb7c3",
    },
  },
  ice: {
    label: "Blue Ice",
    movementCost: 1.35,
    passable: true,
    colors: {
      light: "#e6fbff",
      base: "#a9dbe6",
      shadow: "#6fa7bc",
    },
  },
  ash: {
    label: "Ash Plain",
    movementCost: 1.25,
    passable: true,
    colors: {
      light: "#9a928b",
      base: "#675f5b",
      shadow: "#3e3938",
    },
  },
  obsidian: {
    label: "Obsidian Ridge",
    movementCost: Infinity,
    passable: false,
    colors: {
      light: "#6b646d",
      base: "#332f38",
      shadow: "#18161d",
    },
  },
  lava: {
    label: "Lava Flow",
    movementCost: Infinity,
    passable: false,
    colors: {
      light: "#ffb457",
      base: "#e3502e",
      shadow: "#641f25",
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
  water: {
    label: "Grand Lake",
    movementCost: Infinity,
    passable: false,
    colors: {
      light: "#48d7cf",
      base: "#168e98",
      shadow: "#07556d",
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
