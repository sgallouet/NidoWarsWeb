export const RESOURCE_KEYS = ["gold", "herbs", "fish", "meat", "berries", "wood", "rock"];

export const RESOURCE_ICONS = {
  gold: "./src/content/resources/gold/icon.png",
  herbs: "./src/content/resources/herbs/icon.svg",
  fish: "./src/content/resources/fish/icon.png",
  meat: "./src/content/resources/meat/icon.svg",
  berries: "./src/content/resources/berries/icon.png",
  wood: "./src/content/resources/wood/icon.png",
  rock: "./src/content/resources/rock/icon.png",
};

export const RESOURCE_NODE_ART = {
  herbs: "./src/content/resources/herbs/node.png",
  rock: "./src/content/resources/rock/node.png",
};

export const RESOURCE_DEFINITIONS = {
  fish: {
    label: "Fish Shoal",
    loads: 4,
    value: 1,
    maxWorkers: 1,
    workMs: { min: 3000, max: 30000 },
    tileTypes: new Set(["water"]),
  },
  berries: {
    label: "Berry Bush",
    loads: 5,
    value: 1,
    maxWorkers: 4,
    workMs: 6000,
    tileTypes: new Set(["forest", "flower", "grass"]),
  },
  wood: {
    label: "Timber Tree",
    loads: 4,
    value: 1,
    maxWorkers: 4,
    workMs: 15000,
    tileTypes: new Set(["forest"]),
  },
  rock: {
    label: "Rock Deposit",
    loads: 5,
    value: 1,
    maxWorkers: 2,
    workMs: 12000,
    tileTypes: new Set(["rock", "obsidian"]),
  },
};

export function getResourceDefinition(type) {
  return RESOURCE_DEFINITIONS[type] || null;
}

export function getResourceIcon(type) {
  return RESOURCE_ICONS[type] || "";
}
