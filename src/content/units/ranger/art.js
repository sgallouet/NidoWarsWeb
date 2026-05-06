export const rangerArt = {
  key: "ranger",
  label: "Ranger",
  role: "hero",
  bounds: { width: 36, height: 48 },
  shadow: { width: 14, height: 5, alpha: 0.28 },
  atlas: {
    src: "./src/content/units/ranger/art/unitv2_atlas.png",
    drawScale: 0.3,
  },
  animations: {
    idle: {
      frameMs: 180,
      frames: [
        f(86, 56, 203, 236, 124, 236),
        f(275, 56, 398, 236, 313.8, 236),
        f(464, 56, 572, 236, 500.2, 236),
        f(647, 61, 770, 237, 685.4, 237),
      ],
    },
    walk: {
      frameMs: 105,
      frames: [
        f(67, 272, 195, 438, 142, 438, { footPhase: "leftContact" }),
        f(248, 272, 380, 440, 323.1, 440),
        f(434, 273, 564, 436, 498.7, 436, { footPhase: "rightPass" }),
        f(630, 268, 759, 433, 698.2, 433, { footPhase: "rightContact" }),
        f(841, 276, 967, 437, 907.2, 437),
        f(1040, 276, 1180, 437, 1112.1, 437, { footPhase: "leftPass" }),
      ],
    },
    guard: {
      frameMs: 155,
      frames: [
        f(89, 482, 194, 651, 130.6, 651),
        f(274, 482, 380, 651, 316.7, 651),
        f(448, 482, 560, 651, 494, 651),
      ],
    },
    attack: {
      frameMs: 80,
      loop: false,
      frames: [
        f(79, 685, 193, 855, 122.8, 855, { attackPhase: "anticipation" }),
        f(267, 679, 379, 855, 310.6, 855, { attackPhase: "windup" }),
        f(452, 673, 610, 855, 496.3, 855, { attackPhase: "contact", contact: true }),
        f(680, 690, 831, 855, 729.5, 855, { attackPhase: "release" }),
        f(1057, 684, 1192, 855, 1118.7, 855, { attackPhase: "settle" }),
      ],
    },
    hit: {
      frameMs: 95,
      loop: false,
      frames: [
        f(77, 886, 213, 1029, 146.2, 1029, { offsetX: -1.2 }),
        f(253, 884, 396, 1029, 338.1, 1029, { offsetX: -0.4 }),
      ],
    },
    death: {
      frameMs: 140,
      loop: false,
      frames: [
        f(63, 1052, 224, 1152, 132.4, 1152),
        f(266, 1088, 444, 1166, 342.4, 1166),
        f(479, 1085, 673, 1167, 565.6, 1167),
        f(723, 1106, 915, 1176, 825.5, 1176),
        f(951, 1104, 1199, 1172, 1078.3, 1172),
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
