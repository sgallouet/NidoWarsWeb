export const dwarfGuardianArt = {
  key: "dwarfGuardian",
  label: "Dwarf Guardian",
  role: "hero",
  anchor: { x: 0, y: 0 },
  bounds: { width: 72, height: 68 },
  shadow: { width: 20, height: 7, alpha: 0.32 },
  palette: {
    beard: "#b56322",
    armor: "#2c343a",
    gold: "#c79635",
    blue: "#1f5d91",
    outline: "#120f0c",
  },
  atlas: {
    src: "./src/content/units/dwarf-guardian/art/unitv2_atlas.png",
    drawScale: 0.33,
  },
  animations: {
    idle: {
      frameMs: 180,
      frames: [
        f(62, 30, 297, 231, 176.1, 231),
        f(352, 30, 585, 231, 457.3, 231),
        f(641, 28, 878, 229, 747.4, 229),
        f(932, 31, 1161, 232, 1039.3, 232),
      ],
    },
    walk: {
      frameMs: 110,
      frames: [
        f(37, 262, 233, 438, 143.1, 438, { footPhase: "leftContact" }),
        f(243, 267, 436, 438, 331.3, 438),
        f(435, 271, 635, 441, 524.4, 441, { footPhase: "rightPass" }),
        f(636, 269, 822, 442, 706.6, 442, { footPhase: "rightContact" }),
        f(828, 264, 1020, 439, 919.1, 439),
        f(1021, 264, 1218, 439, 1112.3, 439, { footPhase: "leftPass" }),
      ],
    },
    guard: {
      frameMs: 165,
      frames: [
        f(254, 463, 441, 638, 345.1, 638),
        f(539, 465, 716, 642, 622.2, 642),
        f(768, 468, 977, 640, 874.4, 640),
      ],
    },
    attack: {
      frameMs: 95,
      loop: false,
      frames: [
        f(52, 648, 246, 856, 156.2, 856, { attackPhase: "anticipation" }),
        f(293, 656, 463, 859, 384.7, 859, { attackPhase: "windup" }),
        f(507, 710, 733, 879, 615.6, 879, { attackPhase: "contact", contact: true }),
        f(753, 695, 981, 854, 867.4, 854, { attackPhase: "recovery" }),
        f(996, 694, 1204, 859, 1125, 859, { attackPhase: "settle" }),
      ],
    },
    hit: {
      frameMs: 95,
      loop: false,
      frames: [
        f(301, 887, 530, 1043, 395.5, 1043, { offsetX: -1.2 }),
        f(639, 902, 812, 1038, 739.3, 1038, { offsetX: -0.4 }),
      ],
    },
    death: {
      frameMs: 145,
      loop: false,
      frames: [
        f(29, 1059, 249, 1217, 154.8, 1217),
        f(263, 1081, 503, 1218, 398.5, 1218),
        f(525, 1119, 748, 1217, 641, 1217),
        f(762, 1127, 985, 1217, 873.8, 1217),
        f(1000, 1140, 1218, 1219, 1114.4, 1219),
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
