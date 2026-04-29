import { isTilePassable } from "../world/tileTypes.js";

const MONSTER_START_EXCLUSION_RADIUS = 12;

export const UNIT_DEFINITIONS = {
  duneVanguard: {
    label: "Dune Vanguard",
    faction: "player",
    role: "Warrior",
    speed: 1.7,
    patrolRadius: 5,
    health: 5,
    attackDamage: 1,
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
    temperament: "scary",
    role: "Monster",
    speed: 1.25,
    patrolRadius: 6,
    health: 4,
    attackDamage: 1,
    colors: {
      primary: "#9e5035",
      secondary: "#e59a49",
      accent: "#ffe1a0",
      shadow: "#4d291f",
    },
  },
  frostHorn: {
    label: "Frost Horn",
    faction: "monster",
    temperament: "scary",
    role: "Snow Monster",
    speed: 1.1,
    patrolRadius: 7,
    health: 5,
    attackDamage: 2,
    body: "thornback",
    colors: {
      primary: "#b8d4de",
      secondary: "#f4fbff",
      accent: "#7be1f2",
      shadow: "#537284",
    },
  },
  groveStalker: {
    label: "Grove Stalker",
    faction: "monster",
    temperament: "scary",
    role: "Forest Monster",
    speed: 1.35,
    patrolRadius: 7,
    health: 4,
    attackDamage: 1,
    body: "thornback",
    colors: {
      primary: "#476d44",
      secondary: "#9abf6f",
      accent: "#f0e6a2",
      shadow: "#253d2c",
    },
  },
  cinderMaw: {
    label: "Cinder Maw",
    faction: "monster",
    temperament: "scary",
    role: "Volcanic Monster",
    speed: 1.25,
    patrolRadius: 7,
    health: 5,
    attackDamage: 2,
    body: "emberMaw",
    colors: {
      primary: "#6c2425",
      secondary: "#ff7a36",
      accent: "#ffd45f",
      shadow: "#251718",
    },
  },
  bloomWisp: {
    label: "Bloom Wisp",
    faction: "monster",
    temperament: "friendly",
    role: "Paradise Spirit",
    speed: 1.7,
    patrolRadius: 6,
    health: 2,
    body: "glassStalker",
    colors: {
      primary: "#8fcf77",
      secondary: "#ffc0d4",
      accent: "#fff4a3",
      shadow: "#476a54",
    },
  },
  glassStalker: {
    label: "Glass Stalker",
    faction: "monster",
    temperament: "scary",
    role: "Monster",
    speed: 1.45,
    patrolRadius: 7,
    health: 3,
    attackDamage: 1,
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
    temperament: "scary",
    role: "Monster",
    speed: 1.05,
    patrolRadius: 5,
    health: 5,
    attackDamage: 2,
    colors: {
      primary: "#6f854d",
      secondary: "#c2a75c",
      accent: "#efe8a8",
      shadow: "#354226",
    },
  },
  duneHare: {
    label: "Dune Hare",
    faction: "monster",
    temperament: "friendly",
    role: "Critter",
    speed: 1.8,
    patrolRadius: 4,
    health: 1,
    decorative: true,
    scale: 0.52,
    colors: {
      primary: "#cda66b",
      secondary: "#f3ddb0",
      accent: "#fff6d9",
      shadow: "#735839",
    },
  },
  sunBird: {
    label: "Sun Bird",
    faction: "monster",
    temperament: "friendly",
    role: "Critter",
    speed: 2,
    patrolRadius: 20,
    health: 1,
    canFly: true,
    decorative: true,
    scale: 0.42,
    colors: {
      primary: "#d9a24b",
      secondary: "#f4d676",
      accent: "#fff4b7",
      shadow: "#7c5b2d",
    },
  },
};

export function findCampTile(world) {
  return findNearestOpenTile(world, Math.floor(world.columns / 2), Math.floor(world.rows / 2), new Set());
}

