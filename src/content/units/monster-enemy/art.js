export const monsterEnemyArt = {
  key: "monsterEnemy",
  label: "Monster Enemy",
  role: "enemy",
  anchor: { x: 0, y: 0 },
  bounds: { width: 44, height: 64 },
  shadow: { width: 18, height: 6.5, alpha: 0.3 },
  palette: {
    hide: "#4b2f32",
    muscle: "#7a4246",
    bone: "#b4a77f",
    glow: "#f04b2c",
    outline: "#140f10",
  },
  atlas: {
    src: "./src/content/units/monster-enemy/art/unitv2_atlas.png",
    drawScale: 0.34,
  },
  animations: {
    idle: {
      frameMs: 180,
      frames: [
        f(100, 38, 238, 225, 127.1, 225),
        f(330, 35, 456, 225, 357.1, 225),
        f(535, 35, 682, 225, 572.4, 225),
      ],
    },
    walk: {
      frameMs: 105,
      frames: [
        f(78, 275, 231, 440, 134.8, 440, { footPhase: "leftContact" }),
        f(284, 279, 402, 444, 349.1, 444),
        f(464, 272, 602, 444, 534.4, 444, { footPhase: "rightPass" }),
        f(649, 275, 793, 442, 707.1, 442, { footPhase: "rightContact" }),
        f(836, 272, 965, 444, 904.5, 444),
        f(1026, 276, 1157, 442, 1088.2, 442, { footPhase: "leftPass" }),
      ],
    },
    guard: {
      frameMs: 155,
      frames: [
        f(72, 500, 242, 648, 153.5, 648),
        f(291, 494, 471, 646, 370.7, 646),
        f(511, 501, 698, 649, 578.1, 649),
      ],
    },
    attack: {
      frameMs: 85,
      loop: false,
      frames: [
        f(86, 687, 221, 857, 126.2, 857, { attackPhase: "anticipation" }),
        f(276, 687, 501, 855, 320.3, 855, { attackPhase: "windup" }),
        f(518, 706, 709, 853, 598.7, 853, { attackPhase: "contact", contact: true }),
        f(741, 712, 886, 858, 809.2, 858, { attackPhase: "recovery" }),
        f(965, 712, 1102, 857, 1027.8, 857, { attackPhase: "settle" }),
      ],
    },
    hit: {
      frameMs: 95,
      loop: false,
      frames: [
        f(81, 902, 228, 1047, 178.2, 1047, { offsetX: -1.2 }),
        f(274, 901, 429, 1048, 374.4, 1048, { offsetX: -0.4 }),
      ],
    },
    death: {
      frameMs: 140,
      loop: false,
      frames: [
        f(64, 1083, 222, 1204, 127.3, 1204),
        f(262, 1099, 444, 1200, 353.5, 1200),
        f(481, 1117, 679, 1202, 592.6, 1202),
        f(708, 1139, 897, 1203, 809.2, 1203),
        f(923, 1137, 1151, 1203, 1034.2, 1203),
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
