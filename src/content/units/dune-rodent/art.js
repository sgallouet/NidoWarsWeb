export const duneRodentArt = {
  key: "duneRodent",
  label: "Dune Rodent",
  role: "critter",
  anchor: { x: 0, y: 0 },
  bounds: { width: 34, height: 25 },
  shadow: { width: 12, height: 4, alpha: 0.22 },
  palette: {
    fur: "#211d17",
    wound: "#9e4a4e",
    whisker: "#d0b083",
    eye: "#d0c13f",
    outline: "#0d0b09",
  },
  atlas: {
    src: "./src/content/units/dune-rodent/art/unitv2_atlas.png",
    drawScale: 0.17,
  },
  animations: {
    idle: {
      frameMs: 180,
      frames: [
        f(68, 139, 273, 273, 186.2, 273),
        f(354, 139, 557, 275, 488.8, 275),
        f(595, 134, 799, 272, 722.5, 272),
        f(840, 134, 1036, 272, 940.7, 272),
      ],
    },
    walk: {
      frameMs: 95,
      frames: [
        f(40, 337, 244, 470, 187.3, 470, { footPhase: "leftContact" }),
        f(275, 338, 425, 469, 346.7, 469),
        f(459, 337, 633, 471, 583.5, 471, { footPhase: "rightPass" }),
        f(665, 344, 831, 471, 767.4, 471, { footPhase: "rightContact" }),
        f(848, 347, 1034, 473, 968.1, 473),
        f(1054, 355, 1239, 477, 1182.4, 477, { footPhase: "leftPass" }),
      ],
    },
    hit: {
      frameMs: 95,
      loop: false,
      frames: [f(55, 893, 232, 1013, 143.2, 1013), f(268, 899, 467, 1017, 370.6, 1017)],
    },
    death: {
      frameMs: 145,
      loop: false,
      frames: [
        f(47, 1062, 239, 1174, 172.3, 1174),
        f(284, 1082, 505, 1183, 434.3, 1183),
        f(542, 1076, 741, 1176, 677.8, 1176),
        f(768, 1092, 987, 1182, 906.2, 1182),
        f(999, 1088, 1228, 1186, 1120.8, 1186),
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
