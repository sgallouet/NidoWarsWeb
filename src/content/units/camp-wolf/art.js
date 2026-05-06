export const campWolfArt = {
  key: "campWolf",
  label: "Camp Wolf",
  role: "ally",
  anchor: { x: 0, y: 0 },
  bounds: { width: 54, height: 42 },
  shadow: { width: 18, height: 6.5, alpha: 0.28 },
  palette: {
    fur: "#1f2930",
    armor: "#4a3629",
    metal: "#6b7475",
    eye: "#d2a846",
    outline: "#0f1113",
  },
  atlas: {
    src: "./src/content/units/camp-wolf/art/unitv2_atlas.png",
    drawScale: 0.25,
  },
  animations: {
    idle: {
      frameMs: 180,
      frames: [f(53, 73, 272, 236, 192.8, 236), f(315, 73, 515, 235, 438.8, 235), f(567, 69, 787, 236, 713, 236)],
    },
    walk: {
      frameMs: 105,
      frames: [
        f(25, 292, 260, 440, 161.4, 440, { footPhase: "leftContact" }),
        f(279, 296, 484, 440, 394.6, 440),
        f(505, 303, 687, 442, 615.8, 442, { footPhase: "rightPass" }),
        f(703, 304, 871, 439, 788.8, 439, { footPhase: "rightContact" }),
        f(883, 309, 1038, 443, 960.6, 443),
        f(1051, 307, 1229, 444, 1144.5, 444, { footPhase: "leftPass" }),
      ],
    },
    guard: {
      frameMs: 155,
      frames: [f(52, 496, 261, 638, 183, 638), f(301, 509, 483, 636, 411.9, 636), f(532, 509, 699, 636, 634.2, 636)],
    },
    attack: {
      frameMs: 85,
      loop: false,
      frames: [
        f(51, 689, 242, 825, 146, 825, { attackPhase: "anticipation" }),
        f(299, 695, 508, 810, 392.9, 810, { attackPhase: "windup" }),
        f(538, 672, 746, 803, 580, 803, { attackPhase: "contact", contact: true }),
        f(773, 705, 951, 828, 892.1, 828, { attackPhase: "recovery" }),
        f(990, 689, 1181, 832, 1114.5, 832, { attackPhase: "settle" }),
      ],
    },
    hit: {
      frameMs: 95,
      loop: false,
      frames: [f(70, 869, 220, 997, 125.1, 997, { offsetX: -1.2 }), f(283, 876, 433, 999, 341, 999, { offsetX: -0.4 })],
    },
    death: {
      frameMs: 140,
      loop: false,
      frames: [
        f(49, 1047, 220, 1183, 129, 1183),
        f(261, 1090, 437, 1183, 360.2, 1183),
        f(467, 1094, 689, 1188, 625.7, 1188),
        f(707, 1114, 929, 1201, 859.7, 1201),
        f(949, 1118, 1195, 1200, 1120.3, 1200),
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
