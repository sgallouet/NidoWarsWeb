import { RESOURCE_ICONS } from "../resources/definitions.js";
import { PLAYER_UNIT_ART } from "../units/playerSpriteArt.js";
import { UNIT_V2_ART } from "../units/unitV2Art.js";
import { DESERT_TILE_ART } from "../tiles/desert/art.js";

export const RUNTIME_IMAGE_ASSETS = [
  ...Object.values(RESOURCE_ICONS),
  ...Object.values(PLAYER_UNIT_ART).flatMap((art) => [art.idleSheet, art.walkSheet]),
  ...Object.values(UNIT_V2_ART).map((art) => art.atlas?.src),
  DESERT_TILE_ART.sprite,
].filter(Boolean);
