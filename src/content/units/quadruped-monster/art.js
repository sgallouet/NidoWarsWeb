export const quadrupedMonsterArt = {
  key: "quadrupedMonster",
  label: "Quadruped Monster",
  role: "enemy",
  anchor: { x: 0, y: 0 },
  bounds: { width: 58, height: 44 },
  shadow: { width: 20, height: 7, alpha: 0.32 },
  palette: {
    hide: "#4a2c2f",
    muscle: "#7b4245",
    bone: "#b4a77e",
    glow: "#f04b2c",
    outline: "#140f10",
  },
  atlas: {
    src: "./src/content/units/quadruped-monster/art/unitv2_atlas.png",
    drawScale: 0.34,
  },
  animations: {
    idle: {
      frameMs: 180,
      frames: [f(71, 99, 230, 228, 167.3, 228), f(303, 99, 465, 229, 401, 229), f(527, 99, 687, 231, 620.5, 231)],
    },
    walk: {
      frameMs: 105,
      frames: [
        f(56, 300, 230, 424, 165, 424, { footPhase: "leftContact" }),
        f(259, 303, 416, 431, 354, 431),
        f(448, 312, 615, 435, 566.2, 435, { footPhase: "rightPass" }),
        f(658, 305, 817, 427, 749.3, 427, { footPhase: "rightContact" }),
        f(843, 304, 1018, 425, 952.9, 425),
        f(1043, 304, 1211, 434, 1153.1, 434, { footPhase: "leftPass" }),
      ],
    },
    guard: {
      frameMs: 155,
      frames: [f(73, 489, 238, 612, 165.6, 612), f(285, 490, 447, 612, 377.4, 612), f(492, 496, 659, 613, 590.9, 613)],
    },
    attack: {
      frameMs: 85,
      loop: false,
      frames: [
        f(63, 696, 233, 819, 153.4, 819, { attackPhase: "anticipation" }),
        f(265, 661, 489, 799, 322.2, 799, { attackPhase: "windup" }),
        f(520, 692, 734, 822, 658.6, 822, { attackPhase: "contact", contact: true }),
        f(755, 697, 932, 818, 851.4, 818, { attackPhase: "recovery" }),
        f(979, 696, 1149, 818, 1071.9, 818, { attackPhase: "settle" }),
      ],
    },
    hit: {
      frameMs: 95,
      loop: false,
      frames: [f(77, 873, 234, 1013, 165.6, 1013, { offsetX: -1.2 }), f(284, 872, 443, 1009, 375.3, 1009, { offsetX: -0.4 })],
    },
    death: {
      frameMs: 140,
      loop: false,
      frames: [
        f(66, 1063, 212, 1174, 133, 1174),
        f(266, 1071, 454, 1173, 374.5, 1173),
        f(482, 1101, 684, 1171, 596.1, 1171),
        f(712, 1108, 909, 1172, 815.1, 1172),
        f(938, 1104, 1149, 1173, 1039, 1173),
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
