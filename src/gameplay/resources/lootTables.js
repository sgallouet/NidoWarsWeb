const MONSTER_GOLD_MIN = 2;
const MONSTER_GOLD_MAX = 7;
const ITEM_DROP_CHANCE = 0.46;

const WEAPON_BASES = [
  { name: "Ashblade", attackBonus: 1, saleValue: 18, tone: "flame" },
  { name: "Frostfang", attackBonus: 1, saleValue: 20, tone: "frost" },
  { name: "Thorn Pike", attackBonus: 2, saleValue: 28, tone: "wild" },
  { name: "Glass Saber", attackBonus: 2, saleValue: 32, tone: "arcane" },
];

const ARTIFACT_BASES = [
  { name: "Ember Charm", slot: "charm", healthBonus: 1, saleValue: 16, tone: "flame" },
  { name: "Moon Relic", slot: "relic", healthBonus: 1, saleValue: 22, tone: "frost" },
  { name: "Sun Sigil", slot: "relic", healthBonus: 2, saleValue: 30, tone: "gold" },
];

export function createMonsterLoot(monster) {
  if (!canMonsterDropLoot(monster)) {
    return null;
  }

  const threatBonus = Math.max(0, (monster.maxHealth || monster.health || 1) - 2);
  const gold =
    MONSTER_GOLD_MIN +
    Math.floor(Math.random() * (MONSTER_GOLD_MAX - MONSTER_GOLD_MIN + 1)) +
    Math.floor(threatBonus / 2);
  const items = [];

  if (Math.random() < ITEM_DROP_CHANCE + Math.min(0.18, threatBonus * 0.04)) {
    items.push(createLootItem(monster, threatBonus));
  }

  return {
    gold,
    items,
    label: items[0]?.name || "Gold",
  };
}

export function canHeroUseLootItem(hero, item) {
  if (!hero?.isHero || !item) {
    return false;
  }

  if (item.kind === "weapon") {
    const currentBonus = hero.equipment?.weapon?.attackBonus || 0;

    return item.attackBonus > currentBonus;
  }

  if (item.kind === "artifact") {
    const currentBonus = hero.equipment?.[item.slot]?.healthBonus || 0;

    return item.healthBonus > currentBonus;
  }

  return false;
}

export function applyHeroLootItem(hero, item) {
  if (!canHeroUseLootItem(hero, item)) {
    return false;
  }

  hero.equipment = hero.equipment || {};

  if (item.kind === "weapon") {
    hero.equipment.weapon = item;
    hero.attackDamage = (hero.baseAttackDamage || hero.attackDamage || 1) + item.attackBonus;
    return true;
  }

  const previousBonus = hero.equipment[item.slot]?.healthBonus || 0;

  hero.equipment[item.slot] = item;
  hero.maxHealth = (hero.maxHealth || hero.health || 1) + item.healthBonus - previousBonus;
  hero.health = Math.min(hero.maxHealth, (hero.health || 1) + item.healthBonus);
  return true;
}

export function getLootItemFee(item) {
  return Math.max(1, Math.ceil((item?.saleValue || 10) * 0.1));
}

export function getLootItemPrice(item) {
  return Math.max(1, Math.ceil((item?.saleValue || 10) * 0.7));
}

function createLootItem(monster, threatBonus) {
  const shouldDropWeapon = Math.random() < 0.58;

  if (shouldDropWeapon) {
    const base = pickByMonster(WEAPON_BASES, monster);

    return {
      id: `item-${monster.id}-${Math.floor(Math.random() * 100000)}`,
      kind: "weapon",
      name: base.name,
      attackBonus: base.attackBonus + (threatBonus >= 4 && Math.random() < 0.3 ? 1 : 0),
      saleValue: base.saleValue + threatBonus * 3,
      tone: base.tone,
    };
  }

  const base = pickByMonster(ARTIFACT_BASES, monster);

  return {
    id: `item-${monster.id}-${Math.floor(Math.random() * 100000)}`,
    kind: "artifact",
    name: base.name,
    slot: base.slot,
    healthBonus: base.healthBonus + (threatBonus >= 4 && Math.random() < 0.22 ? 1 : 0),
    saleValue: base.saleValue + threatBonus * 3,
    tone: base.tone,
  };
}

function canMonsterDropLoot(monster) {
  return Boolean(
    monster &&
      monster.faction === "monster" &&
      monster.temperament === "scary" &&
      !monster.decorative &&
      monster.role !== "Critter",
  );
}

function pickByMonster(items, monster) {
  const seed = [...String(monster.id || monster.name || "")].reduce(
    (total, char) => total + char.charCodeAt(0),
    0,
  );

  return items[seed % items.length];
}
