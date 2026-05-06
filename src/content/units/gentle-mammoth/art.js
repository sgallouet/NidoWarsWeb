export const gentleMammothArt = {
  key: "gentleMammoth",
  label: "Gentle Mammoth",
  role: "critter",
  anchor: { x: 0, y: 0 },
  bounds: { width: 72, height: 58 },
  shadow: { width: 24, height: 8, alpha: 0.27 },
  palette: {
    hide: "#9b7651",
    fur: "#4b3523",
    tusk: "#dfd3b4",
    tattoo: "#6b4836",
    outline: "#17110d",
  },
  atlas: {
    src: "./src/content/units/gentle-mammoth/art/unitv2_atlas.png",
    drawScale: 0.35,
  },
  animations: {
    idle: {
      frameMs: 190,
      frames: [f(71, 67, 267, 243, 152.4, 243), f(331, 66, 538, 243, 419.5, 243), f(606, 68, 811, 243, 691.6, 243)],
    },
    walk: {
      frameMs: 120,
      frames: [
        f(58, 291, 234, 437, 136.2, 437, { footPhase: "leftContact" }),
        f(255, 296, 430, 437, 329, 437),
        f(454, 305, 627, 446, 532.6, 446, { footPhase: "rightPass" }),
        f(651, 299, 825, 441, 731.2, 441, { footPhase: "rightContact" }),
        f(842, 300, 1004, 441, 905.7, 441),
        f(1023, 306, 1185, 442, 1096.6, 442, { footPhase: "leftPass" }),
      ],
    },
    guard: {
      frameMs: 180,
      frames: [f(62, 485, 250, 648, 139.8, 648), f(286, 484, 479, 652, 362.7, 652), f(534, 490, 668, 653, 596.4, 653)],
    },
    hit: {
      frameMs: 100,
      loop: false,
      frames: [f(65, 874, 213, 1019, 154.3, 1019), f(280, 887, 424, 1019, 366.9, 1019)],
    },
    death: {
      frameMs: 150,
      loop: false,
      frames: [
        f(52, 1069, 234, 1185, 162.7, 1185),
        f(278, 1083, 473, 1187, 402.6, 1187),
        f(503, 1090, 707, 1186, 631.5, 1186),
        f(742, 1108, 951, 1192, 861.8, 1192),
        f(970, 1114, 1194, 1199, 1102.5, 1199),
      ],
    },
  },
};

function f(left, top, right, bottom, anchorX, anchorY, extra = {}) {
  return {
    source: { left, top, right, bottom },
    anchor: { x: anchorX, y: anchorY },
    ...extra,
  };
}