export function createStartingUnits(world, campTile) {
  const occupied = new Set([campTile.id]);
  const monsterSpawnOptions = {
    minDistanceFrom: campTile,
    minDistance: MONSTER_START_EXCLUSION_RADIUS,
  };
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
  const monsterSpawns = {
    snow: reserveBiome(world, "snow", occupied, 10, 10, monsterSpawnOptions),
    desert: reserveBiome(world, "desert", occupied, 48, 14, monsterSpawnOptions),
    temperate: reserveBiome(world, "temperate", occupied, 30, 34, monsterSpawnOptions),
    volcanic: reserveBiome(world, "volcanic", occupied, 12, 49, monsterSpawnOptions),
    paradise: reserveBiome(world, "paradise", occupied, 50, 50, monsterSpawnOptions),
  };
  const critterSpawns = [
    reserveBiome(world, "desert", occupied, 45, 18),
    reserveBiome(world, "paradise", occupied, 51, 46),
    reserveBiome(world, "temperate", occupied, 25, 31),
    reserveBiome(world, "snow", occupied, 16, 12),
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
      tile: monsterSpawns.desert,
    }),
    createUnit({
      id: "monster-frost-01",
      definition: "frostHorn",
      name: "Frost Horn",
      tile: monsterSpawns.snow,
    }),
    createUnit({
      id: "monster-grove-01",
      definition: "groveStalker",
      name: "Grove Stalker",
      tile: monsterSpawns.temperate,
    }),
    createUnit({
      id: "monster-cinder-01",
      definition: "cinderMaw",
      name: "Cinder Maw",
      tile: monsterSpawns.volcanic,
    }),
    createUnit({
      id: "monster-glass-01",
      definition: "glassStalker",
      name: "Glass Stalker",
      tile: monsterSpawns.paradise,
    }),
    createUnit({
      id: "monster-thorn-01",
      definition: "thornback",
      name: "Thornback",
      tile: reserveBiome(world, "temperate", occupied, 33, 27, monsterSpawnOptions),
    }),
    createUnit({
      id: "critter-bloom-01",
      definition: "bloomWisp",
      name: "Bloom Wisp",
      tile: reserveBiome(world, "paradise", occupied, 53, 49),
    }),
    createUnit({
      id: "critter-hare-01",
      definition: "duneHare",
      name: "Dune Hare",
      tile: critterSpawns[0],
    }),
    createUnit({
      id: "critter-hare-02",
      definition: "duneHare",
      name: "Dune Hare",
      tile: critterSpawns[2],
    }),
    createUnit({
      id: "critter-bird-01",
      definition: "sunBird",
      name: "Sun Bird",
      tile: critterSpawns[1],
    }),
    createUnit({
      id: "critter-bird-02",
      definition: "sunBird",
      name: "Sun Bird",
      tile: critterSpawns[3],
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
    carryingHerbId: null,
    carryingResourceNodeId: null,
    carryingResourceType: null,
    carryingResourceAmount: 0,
    escortTargetId: null,
    targetResourceNodeId: null,
    targetMonsterId: null,
    targetUnitId: null,
    attackCooldownMs: 0,
    attackDamage: template.attackDamage || 1,
    maxHealth: template.health || 3,
    health: template.health || 3,
    recoverMs: 0,
    hitFlashMs: 0,
    combatText: null,
    home: null,
  };
}

function findNearestOpenTile(world, originColumn, originRow, occupied, options = {}) {
  for (let radius = 0; radius < Math.max(world.columns, world.rows); radius += 1) {
    for (let row = originRow - radius; row <= originRow + radius; row += 1) {
      for (let column = originColumn - radius; column <= originColumn + radius; column += 1) {
        const tile = world.getTile(column, row);

        if (
          !tile ||
          occupied.has(tile.id) ||
          !isTilePassable(tile) ||
          !meetsDistanceRequirement(tile, options)
        ) {
          continue;
        }

        return tile;
      }
    }
  }

  return world.getTile(originColumn, originRow);
}

function reserveBiome(world, biome, occupied, fallbackColumn, fallbackRow, options = {}) {
  const nearest = findNearestBiomeTile(world, biome, fallbackColumn, fallbackRow, occupied, options);
  occupied.add(nearest.id);
  return nearest;
}

function findNearestBiomeTile(world, biome, originColumn, originRow, occupied, options = {}) {
  for (let radius = 0; radius < Math.max(world.columns, world.rows); radius += 1) {
    for (let row = originRow - radius; row <= originRow + radius; row += 1) {
      for (let column = originColumn - radius; column <= originColumn + radius; column += 1) {
        const tile = world.getTile(column, row);

        if (
          !tile ||
          tile.biome !== biome ||
          occupied.has(tile.id) ||
          !isTilePassable(tile) ||
          !meetsDistanceRequirement(tile, options)
        ) {
          continue;
        }

        return tile;
      }
    }
  }

  return findNearestOpenTile(world, originColumn, originRow, occupied, options);
}

function meetsDistanceRequirement(tile, { minDistanceFrom = null, minDistance = 0 } = {}) {
  if (!minDistanceFrom || minDistance <= 0) {
    return true;
  }

  return distanceTo(tile, minDistanceFrom) >= minDistance;
}

function distanceTo(a, b) {
  const dx = a.column - b.column;
  const dy = a.row - b.row;

  return Math.sqrt(dx * dx + dy * dy);
}
