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

export function createStartingUnits() {
  return [
    createUnit({
      id: "warrior-01",
      definition: "duneVanguard",
      name: "Asha",
      column: 14,
      row: 15,
    }),
    createUnit({
      id: "monster-ember-01",
      definition: "emberMaw",
      name: "Ember Maw",
      column: 9,
      row: 18,
    }),
    createUnit({
      id: "monster-glass-01",
      definition: "glassStalker",
      name: "Glass Stalker",
      column: 20,
      row: 11,
    }),
    createUnit({
      id: "monster-thorn-01",
      definition: "thornback",
      name: "Thornback",
      column: 22,
      row: 20,
    }),
  ];
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
