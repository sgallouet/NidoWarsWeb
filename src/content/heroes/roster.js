import { HERO_PORTRAITS } from "./portraits.js";

const HERO_NAMES = ["Mira", "Borin", "Sava", "Keth", "Nara", "Oryn", "Talia", "Voss", "Elun", "Rook"];

const HERO_CLASSES = [
  {
    classId: "ranger",
    className: "Ranger",
    hobby: "hunting",
    hobbyLabel: "Hunting",
    cost: { gold: 4, meat: 2 },
    pitch: "Tracks monsters by day and returns to the tavern at night.",
    tone: "gain",
  },
  {
    classId: "angler",
    className: "Angler",
    hobby: "fishing",
    hobbyLabel: "Fishing",
    cost: { gold: 3, fish: 3 },
    pitch: "Roams toward fishing spots during daylight.",
    tone: "food",
  },
  {
    classId: "guardian",
    className: "Guardian",
    hobby: "hunting",
    hobbyLabel: "Hunting",
    cost: { gold: 5, rock: 4 },
    pitch: "A sturdy fighter who grows stronger from fights.",
    tone: "watch",
  },
  {
    classId: "herbalist",
    className: "Herbalist",
    hobby: "foraging",
    hobbyLabel: "Foraging",
    cost: { gold: 3, herbs: 3 },
    pitch: "Wanders berry and herb country while the sun is up.",
    tone: "food",
  },
  {
    classId: "barbarian",
    className: "Barbarian",
    hobby: "hunting",
    hobbyLabel: "Hunting",
    cost: { gold: 6, meat: 4, rock: 4 },
    pitch: "Smashes monsters up close and soaks brutal hits.",
    tone: "watch",
    portrait: HERO_PORTRAITS.barbarian,
  },
  {
    classId: "priest",
    className: "Light Priest",
    hobby: "foraging",
    hobbyLabel: "Foraging",
    cost: { gold: 5, herbs: 4, berries: 3 },
    pitch: "Keeps distance and burns threats with sacred light.",
    tone: "hero",
    portrait: HERO_PORTRAITS.priest,
  },
];

export function createHeroRoster(dayIndex) {
  const roster = [];

  for (let index = 0; index < 3; index += 1) {
    const classTemplate = HERO_CLASSES[(dayIndex + index * 2) % HERO_CLASSES.length];
    const name = HERO_NAMES[(dayIndex * 3 + index * 5) % HERO_NAMES.length];

    roster.push({
      ...classTemplate,
      id: `${dayIndex}-${index}-${classTemplate.classId}`,
      name,
      hired: false,
    });
  }

  return roster;
}

export function getHeroQuestPower(hero) {
  return Math.max(1, (hero.heroLevel || 1) + Math.max(0, (hero.attackDamage || 1) - 1));
}
