import { WORLD_PROP_DEFINITIONS } from "../content/objects/world-props/definitions.js";
import { isTilePassable } from "../content/tiles/definitions.js";

const DEFAULT_PROP_COUNT = 56;
const MIN_CAMP_DISTANCE = 9;
const MIN_PROP_DISTANCE = 4;

export class WorldPropManager {
  constructor({ world, reservedKeys = new Set(), count = DEFAULT_PROP_COUNT }) {
    this.world = world;
    this.props = placeWorldProps({ world, reservedKeys, count });
  }

  getVisibleProps() {
    return this.props;
  }
}

function placeWorldProps({ world, reservedKeys, count }) {
  const campCenter = world.campCenter || { column: Math.floor(world.columns / 2), row: Math.floor(world.rows / 2) };
  const candidates = world.tiles
    .filter((tile) => isPropCandidate(tile, campCenter, reservedKeys))
    .sort((a, b) => getTileScore(a) - getTileScore(b));
  const selected = [];
  let propCursor = Math.floor((world.seed || 1) % WORLD_PROP_DEFINITIONS.length);

  for (const tile of candidates) {
    if (selected.length >= count) {
      break;
    }

    if (selected.some((prop) => tileDistance(prop, tile) < MIN_PROP_DISTANCE)) {
      continue;
    }

    const definition = WORLD_PROP_DEFINITIONS[propCursor % WORLD_PROP_DEFINITIONS.length];
    const prop = {
      id: `${definition.id}-${tile.id}`,
      definitionId: definition.id,
      column: tile.column,
      row: tile.row,
      seed: tile.seed,
    };

    selected.push(prop);
    reservePropTile(tile, prop);
    reservedKeys.add(tile.id);
    propCursor += 5;
  }

  return selected;
}

function isPropCandidate(tile, campCenter, reservedKeys) {
  return (
    tile?.isEmpty &&
    !tile.blocksMovement &&
    !tile.hasDarkPortal &&
    !tile.building &&
    !tile.construction &&
    !tile.worldPropId &&
    !reservedKeys.has(tile.id) &&
    isTilePassable(tile) &&
    tileDistance(tile, campCenter) >= MIN_CAMP_DISTANCE
  );
}

function reservePropTile(tile, prop) {
  tile.blocksMovement = true;
  tile.isEmpty = false;
  tile.worldPropId = prop.id;
}

function getTileScore(tile) {
  const noise = Math.sin((tile.seed || 0.5) * 812.3 + tile.column * 37.1 + tile.row * 91.7) * 43758.5453;

  return noise - Math.floor(noise);
}

function tileDistance(a, b) {
  return Math.hypot(a.column - b.column, a.row - b.row);
}
