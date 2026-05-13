export const WORLD_PROP_ATLASES = {
  ruins: "./src/content/objects/world-props/art/ruins_atlas.png",
  wilderness: "./src/content/objects/world-props/art/wilderness_atlas.png",
};

export const WORLD_PROP_DEFINITIONS = [
  createProp("ruin-barrel", "ruins", [961, 114, 264, 200], 1.08),
  createProp("ruin-rubble", "ruins", [29, 314, 285, 283], 1.2),
  createProp("ruin-fence", "ruins", [950, 314, 261, 308], 1.18),
  createProp("ruin-low-fence", "ruins", [47, 671, 250, 269], 1.05),
  createProp("ruin-crates", "ruins", [362, 642, 265, 298], 1.12),
  createProp("ruin-planks", "ruins", [627, 674, 313, 266], 1.22),
  createProp("ruin-brazier", "ruins", [940, 683, 281, 220], 1.05),
  createProp("ruin-obelisk", "ruins", [51, 940, 206, 248], 0.96),
  createProp("ruin-well", "ruins", [327, 940, 286, 235], 1.16),
  createProp("ruin-stump", "ruins", [646, 940, 263, 246], 1.1),
  createProp("ruin-cart", "ruins", [949, 956, 253, 206], 1.06),
  createProp("wild-stump", "wilderness", [646, 111, 267, 203], 1.06),
  createProp("wild-fallen-log", "wilderness", [946, 101, 281, 213], 1.18),
  createProp("wild-brush", "wilderness", [31, 314, 273, 295], 1.08),
  createProp("wild-rocks", "wilderness", [338, 314, 261, 289], 1.08),
  createProp("wild-fence", "wilderness", [634, 314, 287, 304], 1.1),
  createProp("wild-spikes", "wilderness", [947, 314, 277, 312], 1.12),
  createProp("wild-barrels", "wilderness", [29, 661, 270, 241], 1.12),
  createProp("wild-wheel", "wilderness", [339, 685, 258, 207], 1.02),
  createProp("wild-signpost", "wilderness", [993, 652, 162, 247], 0.82),
  createProp("wild-roots", "wilderness", [26, 966, 270, 215], 1.1),
  createProp("wild-log-stack", "wilderness", [321, 951, 283, 236], 1.22),
  createProp("wild-totem", "wilderness", [650, 940, 290, 251], 1.08),
  createProp("wild-scrap", "wilderness", [940, 953, 280, 242], 1.16),
];

export function getWorldPropDefinition(id) {
  return WORLD_PROP_DEFINITIONS.find((prop) => prop.id === id) || null;
}

function createProp(id, atlas, rect, tileScale) {
  return {
    id,
    atlas,
    rect: {
      x: rect[0],
      y: rect[1],
      width: rect[2],
      height: rect[3],
    },
    tileScale,
  };
}
