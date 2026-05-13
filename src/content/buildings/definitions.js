export const BUILDINGS = [
  {
    id: "settler-hut",
    name: "Settler Hut",
    effect: "Adds shelter for future settlers and keeps work parties close to camp.",
    effectTokens: [
      { text: "Gain " },
      { text: "+3", tone: "gain" },
      { text: " habitant beds when construction finishes." },
    ],
    cost: { wood: 12 },
    maintenance: { fish: 1 },
    habitants: 3,
    tone: "hut",
    renderMask: createDefaultBuildingRenderMask(),
  },
  {
    id: "storage-house",
    name: "Storage House",
    effect: "Creates a village drop-off point for gathered resources.",
    effectTokens: [
      { text: "Workers can " },
      { text: "drop resources", tone: "storage" },
      { text: " here instead of at the firecamp." },
    ],
    cost: { wood: 10, rock: 5 },
    maintenance: { fish: 1 },
    tone: "storage",
    renderMask: createDefaultBuildingRenderMask(),
  },
  {
    id: "torch-watch",
    name: "Torch Watch",
    effect: "Keeps the nearby night brighter and helps patrols spot danger sooner.",
    effectTokens: [
      { text: "Brightens nearby night tiles and improves " },
      { text: "patrol watch", tone: "watch" },
      { text: "." },
    ],
    cost: { wood: 10, rock: 6, herbs: 2 },
    maintenance: { fish: 1 },
    tone: "watch",
    renderMask: createDefaultBuildingRenderMask(),
  },
  {
    id: "tavern",
    name: "Tavern",
    effect: "Attracts daily hero cards that can be hired for the village.",
    effectTokens: [
      { text: "Unlocks " },
      { text: "hero cards", tone: "hero" },
      { text: " with daily tavern refreshes." },
    ],
    cost: { wood: 14, rock: 8, herbs: 2 },
    maintenance: { fish: 2, meat: 1 },
    tone: "tavern",
    renderMask: createDefaultBuildingRenderMask(),
  },
  {
    id: "guild-town",
    name: "Guild Town",
    effect: "Posts hero quests for parties to complete beyond the village.",
    effectTokens: [
      { text: "Send up to " },
      { text: "3 heroes", tone: "hero" },
      { text: " on quests for gold rewards." },
    ],
    cost: { wood: 18, rock: 12, gold: 4 },
    maintenance: { fish: 2, wood: 1 },
    tone: "guild",
    renderMask: createDefaultBuildingRenderMask(),
  },
  {
    id: "market",
    name: "Market",
    effect: "Lets heroes trade unused monster loot and pays the village a broker fee.",
    effectTokens: [
      { text: "Heroes sell extra loot here. The village earns a " },
      { text: "10%", tone: "gain" },
      { text: " transaction fee." },
    ],
    cost: { wood: 16, rock: 10, gold: 3 },
    maintenance: { fish: 1, wood: 1 },
    tone: "market",
    renderMask: createDefaultBuildingRenderMask(),
  },
];

export function getBuildingById(id) {
  return BUILDINGS.find((building) => building.id === id) || null;
}

export function getBuildingRenderMask(buildingId) {
  return getBuildingById(buildingId)?.renderMask || createDefaultBuildingRenderMask();
}

function createDefaultBuildingRenderMask() {
  return {
    ground: {
      left: -30,
      top: -1,
      right: 32,
      bottom: 22,
    },
    object: {
      left: -24,
      top: -34,
      right: 24,
      bottom: 10,
      depthY: 10,
    },
  };
}
