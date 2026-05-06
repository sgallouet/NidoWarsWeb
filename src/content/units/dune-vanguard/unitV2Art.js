export const duneVanguardUnitV2Art = {
  key: "duneVanguard",
  label: "Dune Vanguard",
  role: "ally",
  anchor: { x: 0, y: 0 },
  bounds: { width: 50, height: 64 },
  shadow: { width: 15, height: 5.5, alpha: 0.28 },
  palette: {
    tunic: "#7b5635",
    cloth: "#1d4465",
    leather: "#3b2418",
    steel: "#9da6aa",
    outline: "#17120e",
  },
  atlas: {
    src: "./src/content/units/dune-vanguard/art/unitv2_atlas.png",
    drawScale: 0.43,
  },
  animations: {
    idle: {
      frameMs: 180,
      frames: [
        f(38, 56, 130, 193, 84, 193),
        f(201, 56, 293, 193, 247.3, 193),
        f(363, 55, 455, 193, 410.1, 193),
        f(525, 55, 617, 193, 572.1, 193),
        f(687, 56, 780, 193, 733.6, 193),
        f(850, 56, 941, 193, 895.2, 193),
        f(1012, 56, 1104, 193, 1057.3, 193),
        f(1174, 57, 1266, 193, 1219.4, 193),
      ],
    },
    walk: {
      frameMs: 105,
      frames: [
        f(43, 229, 138, 366, 91.6, 366, { footPhase: "leftContact" }),
        f(210, 231, 300, 365, 256.7, 365),
        f(371, 231, 462, 370, 413.7, 370, { footPhase: "rightPass" }),
        f(533, 232, 625, 367, 579.3, 367),
        f(691, 232, 783, 372, 735.9, 372, { footPhase: "rightContact" }),
        f(845, 231, 940, 366, 889.9, 366),
        f(1008, 233, 1097, 366, 1050.6, 366, { footPhase: "leftPass" }),
        f(1170, 230, 1263, 367, 1217.2, 367),
      ],
    },
    guard: {
      frameMs: 160,
      frames: [
        f(418, 693, 533, 799, 482.1, 799),
        f(626, 693, 761, 798, 674.1, 798),
        f(816, 673, 938, 796, 872.2, 796),
        f(1020, 672, 1141, 796, 1075.1, 796),
        f(1218, 670, 1396, 796, 1260.6, 796),
      ],
    },
    attack: {
      frameMs: 90,
      loop: false,
      frames: [
        f(59, 453, 157, 605, 107.2, 605, { attackPhase: "anticipation" }),
        f(203, 459, 342, 602, 252, 602, { attackPhase: "windup" }),
        f(400, 484, 626, 605, 451.2, 605, { attackPhase: "contact", contact: true }),
        f(638, 485, 869, 606, 689.7, 606, { attackPhase: "contact", contact: true }),
        f(884, 477, 1041, 606, 943.8, 606, { attackPhase: "recovery" }),
        f(1093, 467, 1195, 602, 1140.5, 602, { attackPhase: "settle" }),
        f(1260, 467, 1362, 602, 1307.4, 602, { attackPhase: "settle" }),
      ],
    },
    hit: {
      frameMs: 95,
      loop: false,
      frames: [
        f(55, 661, 176, 798, 103.5, 798, { offsetX: -1.2 }),
        f(234, 669, 369, 796, 287, 796, { offsetX: -0.4 }),
      ],
    },
    death: {
      frameMs: 140,
      loop: false,
      frames: [
        f(62, 849, 184, 983, 109.1, 983),
        f(225, 857, 363, 982, 297.5, 982),
        f(390, 907, 554, 978, 464.5, 978),
        f(613, 923, 839, 986, 730.7, 986),
        f(884, 925, 1099, 986, 997.5, 986),
        f(1144, 927, 1360, 981, 1250, 981),
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
