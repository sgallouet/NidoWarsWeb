export const UNIT_DEFINITIONS = {
  duneVanguard: {
    label: "Dune Vanguard",
    faction: "player",
    role: "Warrior",
    moveRange: 5,
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
    moveRange: 3,
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
    moveRange: 4,
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
    moveRange: 2,
    colors: {
      primary: "#6f854d",
      secondary: "#c2a75c",
      accent: "#efe8a8",
      shadow: "#354226",
    },
  },
};

export function createStartingUnits(world) {
  const occupied = new Set();
  const reserve = (column, row) => {
    occupied.add(`${column}:${row}`);
    return { column, row };
  };
  const warrior = reserve(...findNearestOpenTile(world, 14, 15, occupied));
  const ember = reserve(...findNearestOpenTile(world, 9, 18, occupied));
  const glass = reserve(...findNearestOpenTile(world, 20, 11, occupied));
  const thorn = reserve(...findNearestOpenTile(world, 22, 20, occupied));

  return [
    createUnit({
      id: "warrior-01",
      definition: "duneVanguard",
      name: "Asha",
      column: warrior.column,
      row: warrior.row,
    }),
    createUnit({
      id: "monster-ember-01",
      definition: "emberMaw",
      name: "Ember Maw",
      column: ember.column,
      row: ember.row,
    }),
    createUnit({
      id: "monster-glass-01",
      definition: "glassStalker",
      name: "Glass Stalker",
      column: glass.column,
      row: glass.row,
    }),
    createUnit({
      id: "monster-thorn-01",
      definition: "thornback",
      name: "Thornback",
      column: thorn.column,
      row: thorn.row,
    }),
  ];
}

function findNearestOpenTile(world, originColumn, originRow, occupied) {
  for (let radius = 0; radius < Math.max(world.columns, world.rows); radius += 1) {
    for (let row = originRow - radius; row <= originRow + radius; row += 1) {
      for (let column = originColumn - radius; column <= originColumn + radius; column += 1) {
        const tile = world.getTile(column, row);
        const key = `${column}:${row}`;

        if (!tile || occupied.has(key) || tile.type === "rock") {
          continue;
        }

        return [column, row];
      }
    }
  }

  return [originColumn, originRow];
}

function createUnit({ id, definition, name, column, row }) {
  const template = UNIT_DEFINITIONS[definition];

  return {
    ...template,
    id,
    definition,
    name,
    column,
    row,
    visualColumn: column,
    visualRow: row,
    movementQueue: [],
    movementSegment: null,
  };
}
