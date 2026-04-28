export const UNIT_DEFINITIONS = {
  duneVanguard: {
    label: "Dune Vanguard",
    faction: "player",
    role: "Warrior",
    speed: 1.7,
    patrolRadius: 5,
    colors: {
      primary: "#2b746f",
      secondary: "#f2cf79",
      accent: "#e8f8e7",
      shadow: "#183835",
    },
  },
  emberMaw: {
    label: "Ember Maw",
    faction: "monster",
    role: "Monster",
    speed: 1.25,
    patrolRadius: 6,
    colors: {
      primary: "#9e5035",
      secondary: "#e59a49",
      accent: "#ffe1a0",
      shadow: "#4d291f",
    },
  },
  glassStalker: {
    label: "Glass Stalker",
    faction: "monster",
    role: "Monster",
    speed: 1.45,
    patrolRadius: 7,
    colors: {
      primary: "#665e8f",
      secondary: "#b9c2dc",
      accent: "#80f1e4",
      shadow: "#353047",
    },
  },
  thornback: {
    label: "Thornback",
    faction: "monster",
    role: "Monster",
    speed: 1.05,
    patrolRadius: 5,
    colors: {
      primary: "#6f854d",
      secondary: "#c2a75c",
      accent: "#efe8a8",
      shadow: "#354226",
    },
  },
};

export function findCampTile(world) {
  return findNearestOpenTile(world, Math.floor(world.columns / 2), Math.floor(world.rows / 2), new Set());
}

export function createStartingUnits(world, campTile) {
  const occupied = new Set([campTile.id]);
  const reserve = (column, row) => {
    const tile = findNearestOpenTile(world, column, row, occupied);

    occupied.add(tile.id);
    return tile;
  };
  const playerSpawns = [
    reserve(campTile.column - 1, campTile.row),
    reserve(campTile.column + 1, campTile.row),
    reserve(campTile.column, campTile.row + 1),
  ];
  const monsterSpawns = [
    reserve(8, 20),
    reserve(22, 9),
    reserve(23, 21),
  ];

  return [
    createUnit({
      id: "warrior-asha",
      definition: "duneVanguard",
      name: "Asha",
      tile: playerSpawns[0],
    }),
    createUnit({
      id: "warrior-tor",
      definition: "duneVanguard",
      name: "Tor",
      tile: playerSpawns[1],
    }),
    createUnit({
      id: "warrior-vale",
      definition: "duneVanguard",
      name: "Vale",
      tile: playerSpawns[2],
    }),
    createUnit({
      id: "monster-ember-01",
      definition: "emberMaw",
      name: "Ember Maw",
      tile: monsterSpawns[0],
    }),
    createUnit({
      id: "monster-glass-01",
      definition: "glassStalker",
      name: "Glass Stalker",
      tile: monsterSpawns[1],
    }),
    createUnit({
      id: "monster-thorn-01",
      definition: "thornback",
      name: "Thornback",
      tile: monsterSpawns[2],
    }),
  ];
}

function createUnit({ id, definition, name, tile }) {
  const template = UNIT_DEFINITIONS[definition];

  return {
    ...template,
    id,
    definition,
    name,
    column: tile.column,
    row: tile.row,
    visualColumn: tile.column,
    visualRow: tile.row,
    movementQueue: [],
    movementSegment: null,
    order: template.faction === "player" ? "patrol" : "monsterPatrol",
    orderIcon: null,
    speech: null,
    pauseMs: Math.random() * 900,
    carryingTreasureId: null,
    escortTargetId: null,
    home: null,
  };
}

function findNearestOpenTile(world, originColumn, originRow, occupied) {
  for (let radius = 0; radius < Math.max(world.columns, world.rows); radius += 1) {
    for (let row = originRow - radius; row <= originRow + radius; row += 1) {
      for (let column = originColumn - radius; column <= originColumn + radius; column += 1) {
        const tile = world.getTile(column, row);

        if (!tile || occupied.has(tile.id) || tile.type === "rock") {
          continue;
        }

        return tile;
      }
    }
  }

  return world.getTile(originColumn, originRow);
}
