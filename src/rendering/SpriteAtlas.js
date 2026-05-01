export const SPRITE_SIZE = 96;

export const SPRITES = {
  knight: { column: 0, row: 0 },
  greenArcher: { column: 1, row: 0 },
  blueWizard: { column: 2, row: 0 },
  purpleRogue: { column: 3, row: 0 },
  whiteCleric: { column: 4, row: 0 },
  dwarfAxe: { column: 5, row: 0 },
  goblin: { column: 6, row: 0 },
  skeleton: { column: 7, row: 0 },
  bat: { column: 8, row: 0 },
  ghost: { column: 9, row: 0 },
  greenSlime: { column: 0, row: 1 },
  redSlime: { column: 1, row: 1 },
  blueSlime: { column: 2, row: 1 },
  yellowSlime: { column: 3, row: 1 },
  bee: { column: 4, row: 1 },
  spider: { column: 5, row: 1 },
  scorpion: { column: 6, row: 1 },
  redMushroom: { column: 7, row: 1 },
  thornPlant: { column: 8, row: 1 },
  flytrap: { column: 9, row: 1 },
  greenEgg: { column: 0, row: 2 },
  blueEgg: { column: 1, row: 2 },
  orangeEgg: { column: 2, row: 2 },
  silverChest: { column: 3, row: 2 },
  goldChest: { column: 4, row: 2 },
  purpleChest: { column: 5, row: 2 },
  blueGem: { column: 6, row: 2 },
  redGem: { column: 7, row: 2 },
  greenGem: { column: 8, row: 2 },
  goldBag: { column: 9, row: 2 },
  redPotion: { column: 0, row: 3 },
  bluePotion: { column: 1, row: 3 },
  greenPotion: { column: 2, row: 3 },
  purplePotion: { column: 3, row: 3 },
  goldKey: { column: 4, row: 3 },
  ornateGoldKey: { column: 5, row: 3 },
  purpleKey: { column: 6, row: 3 },
  lantern: { column: 7, row: 3 },
  bomb: { column: 8, row: 3 },
  scroll: { column: 9, row: 3 },
  shortSword: { column: 0, row: 4 },
  silverSword: { column: 1, row: 4 },
  blueSword: { column: 2, row: 4 },
  goldSword: { column: 3, row: 4 },
  axe: { column: 4, row: 4 },
  hammer: { column: 5, row: 4 },
  spear: { column: 6, row: 4 },
  bow: { column: 7, row: 4 },
  blueStaff: { column: 8, row: 4 },
  greenStaff: { column: 9, row: 4 },
  woodShield: { column: 0, row: 5 },
  crossShield: { column: 1, row: 5 },
  blueShield: { column: 2, row: 5 },
  goldShield: { column: 3, row: 5 },
  roundShield: { column: 4, row: 5 },
  plumeHelm: { column: 5, row: 5 },
  hornedHelm: { column: 6, row: 5 },
  greenHood: { column: 7, row: 5 },
  purpleHat: { column: 8, row: 5 },
  crown: { column: 9, row: 5 },
  logs: { column: 0, row: 6 },
  stoneBlock: { column: 1, row: 6 },
  silverIngot: { column: 2, row: 6 },
  goldIngot: { column: 3, row: 6 },
  blueCrystal: { column: 4, row: 6 },
  purpleCrystal: { column: 5, row: 6 },
  rainbowCrystal: { column: 6, row: 6 },
  darkOre: { column: 7, row: 6 },
  coal: { column: 8, row: 6 },
  lavaRock: { column: 9, row: 6 },
  bush: { column: 0, row: 7 },
  redFlower: { column: 1, row: 7 },
  blueFlower: { column: 2, row: 7 },
  purpleFlower: { column: 3, row: 7 },
  pineTree: { column: 4, row: 7 },
  greenTree: { column: 5, row: 7 },
  autumnTree: { column: 6, row: 7 },
  stump: { column: 7, row: 7 },
  purpleMushroom: { column: 8, row: 7 },
  cactus: { column: 9, row: 7 },
  crate: { column: 0, row: 8 },
  barrel: { column: 1, row: 8 },
  clayPot: { column: 2, row: 8 },
  campfire: { column: 3, row: 8 },
  signpost: { column: 4, row: 8 },
  bench: { column: 5, row: 8 },
  workTable: { column: 6, row: 8 },
  bookshelf: { column: 7, row: 8 },
  bed: { column: 8, row: 8 },
  haystack: { column: 9, row: 8 },
  blueBook: { column: 0, row: 9 },
  greenBook: { column: 1, row: 9 },
  redBook: { column: 2, row: 9 },
  openBook: { column: 3, row: 9 },
  scrollBundle: { column: 4, row: 9 },
  crystalBall: { column: 5, row: 9 },
  stoneAltar: { column: 6, row: 9 },
  well: { column: 7, row: 9 },
  fountain: { column: 8, row: 9 },
  statue: { column: 9, row: 9 },
};

