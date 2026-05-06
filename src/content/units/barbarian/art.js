export const barbarianArt = {
  key: "barbarian",
  label: "Barbarian",
  role: "hero",
  anchor: { x: 0, y: 0 },
  bounds: { width: 58, height: 64 },
  shadow: { width: 18, height: 6, alpha: 0.3 },
  palette: {
    skin: "#b67343",
    leather: "#3a2518",
    fur: "#6a5440",
    metal: "#8d8b82",
    outline: "#17120e",
  },
  atlas: {
    src: "./src/content/units/barbarian/art/unitv2_atlas.png",
    drawScale: 0.32,
  },
  animations: {
    idle: {
      frameMs: 180,
      frames: [
        f(97, 24, 248, 216, 134.8, 216),
        f(264, 22, 416, 215, 308.5, 215),
        f(449, 19, 591, 213, 484.2, 213),
      ],
    },
    walk: {
      frameMs: 105,
      frames: [
        f(47, 241, 235, 415, 133.2, 415, { footPhase: "leftContact" }),
        f(244, 240, 415, 415, 344.7, 415),
        f(433, 240, 599, 418, 524.3, 418, { footPhase: "rightPass" }),
        f(628, 245, 800, 420, 712, 420, { footPhase: "rightContact" }),
        f(832, 251, 999, 418, 931.6, 418),
        f(1040, 247, 1197, 418, 1099.9, 418, { footPhase: "leftPass" }),
      ],
    },
    guard: {
      frameMs: 155,
      frames: [
        f(47, 449, 214, 617, 88.5, 617),
        f(231, 449, 390, 616, 262.7, 616),
        f(403, 448, 566, 615, 438, 615),
      ],
    },
    attack: {
      frameMs: 95,
      loop: false,
      frames: [
        f(55, 650, 230, 832, 101.1, 832, { attackPhase: "anticipation" }),
        f(279, 625, 405, 832, 344.9, 832, { attackPhase: "windup" }),
        f(462, 646, 608, 833, 526.4, 833, { attackPhase: "windup" }),
        f(643, 696, 833, 847, 774.2, 847, { attackPhase: "contact", contact: true }),
        f(862, 648, 1011, 832, 921, 832, { attackPhase: "recovery" }),
      ],
    },
    hit: {
      frameMs: 95,
      loop: false,
      frames: [
        f(60, 867, 201, 1028, 131.7, 1028, { offsetX: -1.2 }),
        f(240, 870, 382, 1028, 311.8, 1028, { offsetX: -0.4 }),
      ],
    },
    death: {
      frameMs: 140,
      loop: false,
      frames: [
        f(49, 1057, 212, 1183, 127.2, 1183),
        f(226, 1093, 459, 1208, 310.1, 1208),
        f(478, 1109, 700, 1185, 602.4, 1185),
        f(722, 1111, 977, 1223, 792.9, 1223),
        f(1024, 1118, 1241, 1202, 1117, 1202),
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
