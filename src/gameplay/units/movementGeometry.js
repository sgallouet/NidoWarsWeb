import { GAME_CONFIG } from "../../config/gameConfig.js";

const CARDINAL_STEP_PIXELS = getMovementStepPixels(1, 0);

export function getMovementStepDistanceMultiplier(columnDelta, rowDelta) {
  return getMovementStepPixels(columnDelta, rowDelta) / CARDINAL_STEP_PIXELS;
}

function getMovementStepPixels(columnDelta, rowDelta) {
  const tileWidth = GAME_CONFIG.render.tileWidth;
  const tileHeight = GAME_CONFIG.render.tileHeight;
  const x = (columnDelta - rowDelta) * (tileWidth / 2);
  const y = (columnDelta + rowDelta) * (tileHeight / 2);

  return Math.max(1, Math.hypot(x, y));
}
