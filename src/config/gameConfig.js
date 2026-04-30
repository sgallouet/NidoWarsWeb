export const GAME_CONFIG = {
  map: {
    columns: 72,
    rows: 72,
  },
  render: {
    tileWidth: 82,
    tileHeight: 42,
    minZoom: 0.06,
    maxZoom: 1.28,
    defaultZoomPadding: 0.86,
  },
  timeOfDay: {
    dayMs: 5 * 60 * 1000,
    nightMs: 2 * 60 * 1000,
    transitionMs: 30 * 1000,
  },
  resources: {
    gold: 100,
    herbs: 100,
    fish: 100,
    meat: 100,
    berries: 100,
    wood: 100,
    rock: 100,
  },
};
