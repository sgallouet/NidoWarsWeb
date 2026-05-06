export const lavaSerpentArt = {
  key: "lavaSerpent",
  label: "Lava Serpent",
  role: "hero",
  anchor: { x: 0, y: 0 },
  bounds: { width: 58, height: 70 },
  shadow: { width: 18, height: 6, alpha: 0.29 },
  palette: {
    scale: "#211b18",
    ember: "#fb6a22",
    lava: "#ffb23a",
    ash: "#4b3430",
    outline: "#0f0c0b",
  },
  atlas: {
    src: "./src/content/units/lava-serpent/art/unitv2_atlas.png",
    drawScale: 0.32,
  },
  animations: {
    idle: {
      frameMs: 180,
      frames: [f(78, 21, 235, 229, 151.7, 229), f(254, 21, 410, 229, 327.5, 229), f(427, 21, 589, 229, 502.5, 229)],
    },
    walk: {
      frameMs: 110,
      frames: [
        f(55, 250, 246, 436, 156.7, 436, { footPhase: "leftContact" }),
        f(255, 254, 436, 437, 346.4, 437),
        f(439, 251, 633, 436, 543.7, 436, { footPhase: "rightPass" }),
        f(641, 260, 807, 437, 732.3, 437, { footPhase: "rightContact" }),
        f(814, 256, 1002, 437, 930.7, 437),
        f(1007, 273, 1198, 437, 1119.3, 437, { footPhase: "leftPass" }),
      ],
    },
    guard: {
      frameMs: 160,
      frames: [f(58, 461, 219, 639, 133.1, 639), f(243, 460, 396, 641, 310, 641), f(414, 462, 576, 641, 483.4, 641)],
    },
    attack: {
      frameMs: 90,
      loop: false,
      frames: [
        f(60, 665, 217, 837, 125.4, 837, { attackPhase: "anticipation" }),
        f(252, 665, 388, 837, 321, 837, { attackPhase: "windup" }),
        f(419, 667, 678, 837, 501.3, 837, { attackPhase: "contact", contact: true }),
        f(671, 663, 919, 837, 741.2, 837, { attackPhase: "contact", contact: true }),
        f(915, 658, 1096, 837, 990.2, 837, { attackPhase: "recovery" }),
      ],
    },
    hit: {
      frameMs: 95,
      loop: false,
      frames: [f(60, 865, 214, 1033, 137.6, 1033, { offsetX: -1.2 }), f(247, 865, 393, 1035, 328.9, 1035, { offsetX: -0.4 })],
    },
    death: {
      frameMs: 145,
      loop: false,
      frames: [
        f(39, 1072, 222, 1206, 138.4, 1206),
        f(247, 1104, 463, 1204, 369.5, 1204),
        f(480, 1107, 724, 1205, 603.1, 1205),
        f(745, 1112, 987, 1208, 875.3, 1208),
        f(1015, 1143, 1237, 1212, 1142.2, 1212),
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
