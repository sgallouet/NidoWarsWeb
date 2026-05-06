export const skeletonEnemyArt = {
  key: "skeletonEnemy",
  label: "Skeleton Enemy",
  role: "enemy",
  anchor: { x: 0, y: 0 },
  bounds: { width: 31, height: 48 },
  shadow: { width: 12, height: 4.8, alpha: 0.24 },
  atlas: {
    src: "./src/content/units/skeleton-enemy/art/unitv2_atlas.png",
    cellSize: 112,
    drawWidth: 58,
    drawHeight: 58,
    anchor: { x: 56, y: 104 },
  },
  palette: {
    bone: "#d8d0b6",
    boneLight: "#f0ead1",
    boneShadow: "#8e8878",
    deepShadow: "#221d19",
    outline: "#2c251f",
    socket: "#0f0d0c",
    crack: "#6d685d",
    rust: "#8c4f35",
    rustDark: "#4d3026",
    steel: "#8f9794",
  },
  animations: {
    idle: {
      frameMs: 180,
      frames: [{ column: 0, row: 0 }, { column: 1, row: 0 }, { column: 2, row: 0 }, { column: 3, row: 0 }],
    },
    walk: {
      frameMs: 105,
      frames: [
        { column: 0, row: 1, footPhase: "leftContact" },
        { column: 1, row: 1 },
        { column: 2, row: 1, footPhase: "rightPass" },
        { column: 3, row: 1, footPhase: "rightContact" },
        { column: 4, row: 1 },
        { column: 5, row: 1, footPhase: "leftPass" },
      ],
    },
    guard: {
      frameMs: 160,
      frames: [{ column: 0, row: 2 }, { column: 1, row: 2 }],
    },
    attack: {
      frameMs: 90,
      loop: false,
      frames: [
        { column: 0, row: 3, attackPhase: "anticipation" },
        { column: 1, row: 3, attackPhase: "windup" },
        { column: 2, row: 3, attackPhase: "contact", contact: true },
        { column: 3, row: 3, attackPhase: "recovery" },
        { column: 4, row: 3, attackPhase: "settle" },
      ],
    },
    hit: {
      frameMs: 95,
      loop: false,
      frames: [{ column: 0, row: 4, offsetX: -1.2 }, { column: 1, row: 4, offsetX: -0.4 }],
    },
    death: {
      frameMs: 140,
      loop: false,
      frames: [{ column: 0, row: 5 }, { column: 1, row: 5 }, { column: 2, row: 5 }, { column: 3, row: 5 }],
    },
  },
};
