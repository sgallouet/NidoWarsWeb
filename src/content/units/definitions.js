import { isTilePassable } from "../tiles/definitions.js";

const BASE_MAP_COLUMNS = 60;
const BASE_MAP_ROWS = 60;
const MONSTER_START_EXCLUSION_RADIUS = 36;
const START_THREAT_COUNT = 32;
const START_THREAT_MIN_RADIUS = 12;
const START_THREAT_MAX_RADIUS = 52;
const PACK_MIN_CAMP_DISTANCE = 25;
const START_THREAT_DEFINITIONS = [
  "skeletonEnemy",
  "skeletonEnemy",
  "emberMaw",
  "glassStalker",
  "skeletonEnemy",
  "thornback",
  "groveStalker",
  "emberMaw",
  "skeletonEnemy",
  "frostHorn",
  "skeletonEnemy",
  "cinderMaw",
];
const QUADRUPED_PACKS = [
  { biome: "temperate", column: 22, row: 42, count: 5 },
  { biome: "desert", column: 49, row: 23, count: 5 },
  { biome: "volcanic", column: 14, row: 47, count: 5 },
];

export const UNIT_DEFINITIONS = {
  duneVanguard: {
    label: "Dune Vanguard",
    faction: "player",
    role: "Warrior",
    speed: 1.2,
    patrolRadius: 5,
    health: 5,
    attackDamage: 1,
    art: {
      system: "unitV2",
      key: "duneVanguard",
    },
    colors: {
      primary: "#2b746f",
      secondary: "#f2cf79",
      accent: "#e8f8e7",
      shadow: "#183835",
    },
  },
  duneSettler: {
    label: "Dune Settler",
    faction: "player",
    role: "Settler",
    speed: 0.8,
    patrolRadius: 4,
    health: 3,
    attackDamage: 0,
    colors: {
      primary: "#8f6f45",
      secondary: "#8fd6c8",
      accent: "#fff0a6",
      shadow: "#4f3a28",
    },
  },
  campWolf: {
    label: "Camp Wolf",
    faction: "player",
    role: "Warrior",
    speed: 1.55,
    patrolRadius: 6,
    health: 3,
    attackDamage: 1,
    body: "campWolf",
    art: {
      system: "unitV2",
      key: "campWolf",
    },
    colors: {
      primary: "#1f2a32",
      secondary: "#6b4c38",
      accent: "#e0c36b",
      shadow: "#11161b",
    },
  },
  ranger: {
    label: "Ranger",
    faction: "player",
    role: "Archer",
    speed: 1.1,
    patrolRadius: 5,
    health: 3,
    attackDamage: 1,
    art: {
      system: "unitV2",
      key: "ranger",
    },
    colors: {
      primary: "#315a3f",
      secondary: "#c29b55",
      accent: "#dfeaa0",
      shadow: "#1f3028",
    },
  },
  emberMaw: {
    label: "Ember Maw",
    faction: "monster",
    temperament: "scary",
    role: "Monster",
    speed: 1.45,
    patrolRadius: 6,
    health: 4,
    attackDamage: 1,
    art: {
      system: "unitV2",
      key: "monsterEnemy",
    },
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
    speed: 1.3,
    patrolRadius: 7,
    health: 5,
    attackDamage: 2,
    body: "thornback",
    art: {
      system: "unitV2",
      key: "monsterEnemy",
    },
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
    speed: 1.55,
    patrolRadius: 7,
    health: 4,
    attackDamage: 1,
    body: "thornback",
    art: {
      system: "unitV2",
      key: "monsterEnemy",
    },
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
    speed: 1.45,
    patrolRadius: 7,
    health: 5,
    attackDamage: 2,
    body: "emberMaw",
    art: {
      system: "unitV2",
      key: "monsterEnemy",
    },
    colors: {
      primary: "#6c2425",
      secondary: "#ff7a36",
      accent: "#ffd45f",
      shadow: "#251718",
    },
  },
  quadrupedMonster: {
    label: "Ashback Hound",
    faction: "monster",
    temperament: "scary",
    role: "Pack Monster",
    speed: 1.55,
    patrolRadius: 6,
    patrolMode: "localRoam",
    roamMinCampDistance: 15,
    health: 4,
    attackDamage: 1,
    body: "quadrupedMonster",
    art: {
      system: "unitV2",
      key: "quadrupedMonster",
    },
    colors: {
      primary: "#6f3d3a",
      secondary: "#c79b72",
      accent: "#ff6d3a",
      shadow: "#211518",
    },
  },
  bloomWisp: {
    label: "Gentle Mammoth",
    faction: "monster",
    temperament: "friendly",
    role: "Gentle Mammoth",
    speed: 1.05,
    patrolRadius: 6,
    health: 4,
    attackDamage: 0,
    decorative: true,
    body: "gentleMammoth",
    art: {
      system: "unitV2",
      key: "gentleMammoth",
    },
    colors: {
      primary: "#9b7651",
      secondary: "#4b3523",
      accent: "#dfd3b4",
      shadow: "#37281d",
    },
  },
  skeletonEnemy: {
    label: "Bone Clacker",
    faction: "monster",
    temperament: "scary",
    role: "Undead",
    speed: 1.25,
    patrolRadius: 26,
    patrolMode: "outerRoam",
    roamMinCampDistance: 11,
    health: 2,
    attackDamage: 1,
    body: "skeletonEnemy",
    art: {
      system: "unitV2",
      key: "skeletonEnemy",
    },
    scale: 1,
    colors: {
      primary: "#d8d0b6",
      secondary: "#8e8878",
      accent: "#8c4f35",
      shadow: "#2c251f",
    },
  },
  glassStalker: {
    label: "Glass Stalker",
    faction: "monster",
    temperament: "scary",
    role: "Monster",
    speed: 1.65,
    patrolRadius: 7,
    health: 3,
    attackDamage: 1,
    art: {
      system: "unitV2",
      key: "monsterEnemy",
    },
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
    speed: 1.3,
    patrolRadius: 5,
    health: 5,
    attackDamage: 2,
    art: {
      system: "unitV2",
      key: "monsterEnemy",
    },
    colors: {
      primary: "#6f854d",
      secondary: "#c2a75c",
      accent: "#efe8a8",
      shadow: "#354226",
    },
  },
  duneHare: {
    label: "Dune Rodent",
    faction: "monster",
    temperament: "friendly",
    role: "Critter",
    speed: 1.8,
    patrolRadius: 4,
    health: 1,
    body: "duneRodent",
    art: {
      system: "unitV2",
      key: "duneRodent",
    },
    decorative: true,
    colors: {
      primary: "#211d17",
      secondary: "#9e4a4e",
      accent: "#d0c13f",
      shadow: "#0d0b09",
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
  const campCenter = world.campCenter || {
    column: Math.floor(world.columns / 2),
    row: Math.floor(world.rows / 2),
  };

  return findNearestOpenTile(world, campCenter.column, campCenter.row, new Set());
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
    reserve(campTile.column, campTile.row - 1),
  ];
  const wolfSpawns = [reserve(campTile.column - 2, campTile.row + 1), reserve(campTile.column + 2, campTile.row + 1)];
  const monsterSpawns = {
    snow: reserveBiome(world, "snow", occupied, scaleColumn(world, 10), scaleRow(world, 10), monsterSpawnOptions),
    desert: reserveBiome(world, "desert", occupied, scaleColumn(world, 48), scaleRow(world, 14), monsterSpawnOptions),
    temperate: reserveBiome(
      world,
      "temperate",
      occupied,
      scaleColumn(world, 30),
      scaleRow(world, 34),
      monsterSpawnOptions,
    ),
    volcanic: reserveBiome(
      world,
      "volcanic",
      occupied,
      scaleColumn(world, 12),
      scaleRow(world, 49),
      monsterSpawnOptions,
    ),
    paradise: reserveBiome(
      world,
      "paradise",
      occupied,
      scaleColumn(world, 50),
      scaleRow(world, 50),
      monsterSpawnOptions,
    ),
  };
  const critterSpawns = [
    reserveBiome(world, "desert", occupied, scaleColumn(world, 45), scaleRow(world, 18)),
    reserveBiome(world, "paradise", occupied, scaleColumn(world, 51), scaleRow(world, 46)),
    reserveBiome(world, "temperate", occupied, scaleColumn(world, 25), scaleRow(world, 31)),
    reserveBiome(world, "snow", occupied, scaleColumn(world, 16), scaleRow(world, 12)),
  ];
  const skeletonSpawn = reserveOpenOutsideCamp(world, occupied, scaleColumn(world, 7), scaleRow(world, 36), {
    minDistanceFrom: campTile,
    minDistance: 18,
  });
  const startThreats = createStartThreatUnits(world, campTile, occupied);
  const quadrupedPacks = createQuadrupedPackUnits(world, campTile, occupied);

  return [
    createUnit({
      id: "warrior-asha",
      definition: "duneVanguard",
      name: "Asha",
      tile: playerSpawns[0],
    }),
    createUnit({
      id: "settler-tor",
      definition: "duneSettler",
      name: "Tor",
      tile: playerSpawns[1],
    }),
    createUnit({
      id: "settler-vale",
      definition: "duneSettler",
      name: "Vale",
      tile: playerSpawns[2],
    }),
    createUnit({
      id: "archer-mira",
      definition: "ranger",
      name: "Mira",
      tile: playerSpawns[3],
    }),
    createUnit({
      id: "wolf-nyx",
      definition: "campWolf",
      name: "Nyx",
      tile: wolfSpawns[0],
    }),
    createUnit({
      id: "wolf-rusk",
      definition: "campWolf",
      name: "Rusk",
      tile: wolfSpawns[1],
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
      tile: reserveBiome(
        world,
        "temperate",
        occupied,
        scaleColumn(world, 33),
        scaleRow(world, 27),
        monsterSpawnOptions,
      ),
    }),
    createUnit({
      id: "monster-skeleton-01",
      definition: "skeletonEnemy",
      name: "Bone Clacker",
      tile: skeletonSpawn,
    }),
    ...quadrupedPacks,
    ...startThreats,
    createUnit({
      id: "critter-bloom-01",
      definition: "bloomWisp",
      name: "Gentle Mammoth",
      tile: reserveBiome(world, "paradise", occupied, scaleColumn(world, 53), scaleRow(world, 49)),
    }),
    createUnit({
      id: "critter-hare-01",
      definition: "duneHare",
      name: "Dune Rodent",
      tile: critterSpawns[0],
    }),
    createUnit({
      id: "critter-hare-02",
      definition: "duneHare",
      name: "Dune Rodent",
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

function scaleColumn(world, column) {
  return Math.min(world.columns - 1, Math.round((column / BASE_MAP_COLUMNS) * world.columns));
}

function scaleRow(world, row) {
  return Math.min(world.rows - 1, Math.round((row / BASE_MAP_ROWS) * world.rows));
}

function createStartThreatUnits(world, campTile, occupied) {
  const spawnTiles = reserveRandomOpenRing(
    world,
    occupied,
    campTile,
    START_THREAT_COUNT,
    START_THREAT_MIN_RADIUS,
    START_THREAT_MAX_RADIUS,
  );
  const definitionOffset = Math.floor(Math.random() * START_THREAT_DEFINITIONS.length);

  return spawnTiles.map((tile, index) => {
    const definition = START_THREAT_DEFINITIONS[(index + definitionOffset) % START_THREAT_DEFINITIONS.length];
    const template = UNIT_DEFINITIONS[definition];

    return createUnit({
      id: `monster-start-${index + 1}`,
      definition,
      name: template.label,
      tile,
      overrides: {
        patrolMode: "localRoam",
        patrolRadius: 9 + Math.floor(Math.random() * 7),
        roamMinCampDistance: START_THREAT_MIN_RADIUS - 1,
        home: { column: tile.column, row: tile.row },
      },
    });
  });
}

function createQuadrupedPackUnits(world, campTile, occupied) {
  return QUADRUPED_PACKS.flatMap((pack, packIndex) => {
    const center = reserveBiome(world, pack.biome, occupied, scaleColumn(world, pack.column), scaleRow(world, pack.row), {
      minDistanceFrom: campTile,
      minDistance: PACK_MIN_CAMP_DISTANCE,
    });
    const spawnTiles = reservePackTiles(world, occupied, center, pack.count, {
      minDistanceFrom: campTile,
      minDistance: PACK_MIN_CAMP_DISTANCE,
    });
    const home = { column: center.column, row: center.row };

    return spawnTiles.map((tile, memberIndex) =>
      createUnit({
        id: `monster-quadruped-${packIndex + 1}-${memberIndex + 1}`,
        definition: "quadrupedMonster",
        name: "Ashback Hound",
        tile,
        overrides: {
          home,
          patrolMode: "localRoam",
          patrolRadius: 5 + memberIndex,
          roamMinCampDistance: PACK_MIN_CAMP_DISTANCE,
        },
      }),
    );
  });
}

function reservePackTiles(world, occupied, center, count, options = {}) {
  const tiles = [center];
  const offsets = [
    { column: 1, row: 0 },
    { column: 0, row: 1 },
    { column: -1, row: 0 },
    { column: 0, row: -1 },
    { column: 1, row: 1 },
    { column: -1, row: 1 },
  ];

  for (const offset of offsets) {
    if (tiles.length >= count) {
      break;
    }

    const tile = findNearestOpenTile(world, center.column + offset.column, center.row + offset.row, occupied, options);

    if (!tile || occupied.has(tile.id)) {
      continue;
    }

    occupied.add(tile.id);
    tiles.push(tile);
  }

  return tiles;
}

function createUnit({ id, definition, name, tile, overrides = {} }) {
  const template = UNIT_DEFINITIONS[definition];
  const home = overrides.home || (template.faction === "monster" ? { column: tile.column, row: tile.row } : null);

  return {
    ...template,
    ...overrides,
    id,
    definition,
    name,
    column: tile.column,
    row: tile.row,
    visualColumn: tile.column,
    visualRow: tile.row,
    movementQueue: [],
    movementSegment: null,
    pendingPathJobId: null,
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
    staggerMs: 0,
    baseAttackDamage: template.attackDamage || 1,
    attackDamage: template.attackDamage || 1,
    maxHealth: template.health || 3,
    health: template.health || 3,
    recoverMs: 0,
    hitFlashMs: 0,
    combatText: null,
    home,
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

function reserveOpenOutsideCamp(world, occupied, fallbackColumn, fallbackRow, options = {}) {
  const nearest = findNearestOpenTile(world, fallbackColumn, fallbackRow, occupied, options);
  occupied.add(nearest.id);
  return nearest;
}

function reserveRandomOpenRing(world, occupied, center, count, minDistance, maxDistance) {
  const candidates = [];

  for (let row = center.row - maxDistance; row <= center.row + maxDistance; row += 1) {
    for (let column = center.column - maxDistance; column <= center.column + maxDistance; column += 1) {
      const tile = world.getTile(column, row);
      const distance = tile ? distanceTo(tile, center) : 0;

      if (
        !tile ||
        occupied.has(tile.id) ||
        !isTilePassable(tile) ||
        tile.building ||
        tile.construction ||
        distance < minDistance ||
        distance > maxDistance
      ) {
        continue;
      }

      candidates.push(tile);
    }
  }

  const reserved = [];

  while (reserved.length < count && candidates.length > 0) {
    const index = Math.floor(Math.random() * candidates.length);
    const [tile] = candidates.splice(index, 1);

    occupied.add(tile.id);
    reserved.push(tile);
  }

  return reserved;
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
