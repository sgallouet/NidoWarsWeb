export const duneVanguardUnitV2Art = {
  key: "duneVanguard",
  label: "Dune Vanguard",
  role: "ally",
  bounds: { width: 50, height: 64 },
  shadow: { width: 15, height: 5.5, alpha: 0.28 },
  atlas: {
    src: "./src/content/units/dune-vanguard/art/unitv2_atlas.png",
    drawScale: 0.3,
  },
  animations: {
    idle: {
      frameMs: 180,
      frames: [
        f(139, 91, 302, 305, 218.3, 305),
        f(343, 89, 500, 302, 420.2, 302),
        f(553, 90, 712, 306, 624.6, 306),
        f(743, 102, 906, 304, 820.3, 304),
      ],
    },
    walk: {
      frameMs: 105,
      frames: [
        f(129, 341, 288, 531, 204, 531, { footPhase: "leftContact" }),
        f(306, 341, 466, 534, 387.6, 534),
        f(486, 344, 636, 534, 563.2, 534, { footPhase: "rightPass" }),
        f(672, 340, 832, 534, 751.5, 534, { footPhase: "rightContact" }),
        f(838, 348, 989, 536, 906.4, 536),
        f(1001, 348, 1158, 536, 1075.1, 536, { footPhase: "leftPass" }),
      ],
    },
    guard: {
      frameMs: 160,
      frames: [
        f(131, 581, 271, 764, 199.6, 764),
        f(800, 586, 946, 766, 877.9, 766),
        f(977, 586, 1125, 770, 1041.5, 770),
      ],
    },
    attack: {
      frameMs: 90,
      loop: false,
      frames: [
        f(131, 581, 271, 764, 199.6, 764, { attackPhase: "anticipation" }),
        f(308, 575, 462, 762, 396.1, 762, { attackPhase: "windup" }),
        f(544, 598, 815, 764, 610.1, 764, { attackPhase: "contact", contact: true }),
        f(800, 586, 946, 766, 877.9, 766, { attackPhase: "recovery" }),
        f(977, 586, 1125, 770, 1041.5, 770, { attackPhase: "settle" }),
      ],
    },
    hit: {
      frameMs: 95,
      loop: false,
      frames: [
        f(135, 800, 289, 958, 213, 958, { offsetX: -1.2 }),
        f(323, 809, 480, 956, 375.1, 956, { offsetX: -0.4 }),
      ],
    },
    death: {
      frameMs: 140,
      loop: false,
      frames: [
        f(135, 991, 297, 1133, 194.8, 1133),
        f(311, 1011, 499, 1133, 397.1, 1133),
        f(524, 1046, 715, 1131, 616.9, 1131),
        f(743, 1070, 974, 1137, 872.6, 1137),
        f(997, 1072, 1213, 1138, 1108.5, 1138),
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
