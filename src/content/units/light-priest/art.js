export const lightPriestArt = {
  key: "lightPriest",
  label: "Light Priest",
  role: "hero",
  bounds: { width: 56, height: 65 },
  shadow: { width: 16, height: 5.5, alpha: 0.25 },
  atlas: {
    src: "./src/content/units/light-priest/art/unitv2_atlas.png",
    drawScale: 0.3,
  },
  animations: {
    idle: {
      frameMs: 180,
      frames: [
        f(30, 5, 212, 222, 107.2, 222),
        f(220, 5, 399, 222, 293.1, 222),
        f(405, 6, 581, 222, 478.5, 222),
      ],
    },
    walk: {
      frameMs: 110,
      frames: [
        f(15, 242, 211, 435, 105.1, 435, { footPhase: "leftContact" }),
        f(214, 247, 401, 437, 327.9, 437),
        f(421, 247, 614, 431, 536.4, 431, { footPhase: "rightPass" }),
        f(628, 240, 806, 435, 697.5, 435, { footPhase: "rightContact" }),
        f(836, 243, 1021, 437, 906.7, 437),
      ],
    },
    guard: {
      frameMs: 160,
      frames: [
        f(18, 459, 191, 657, 98.2, 657),
        f(209, 458, 391, 656, 298.5, 656),
        f(420, 465, 605, 655, 497.6, 655),
      ],
    },
    attack: {
      frameMs: 90,
      loop: false,
      frames: [
        f(11, 665, 179, 882, 77.9, 882, { attackPhase: "anticipation" }),
        f(202, 665, 382, 883, 266.8, 883, { attackPhase: "windup" }),
        f(390, 676, 607, 885, 461, 885, { attackPhase: "windup" }),
        f(606, 691, 899, 885, 679.9, 885, { attackPhase: "contact", contact: true }),
        f(875, 715, 1148, 886, 963, 886, { attackPhase: "recovery" }),
      ],
    },
    hit: {
      frameMs: 95,
      loop: false,
      frames: [
        f(24, 903, 189, 1069, 76.9, 1069, { offsetX: -1.1 }),
        f(231, 915, 376, 1069, 290.1, 1069, { offsetX: -0.4 }),
      ],
    },
    death: {
      frameMs: 140,
      loop: false,
      frames: [
        f(13, 1101, 204, 1230, 96.6, 1230),
        f(221, 1094, 423, 1228, 315.2, 1228),
        f(422, 1118, 613, 1228, 516.1, 1228),
        f(643, 1163, 887, 1233, 764.2, 1233),
        f(917, 1154, 1161, 1230, 1071.1, 1230),
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
