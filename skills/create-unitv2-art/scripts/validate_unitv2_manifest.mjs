import { UNIT_V2_ART } from "../../../src/content/units/unitV2Art.js";

const REQUIRED_ACTIONS_BY_ROLE = {
  enemy: ["idle", "walk", "attack", "hit", "death"],
  worker: ["idle", "walk", "gather", "work", "build", "clean", "carry", "recover", "hit", "death"],
  playerCombat: ["idle", "walk", "attack", "hit", "death"],
  critter: ["idle", "walk"],
};

const failures = [];

for (const [key, art] of Object.entries(UNIT_V2_ART)) {
  requireField(key, art.key, "key");
  requireField(key, art.label, "label");
  requirePoint(key, art.anchor, "anchor");
  requireSize(key, art.bounds, "bounds");
  requirePalette(key, art.palette);
  requireField(key, art.role, "role");
  requireAtlas(key, art.atlas, art.animations);

  const requiredActions = REQUIRED_ACTIONS_BY_ROLE[art.role] || ["idle", "walk"];
  for (const action of requiredActions) {
    const animation = art.animations?.[action];
    if (!animation) {
      failures.push(`${key}: missing animation "${action}"`);
      continue;
    }

    if (!(animation.frameMs > 0)) {
      failures.push(`${key}.${action}: frameMs must be positive`);
    }

    const hasFrames = Array.isArray(animation.frames) && animation.frames.length > 0;
    const hasChannels = animation.channels && Object.keys(animation.channels).length > 0;
    if (!hasFrames && !hasChannels) {
      failures.push(`${key}.${action}: add frames or channels`);
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Validated ${Object.keys(UNIT_V2_ART).length} UnitV2 art manifest(s).`);

function requireField(key, value, field) {
  if (value === undefined || value === null || value === "") {
    failures.push(`${key}: missing ${field}`);
  }
}

function requirePoint(key, point, field) {
  if (!point || typeof point.x !== "number" || typeof point.y !== "number") {
    failures.push(`${key}: ${field} must include numeric x and y`);
  }
}

function requireSize(key, size, field) {
  if (!size || !(size.width > 0) || !(size.height > 0)) {
    failures.push(`${key}: ${field} must include positive width and height`);
  }
}

function requirePalette(key, palette) {
  if (!palette || Object.keys(palette).length < 3) {
    failures.push(`${key}: palette needs at least 3 named colors`);
  }
}

function requireAtlas(key, atlas, animations) {
  if (!atlas) {
    return;
  }

  requireField(key, atlas.src, "atlas.src");

  if (usesExplicitFrameSources(animations)) {
    if (!(atlas.drawScale > 0)) {
      failures.push(`${key}: explicit source atlases must include positive atlas.drawScale`);
    }
    return;
  }

  if (!(atlas.cellSize > 0)) {
    failures.push(`${key}: atlas.cellSize must be positive`);
  }

  if (!(atlas.drawWidth > 0) || !(atlas.drawHeight > 0)) {
    failures.push(`${key}: atlas drawWidth/drawHeight must be positive`);
  }

  requirePoint(key, atlas.anchor, "atlas.anchor");
}

function usesExplicitFrameSources(animations) {
  const allFrames = Object.values(animations || {}).flatMap((animation) => animation.frames || []);

  return allFrames.length > 0 && allFrames.every((frame) => {
    const source = frame.source;
    const anchor = frame.anchor;

    return (
      source &&
      typeof source.left === "number" &&
      typeof source.top === "number" &&
      typeof source.right === "number" &&
      typeof source.bottom === "number" &&
      source.right > source.left &&
      source.bottom > source.top &&
      anchor &&
      typeof anchor.x === "number" &&
      typeof anchor.y === "number"
    );
  });
}
