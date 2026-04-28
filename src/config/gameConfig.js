export const GAME_CONFIG = {
  map: {
    columns: 60,
    rows: 60,
  },
  render: {
    tileWidth: 82,
    tileHeight: 42,
    minZoom: 0.18,
    maxZoom: 1.28,
    defaultZoomPadding: 0.86,
  },
  timeOfDay: {
    dayMs: 5 * 60 * 1000,
    nightMs: 2 * 60 * 1000,
    transitionMs: 30 * 1000,
  },
  resources: {
    gold: 0,
    herbs: 0,
    fish: 0,
    berries: 0,
    wood: 0,
  },
};
