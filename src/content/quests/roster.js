import { getHeroQuestPower } from "../heroes/roster.js";

const QUESTS = [
  {
    key: "salt-giant",
    name: "Slay the Salt Giant",
    kind: "Hunt",
    pitch: "A huge monster is stomping through the salt flats.",
    minTeam: 1,
    maxTeam: 3,
    difficulty: 4,
    reward: { gold: 9 },
    xp: 3,
    durationMs: 65 * 1000,
    tone: "hunt",
  },
  {
    key: "lost-caravan",
    name: "Recover the Lost Caravan",
    kind: "Rescue",
    pitch: "Find the wagon lights before the dunes swallow them.",
    minTeam: 1,
    maxTeam: 2,
    difficulty: 3,
    reward: { gold: 6 },
    xp: 2,
    durationMs: 48 * 1000,
    tone: "rescue",
  },
  {
    key: "obsidian-crown",
    name: "Break the Obsidian Crown",
    kind: "Raid",
    pitch: "Strike a volcanic lair and bring back its tribute.",
    minTeam: 2,
    maxTeam: 3,
    difficulty: 6,
    reward: { gold: 12 },
    xp: 4,
    durationMs: 82 * 1000,
    tone: "raid",
  },
  {
    key: "moonwell",
    name: "Guard the Moonwell",
    kind: "Watch",
    pitch: "Hold a night road until the pilgrims pass safely.",
    minTeam: 1,
    maxTeam: 2,
    difficulty: 4,
    reward: { gold: 7 },
    xp: 3,
    durationMs: 58 * 1000,
    tone: "watch",
  },
];

export function createQuestRoster(dayIndex) {
  return [0, 1, 2].map((offset) => {
    const quest = QUESTS[(dayIndex + offset) % QUESTS.length];

    return {
      ...quest,
      id: `${dayIndex}-${offset}-${quest.key}`,
    };
  });
}

export function getQuestTeamPower(heroes) {
  return heroes.reduce((total, hero) => total + getHeroQuestPower(hero), 0);
}

export function seededQuestRoll(seed) {
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }

  return (hash % 1000) / 1000;
}