export const RESOURCE_SPRITES = {
  gold: "goldBag",
  herbs: "greenPotion",
  fish: "bluePotion",
  meat: "redPotion",
  berries: "redFlower",
  wood: "logs",
  rock: "stoneBlock",
};

export const ACTION_SPRITES = {
  eye: "blueGem",
  pick: "goldChest",
  herb: "greenPotion",
  fish: "bluePotion",
  berries: "redFlower",
  wood: "logs",
  rock: "stoneBlock",
  meat: "redPotion",
  build: "hammer",
  clean: "silverSword",
  gold: "goldBag",
  alert: "goldSword",
  muscle: "axe",
  rest: "bed",
  smile: "yellowSlime",
};

export class SpriteAtlas {
  constructor(src = "./assets/fantasy-atlas.png") {
    this.src = src;
    this.image = typeof Image === "undefined" ? null : new Image();
    this.isLoaded = false;
    this.ready = this.createReadyPromise();
  }

  draw(ctx, spriteName, x, y, options = {}) {
    const sprite = SPRITES[spriteName];

    if (!sprite || !this.isLoaded || !this.image) {
      return false;
    }

    const width = options.width ?? options.size ?? SPRITE_SIZE;
    const height = options.height ?? options.size ?? width;
    const anchorX = options.anchorX ?? 0.5;
    const anchorY = options.anchorY ?? 1;
    const rotation = options.rotation || 0;
    const alpha = options.alpha ?? 1;
    const flipX = options.flipX || false;
    const previousSmoothing = ctx.imageSmoothingEnabled;

    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    if (rotation) {
      ctx.rotate(rotation);
    }
    if (flipX) {
      ctx.scale(-1, 1);
    }
    ctx.globalAlpha *= alpha;
    ctx.imageSmoothingEnabled = options.smooth ?? false;
    ctx.drawImage(
      this.image,
      sprite.column * SPRITE_SIZE,
      sprite.row * SPRITE_SIZE,
      SPRITE_SIZE,
      SPRITE_SIZE,
      -width * anchorX,
      -height * anchorY,
      width,
      height,
    );
    ctx.imageSmoothingEnabled = previousSmoothing;
    ctx.restore();
    return true;
  }

  createReadyPromise() {
    if (!this.image) {
      return Promise.resolve(false);
    }

    return new Promise((resolve) => {
      this.image.addEventListener(
        "load",
        () => {
          this.isLoaded = true;
          resolve(true);
        },
        { once: true },
      );
      this.image.addEventListener("error", () => resolve(false), { once: true });
      this.image.src = this.src;
    });
  }
}

export const fantasySprites = new SpriteAtlas();

export function pickSprite(seed, sprites) {
  const index = Math.abs(Math.floor(seed || 0)) % sprites.length;

  return sprites[index];
}
