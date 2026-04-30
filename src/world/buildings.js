export const BUILDINGS = [
  {
    id: "settler-hut",
    name: "Settler Hut",
    effect: "Adds shelter for future settlers and keeps work parties close to camp.",
    effectTokens: [
      { text: "Gain " },
      { text: "+1", tone: "gain" },
      { text: " settler when construction finishes." },
    ],
    cost: { wood: 12, rock: 4 },
    maintenance: { fish: 1, settlers: 1 },
    tone: "hut",
  },
  {
    id: "smoke-rack",
    name: "Smoke Rack",
    effect: "Preserves food and improves daily fish and berry stockpiles.",
    effectTokens: [
      { text: "Preserves food and improves daily " },
      { text: "fish", tone: "food" },
      { text: " and " },
      { text: "berry", tone: "food" },
      { text: " stockpiles." },
    ],
    cost: { wood: 8, rock: 3 },
    maintenance: { fish: 1 },
    tone: "food",
  },
  {
    id: "stone-yard",
    name: "Stone Yard",
    effect: "Organizes hauling crews and improves rock delivery around roads.",
    effectTokens: [
      { text: "Improves " },
      { text: "rock", tone: "stone" },
      { text: " delivery around connected roads." },
    ],
    cost: { wood: 6, rock: 10 },
    maintenance: { fish: 1, settlers: 1 },
    tone: "stone",
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
  },
];

export function getBuildingById(id) {
  return BUILDINGS.find((building) => building.id === id) || null;
}
