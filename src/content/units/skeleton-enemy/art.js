export const skeletonEnemyArt = {
  key: "skeletonEnemy",
  label: "Skeleton Enemy",
  role: "enemy",
  anchor: { x: 0, y: 0 },
  bounds: { width: 31, height: 48 },
  shadow: { width: 12, height: 4.8, alpha: 0.24 },
  atlas: {
    src: "./src/content/units/skeleton-enemy/art/unitv2_atlas.png",
    drawScale: 0.23,
  },
  palette: {
    bone: "#d8d0b6",
    boneLight: "#f0ead1",
    boneShadow: "#8e8878",
    deepShadow: "#221d19",
    outline: "#2c251f",
    socket: "#0f0d0c",
    crack: "#6d685d",
    rust: "#8c4f35",
    rustDark: "#4d3026",
    steel: "#8f9794",
  },
  animations: {
    idle: {
      frameMs: 180,
      frames: [
        f(113, 60, 227, 246, 175.5, 246),
        f(307, 63, 422, 249, 376.4, 249),
        f(480, 61, 594, 245, 547.2, 245),
        f(678, 62, 783, 243, 729.6, 243),
      ],
    },
    walk: {
      frameMs: 105,
      frames: [
        f(102, 279, 217, 440, 167.8, 440, { footPhase: "leftContact" }),
        f(287, 281, 400, 443, 353.6, 443),
        f(456, 286, 571, 447, 524.9, 447, { footPhase: "rightPass" }),
        f(636, 281, 751, 443, 703.6, 443, { footPhase: "rightContact" }),
        f(821, 279, 936, 441, 883.9, 441),
        f(1001, 286, 1118, 445, 1068.4, 445, { footPhase: "leftPass" }),
      ],
    },
    guard: {
      frameMs: 160,
      frames: [
        f(109, 486, 270, 634, 158.7, 634),
        f(314, 487, 470, 633, 364.1, 633),
        f(508, 490, 666, 632, 559.7, 632),
      ],
    },
    attack: {
      frameMs: 90,
      loop: false,
      frames: [
        f(82, 658, 234, 819, 173.9, 819, { attackPhase: "anticipation" }),
        f(336, 669, 573, 820, 393.7, 820, { attackPhase: "windup" }),
        f(599, 669, 725, 821, 651.9, 821, { attackPhase: "contact", contact: true }),
        f(771, 684, 954, 819, 815.5, 819, { attackPhase: "recovery" }),
        f(959, 666, 1056, 826, 1013.3, 826, { attackPhase: "settle" }),
      ],
    },
    hit: {
      frameMs: 95,
      loop: false,
      frames: [
        f(82, 847, 240, 1003, 180.7, 1003, { offsetX: -1.2 }),
        f(291, 847, 435, 1003, 378, 1003, { offsetX: -0.4 }),
      ],
    },
    death: {
      frameMs: 140,
      loop: false,
      frames: [
        f(77, 1038, 233, 1151, 143.5, 1151),
        f(292, 1079, 476, 1167, 323, 1167),
        f(515, 1074, 710, 1177, 651.5, 1177),
        f(738, 1100, 938, 1175, 877.2, 1175),
        f(965, 1097, 1159, 1151, 1063.6, 1151),
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
