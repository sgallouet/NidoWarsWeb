import { findNearestPassableTile, findPath, getRandomPassableTileNear, toKey } from "./pathfinding.js";
import { PathJobQueue } from "./PathJobQueue.js";
import { UNIT_V2_ART } from "../../content/units/unitV2Art.js";
import { getMovementStepDistanceMultiplier as getStepDistanceMultiplier } from "./movementGeometry.js";
import { getTileMovementCost, isTilePassable } from "../../content/tiles/definitions.js";
import { HERB_WORK_MS } from "../resources/HerbManager.js";
import { getResourceDefinition } from "../resources/ResourceNodeManager.js";
import {
  applyHeroLootItem,
  canHeroUseLootItem,
  createMonsterLoot,
  getLootItemFee,
  getLootItemPrice,
} from "../resources/lootTables.js";

const BASE_STEP_MS = 520;
const CLEAN_WORK_MS = 3600;
const MEAT_WORK_MS = 5000;
const BUILD_WORK_MS = 260;
const REVEAL_RADIUS = 4;
const CAMP_REVEAL_RADIUS = 6;
const THREAT_RADIUS = 5;
const RESPONSE_RADIUS = 6;
const ATTACK_INTERVAL_MS = 650;
const HIT_FLASH_MS = 180;
const COMBAT_TEXT_MS = 720;
const WARRIOR_KNOCKBACK_MS = 180;
const WARRIOR_KNOCKBACK_STAGGER_MS = 760;
const RECOVERY_RADIUS = 2;
const RECOVERY_TICK_MS = 1800;
const RECOVERY_PAUSE_MS = 260;
const REVIVE_HEAL_MS = 9000;
const MONSTER_OUTER_ROAM_CAMP_RADIUS = 10;
const MONSTER_OUTER_ROAM_ATTEMPTS = 36;
const PLAYER_PATROL_WAIT_MIN_MS = 1600;
const PLAYER_PATROL_WAIT_MAX_MS = 4200;
const MONSTER_PATROL_WAIT_MIN_MS = 1400;
const MONSTER_PATROL_WAIT_MAX_MS = 3800;
const SPRITE_WARRIOR_MOVE_MULTIPLIER = 1.55;
const SPRITE_SETTLER_MOVE_MULTIPLIER = 1.55;
const HERO_MARKET_CHECK_MS = 2600;
const ATTACK_OFFSETS = [
  { column: 1, row: 0 },
  { column: -1, row: 0 },
  { column: 0, row: 1 },
  { column: 0, row: -1 },
];

export class UnitManager {
  constructor({
    world,
    units,
    campTile,
    fogOfWar,
    treasureManager,
    herbManager,
    resourceNodeManager,
    onGoldDelivered,
    onHerbsDelivered,
    onResourceDelivered,
    onTileCleaned,
    onConstructionStarted,
    corpseTtlMs,
  }) {
    this.world = world;
    this.units = units;
    this.campTile = campTile;
    this.fogOfWar = fogOfWar;
    this.treasureManager = treasureManager;
    this.herbManager = herbManager;
    this.resourceNodeManager = resourceNodeManager;
    this.onGoldDelivered = onGoldDelivered;
    this.onHerbsDelivered = onHerbsDelivered;
    this.onResourceDelivered = onResourceDelivered;
    this.onTileCleaned = onTileCleaned;
    this.onConstructionStarted = onConstructionStarted;
    this.corpseTtlMs = corpseTtlMs;
    this.activeMarkers = [];
    this.nextMarkerId = 1;
    this.pendingOrders = [];
    this.nextPendingOrderId = 1;
    this.corpses = [];
    this.threatPlayerUnits = [];
    this.threatScaryMonsters = [];
    this.nightAmount = 0;
    this.marketItems = [];
    this.nextMarketListingId = 1;
    this.pathJobs = new PathJobQueue({ world, budgetMs: 1.6 });

    for (const unit of this.units) {
      if (!unit.home) {
        unit.home = { column: campTile.column, row: campTile.row };
      }
    }
  }

  update(delta, dayNight = null) {
    this.nightAmount = dayNight?.nightAmount || 0;

    for (const unit of this.units) {
      tickUnitEffects(unit, delta);
      this.updateMovement(unit, delta);
    }

    this.updateCorpses(delta);
    this.updateThreats();
    this.updateHeroMarket(delta);
    this.assignPendingOrders();
    this.pathJobs.update();

    for (const unit of this.units) {
      if (unit.pendingPathJobId || unit.movementSegment || unit.movementQueue.length > 0) {
        continue;
      }

      if (unit.isAwayOnQuest) {
        continue;
      }

      this.updateBehavior(unit, delta);
    }

    this.removeDefeatedUnits();
  }

  revealStartingArea() {
    this.fogOfWar.revealAround(this.campTile, CAMP_REVEAL_RADIUS);

    for (const unit of this.units.filter((candidate) => candidate.faction === "player")) {
      this.fogOfWar.revealAround(unit, REVEAL_RADIUS);
    }
  }

  playIntroGreeting() {
    const greetings = ["Welcome, chief!", "Camp is ready!", "Good to see you!", "For Nido!"];
    let index = 0;

    for (const unit of this.units) {
      if (unit.faction !== "player" || unit.defeated) {
        continue;
      }

      unit.waveMs = 2400 + index * 220;
      unit.pauseMs = Math.max(unit.pauseMs || 0, 900);
      say(unit, greetings[index % greetings.length], "smile", 2600);
      index += 1;
    }
  }

  getUnitAt(column, row) {
    return this.units.find((unit) => unit.column === column && unit.row === row) || null;
  }

  getPrimaryPlayerUnit() {
    return this.units.find((unit) => unit.faction === "player") || null;
  }

  getOrderMarkers() {
    return this.activeMarkers;
  }

  getCorpses() {
    return this.corpses;
  }

  queuePendingOrder(kind, markerType, details) {
    if (this.hasPendingOrder(kind, details)) {
      return true;
    }

    const tile = this.getPendingOrderTile(kind, details);

    if (!tile) {
      return false;
    }

    const marker = this.addMarker(markerType, tile);

    this.pendingOrders.push({
      id: `pending-order-${this.nextPendingOrderId}`,
      kind,
      markerId: marker.id,
      markerType,
      ...details,
    });
    this.nextPendingOrderId += 1;
    return true;
  }

  assignPendingOrders() {
    if (this.pendingOrders.length === 0) {
      return;
    }

    const waitingOrders = [];

    for (const order of this.pendingOrders) {
      if (!this.isPendingOrderValid(order)) {
        this.removeMarker(order.markerId);
        continue;
      }

      if (this.executePendingOrder(order)) {
        this.removeMarker(order.markerId);
        continue;
      }

      waitingOrders.push(order);
    }

    this.pendingOrders = waitingOrders;
  }

  executePendingOrder(order) {
    if (order.kind === "explore") {
      const tile = this.getTileById(order.tileId);
      return tile ? this.commandExplore(tile, { allowQueue: false }) : false;
    }

    if (order.kind === "treasure") {
      const treasure = this.treasureManager.getById(order.targetId);
      return treasure ? this.commandGatherTreasure(treasure, { allowQueue: false }) : false;
    }

    if (order.kind === "herb") {
      const herb = this.herbManager.getById(order.targetId);
      return herb ? this.commandGatherHerb(herb, { allowQueue: false }) : false;
    }

    if (order.kind === "resource") {
      const node = this.resourceNodeManager.getById(order.targetId);
      return node ? this.commandGatherResource(node, { allowQueue: false }) : false;
    }

    if (order.kind === "clean") {
      const tile = this.getTileById(order.tileId);
      return tile ? this.commandCleanTile(tile, { allowQueue: false }) : false;
    }

    if (order.kind === "corpse") {
      const corpse = this.getCorpseById(order.targetId);
      return corpse ? this.commandHarvestCorpse(corpse, { allowQueue: false }) : false;
    }

    if (order.kind === "revive") {
      const corpse = this.getCorpseById(order.targetId);
      return corpse ? this.commandReviveCorpse(corpse, { allowQueue: false }) : false;
    }

    if (order.kind === "build") {
      const tile = this.getTileById(order.tileId);
      return tile ? this.commandBuildTile(tile, order.buildingId, { allowQueue: false }) : false;
    }

    return false;
  }

  isPendingOrderValid(order) {
    if (order.kind === "explore") {
      const tile = this.getTileById(order.tileId);
      return Boolean(tile && !this.fogOfWar.isRevealed(tile));
    }

    if (order.kind === "treasure") {
      return this.treasureManager.getById(order.targetId)?.status === "available";
    }

    if (order.kind === "herb") {
      const herb = this.herbManager.getById(order.targetId);
      return Boolean(herb && herb.loadsRemaining > 0 && !herb.cleaned);
    }

    if (order.kind === "resource") {
      const node = this.resourceNodeManager.getById(order.targetId);
      return Boolean(node && node.loadsRemaining > 0 && !node.cleaned);
    }

    if (order.kind === "clean") {
      const tile = this.getTileById(order.tileId);
      return Boolean(tile && !tile.cleanReservedBy && this.isCleanOrderTarget(tile));
    }

    if (order.kind === "corpse") {
      const corpse = this.getCorpseById(order.targetId);
      return Boolean(corpse && !corpse.harvested && !corpse.reservedBy);
    }

    if (order.kind === "revive") {
      const corpse = this.getCorpseById(order.targetId);
      return Boolean(corpse && corpse.revivable && corpse.status === "waiting" && !corpse.reservedBy);
    }

    if (order.kind === "build") {
      const tile = this.getTileById(order.tileId);
      return Boolean(tile && !tile.buildReservedBy && !tile.construction && !tile.building);
    }

    return false;
  }

  isCleanOrderTarget(tile) {
    if (
      this.herbManager.getActiveHerbAt(tile.column, tile.row) ||
      this.resourceNodeManager.getActiveNodeAt(tile.column, tile.row)
    ) {
      return false;
    }

    return Boolean(
      this.herbManager.getDepletedHerbAt(tile.column, tile.row) ||
        this.resourceNodeManager.getDepletedCleanableNodeAt(tile.column, tile.row) ||
        tile.type === "rock" ||
        tile.type === "obsidian" ||
        tile.type === "water",
    );
  }

  getPendingOrderTile(kind, details) {
    if (details.tileId) {
      return this.getTileById(details.tileId);
    }

    const target =
      kind === "treasure"
        ? this.treasureManager.getById(details.targetId)
        : kind === "herb"
          ? this.herbManager.getById(details.targetId)
          : kind === "resource"
            ? this.resourceNodeManager.getById(details.targetId)
            : kind === "corpse"
              ? this.getCorpseById(details.targetId)
              : kind === "revive"
                ? this.getCorpseById(details.targetId)
              : null;

    return target ? this.world.getTile(target.column, target.row) : null;
  }

  getPendingOrderKey(order) {
    return this.getOrderKey(order.kind, order);
  }

  hasPendingOrder(kind, details) {
    const key = this.getOrderKey(kind, details);

    return this.pendingOrders.some((order) => this.getPendingOrderKey(order) === key);
  }

  getOrderKey(kind, details) {
    return `${kind}:${details.targetId || details.tileId}:${details.buildingId || ""}`;
  }

  commandExplore(tile, options = {}) {
    const { allowQueue = true } = options;

    if (allowQueue && this.hasPendingOrder("explore", { tileId: tile.id })) {
      return true;
    }

    const targetTile = findNearestPassableTile(this.world, tile, this.getUnitTileKeys());

    if (!targetTile) {
      return false;
    }

    const explorers = this.getAvailableSettlers(targetTile).slice(0, 2);

    if (explorers.length === 0) {
      return allowQueue ? this.queuePendingOrder("explore", "eye", { tileId: tile.id }) : false;
    }

    const marker = this.addMarker("eye", tile);
    let assignedCount = 0;

    explorers.forEach((unit, index) => {
      const destination =
        index === 0 ? targetTile : this.getNearbyPassableTile(targetTile, index + 1) || targetTile;

      const assigned = this.assignUnitPath(unit, destination, {
        order: "explore",
        orderIcon: "eye",
        markerId: marker.id,
        stage: "outbound",
      });

      if (assigned) {
        assignedCount += 1;
        this.assignGuardToWorker(unit);
        say(unit, "Sire! yes sir!", "eye");
      }
    });

    if (assignedCount === 0) {
      this.removeMarker(marker.id);
      return allowQueue ? this.queuePendingOrder("explore", "eye", { tileId: tile.id }) : false;
    }

    return true;
  }

  commandGatherTreasure(treasure, options = {}) {
    const { allowQueue = true } = options;

    if (allowQueue && this.hasPendingOrder("treasure", { targetId: treasure.id })) {
      return true;
    }

    if (!this.treasureManager.reserve(treasure.id)) {
      return false;
    }

    const treasureTile = this.world.getTile(treasure.column, treasure.row);
    const availableUnits = this.getAvailableSettlers(treasureTile);
    const carrier = availableUnits[0];

    if (!carrier) {
      this.treasureManager.release(treasure.id);
      return allowQueue ? this.queuePendingOrder("treasure", "pick", { targetId: treasure.id }) : false;
    }

    const marker = this.addMarker("pick", treasureTile);

    carrier.carryingTreasureId = null;
    carrier.targetTreasureId = treasure.id;
    const assignedCarrier = this.assignUnitPath(carrier, treasureTile, {
      order: "haul",
      orderIcon: "pick",
      markerId: marker.id,
      stage: "toTreasure",
    });

    if (!assignedCarrier) {
      this.removeMarker(marker.id);
      this.treasureManager.release(treasure.id);
      this.setPatrol(carrier);
      return allowQueue ? this.queuePendingOrder("treasure", "pick", { targetId: treasure.id }) : false;
    }

    say(carrier, "Sire! yes sir!", "muscle");
    this.assignGuardToWorker(carrier);

    return true;
  }

  commandGatherHerb(herb, options = {}) {
    const { allowQueue = true } = options;

    if (allowQueue && this.hasPendingOrder("herb", { targetId: herb.id })) {
      return true;
    }

    const herbTile = this.world.getTile(herb.column, herb.row);
    const gatherers = this.getAvailableSettlers(herbTile).slice(0, Math.min(4, herb.loadsRemaining));
    let assignedCount = 0;

    if (gatherers.length === 0) {
      return allowQueue ? this.queuePendingOrder("herb", "herb", { targetId: herb.id }) : false;
    }

    for (const gatherer of gatherers) {
      if (!this.herbManager.reserve(herb.id, gatherer.id)) {
        continue;
      }

      const destination = this.getNearbyWorkTile(herbTile, assignedCount) || herbTile;
      const marker = this.addMarker("herb", herbTile);
      gatherer.targetHerbId = herb.id;

      const assigned = this.assignUnitPath(gatherer, destination, {
        order: "herb",
        orderIcon: "herb",
        markerId: marker.id,
        stage: "toHerb",
      });

      if (!assigned) {
        this.removeMarker(marker.id);
        this.herbManager.release(herb.id, gatherer.id);
        this.setPatrol(gatherer);
        continue;
      }

      assignedCount += 1;
      this.assignGuardToWorker(gatherer);
      say(gatherer, "On it!", "herb");
    }

    if (assignedCount === 0 && allowQueue) {
      return this.queuePendingOrder("herb", "herb", { targetId: herb.id });
    }

    return assignedCount > 0;
  }

  commandGatherResource(resourceNode, options = {}) {
    const { allowQueue = true } = options;

    if (allowQueue && this.hasPendingOrder("resource", { targetId: resourceNode.id })) {
      return true;
    }

    const gatherTile = this.getResourceGatherTile(resourceNode);

    if (!gatherTile) {
      return false;
    }

    const definition = getResourceDefinition(resourceNode.type);
    const maxWorkers = Math.min(definition?.maxWorkers || 1, resourceNode.loadsRemaining);
    const gatherers = this.getAvailableSettlers(gatherTile).slice(0, maxWorkers);
    let assignedCount = 0;

    if (gatherers.length === 0) {
      return allowQueue ? this.queuePendingOrder("resource", resourceNode.type, { targetId: resourceNode.id }) : false;
    }

    for (const gatherer of gatherers) {
      if (!this.resourceNodeManager.reserve(resourceNode.id, gatherer.id)) {
        continue;
      }

      const marker = this.addMarker(resourceNode.type, this.world.getTile(resourceNode.column, resourceNode.row));
      const destination = this.getNearbyWorkTile(gatherTile, assignedCount) || gatherTile;
      gatherer.targetResourceNodeId = resourceNode.id;

      const assigned = this.assignUnitPath(gatherer, destination, {
        order: "resource",
        orderIcon: resourceNode.type,
        markerId: marker.id,
        stage: "toResource",
      });

      if (!assigned) {
        this.removeMarker(marker.id);
        this.resourceNodeManager.release(resourceNode.id, gatherer.id);
        this.setPatrol(gatherer);
        continue;
      }

      assignedCount += 1;
      this.assignGuardToWorker(gatherer);
      say(gatherer, getGatherSpeech(resourceNode.type), resourceNode.type, 1050);
    }

    if (assignedCount === 0 && allowQueue) {
      return this.queuePendingOrder("resource", resourceNode.type, { targetId: resourceNode.id });
    }

    return assignedCount > 0;
  }

  commandCleanTile(tile, options = {}) {
    const { allowQueue = true } = options;

    if (allowQueue && this.hasPendingOrder("clean", { tileId: tile.id })) {
      return true;
    }

    if (tile.cleanReservedBy) {
      return false;
    }

    const cleanTile = findNearestPassableTile(this.world, tile, this.getUnitTileKeys());

    if (!cleanTile) {
      return false;
    }

    const worker = this.getAvailableSettlers(cleanTile)[0];

    if (!worker) {
      return allowQueue ? this.queuePendingOrder("clean", "clean", { tileId: tile.id }) : false;
    }

    const marker = this.addMarker("clean", tile);

    tile.cleanReservedBy = worker.id;
    worker.targetCleanTileId = tile.id;

    const assigned = this.assignUnitPath(worker, cleanTile, {
      order: "clean",
      orderIcon: "clean",
      markerId: marker.id,
      stage: "toClean",
    });

    if (!assigned) {
      this.removeMarker(marker.id);
      tile.cleanReservedBy = null;
      worker.targetCleanTileId = null;
      this.setPatrol(worker);
      return allowQueue ? this.queuePendingOrder("clean", "clean", { tileId: tile.id }) : false;
    }

    say(worker, "Clearing!", "clean", 1000);
    this.assignGuardToWorker(worker);
    return true;
  }

  commandHarvestCorpse(corpse, options = {}) {
    const { allowQueue = true } = options;

    if (allowQueue && this.hasPendingOrder("corpse", { targetId: corpse?.id })) {
      return true;
    }

    if (!corpse || corpse.harvested || corpse.reservedBy) {
      return false;
    }

    const corpseTile = this.world.getTile(corpse.column, corpse.row);
    const worker = this.getAvailableSettlers(corpseTile)[0];

    if (!worker) {
      return allowQueue ? this.queuePendingOrder("corpse", "meat", { targetId: corpse.id }) : false;
    }

    const marker = this.addMarker("meat", corpseTile);

    corpse.reservedBy = worker.id;
    worker.targetCorpseId = corpse.id;

    const assigned = this.assignUnitPath(worker, corpseTile, {
      order: "meat",
      orderIcon: "meat",
      markerId: marker.id,
      stage: "toCorpse",
    });

    if (!assigned) {
      this.removeMarker(marker.id);
      corpse.reservedBy = null;
      worker.targetCorpseId = null;
      this.setPatrol(worker);
      return allowQueue ? this.queuePendingOrder("corpse", "meat", { targetId: corpse.id }) : false;
    }

    this.assignGuardToWorker(worker);
    say(worker, "Harvesting!", "meat", 1000);
    return true;
  }

  commandReviveCorpse(corpse, options = {}) {
    const { allowQueue = true } = options;

    if (allowQueue && this.hasPendingOrder("revive", { targetId: corpse?.id })) {
      return true;
    }

    if (!corpse || !corpse.revivable || corpse.status !== "waiting" || corpse.reservedBy) {
      return false;
    }

    const corpseTile = this.world.getTile(corpse.column, corpse.row);
    const worker = this.getAvailableSettlers(corpseTile)[0];

    if (!worker) {
      return allowQueue ? this.queuePendingOrder("revive", "rest", { targetId: corpse.id }) : false;
    }

    const marker = this.addMarker("rest", corpseTile);

    corpse.reservedBy = worker.id;
    worker.targetCorpseId = corpse.id;

    const assigned = this.assignUnitPath(worker, corpseTile, {
      order: "revive",
      orderIcon: "rest",
      markerId: marker.id,
      stage: "toCorpse",
    });

    if (!assigned) {
      this.removeMarker(marker.id);
      corpse.reservedBy = null;
      worker.targetCorpseId = null;
      this.setPatrol(worker);
      return allowQueue ? this.queuePendingOrder("revive", "rest", { targetId: corpse.id }) : false;
    }

    this.assignGuardToWorker(worker);
    say(worker, "Bringing them home!", "rest", 1200);
    return true;
  }

  commandBuildTile(tile, buildingId, options = {}) {
    const { allowQueue = true } = options;

    if (allowQueue && this.hasPendingOrder("build", { tileId: tile.id, buildingId })) {
      return true;
    }

    if (tile.buildReservedBy || tile.construction || tile.building) {
      return false;
    }

    const builder = this.getAvailableSettlers(tile)[0];

    if (!builder) {
      return allowQueue ? this.queuePendingOrder("build", "build", { tileId: tile.id, buildingId }) : false;
    }

    const marker = this.addMarker("build", tile);

    tile.buildReservedBy = builder.id;
    builder.targetBuildTileId = tile.id;
    builder.targetBuildingId = buildingId;

    const assigned = this.assignUnitPath(builder, tile, {
      order: "build",
      orderIcon: "build",
      markerId: marker.id,
      stage: "toBuild",
    });

    if (!assigned) {
      this.removeMarker(marker.id);
      tile.buildReservedBy = null;
      builder.targetBuildTileId = null;
      builder.targetBuildingId = null;
      this.setPatrol(builder);
      return allowQueue ? this.queuePendingOrder("build", "build", { tileId: tile.id, buildingId }) : false;
    }

    this.assignGuardToWorker(builder);
    say(builder, "Building!", "build", 1000);
    return true;
  }

  getAvailablePlayerUnits(targetTile) {
    return this.units
      .filter((unit) => unit.faction === "player" && unit.order === "patrol" && unit.health >= unit.maxHealth)
      .sort((a, b) => tileDistance(a, targetTile) - tileDistance(b, targetTile));
  }

  getAvailableSettlers(targetTile) {
    return this.units
      .filter(
        (unit) =>
          unit.faction === "player" &&
          unit.role === "Settler" &&
          unit.order === "patrol" &&
          unit.health >= unit.maxHealth,
      )
      .sort((a, b) => tileDistance(a, targetTile) - tileDistance(b, targetTile));
  }

  getAvailableWarriors(targetTile) {
    return this.units
      .filter(
        (unit) =>
          unit.faction === "player" &&
          unit.role === "Warrior" &&
          unit.order === "patrol" &&
          unit.health >= unit.maxHealth,
      )
      .sort((a, b) => tileDistance(a, targetTile) - tileDistance(b, targetTile));
  }

  getAvailableHeroes(targetTile) {
    return this.units
      .filter(
        (unit) =>
          unit.isHero &&
          !unit.isAwayOnQuest &&
          unit.order !== "recover" &&
          unit.order !== "attack" &&
          unit.health >= unit.maxHealth &&
          !unit.movementSegment &&
          unit.movementQueue.length === 0,
      )
      .sort((a, b) => tileDistance(a, targetTile) - tileDistance(b, targetTile));
  }

  getHeroesByIds(heroIds) {
    const idSet = new Set(heroIds);

    return this.units.filter((unit) => idSet.has(unit.id) && unit.isHero && !unit.isAwayOnQuest);
  }

  sendHeroesOnQuest(heroIds, guildTile, quest) {
    const heroes = this.getHeroesByIds(heroIds);

    for (const hero of heroes) {
      this.abandonAssignments(hero);
      hero.isAwayOnQuest = true;
      hero.questTitle = quest.name;
      hero.questReturnTileId = guildTile.id;
      hero.order = "questAway";
      hero.orderIcon = null;
      hero.markerId = null;
      hero.stage = null;
      hero.movementQueue = [];
      hero.movementSegment = null;
      hero.targetMonsterId = null;
      hero.targetUnitId = null;
      hero.speech = null;
      hero.pauseMs = 0;
    }

    return heroes.length === heroIds.length;
  }

  completeHeroQuest(heroIds, guildTile, result) {
    const heroIdSet = new Set(heroIds);
    const returningHeroes = this.units.filter((unit) => heroIdSet.has(unit.id) && unit.isHero);

    returningHeroes.forEach((hero, index) => {
      const returnTile =
        this.findHeroRestTile(guildTile, hero.id) ||
        this.getNearbyPassableTile(guildTile, index + 1) ||
        this.campTile;

      hero.isAwayOnQuest = false;
      hero.questTitle = null;
      hero.questReturnTileId = null;
      hero.column = returnTile.column;
      hero.row = returnTile.row;
      hero.visualColumn = returnTile.column;
      hero.visualRow = returnTile.row;
      hero.movementQueue = [];
      hero.movementSegment = null;
      hero.order = "patrol";
      hero.orderIcon = result.succeeded ? "gold" : "rest";
      hero.health = Math.max(1, hero.health);
      hero.pauseMs = 900 + index * 160;
      this.gainHeroExperience(hero, result.xp || 1);

      if (result.reward > 0 && index === 0) {
        showResourceText(hero, result.reward, "gold");
      }

      say(hero, result.succeeded ? "Quest complete!" : "We return wiser.", result.succeeded ? "gold" : "rest", 1500);
    });

    this.cheerQuestReturn(guildTile, result, returningHeroes);
  }

  assignUnitPath(unit, destination, options) {
    this.cancelQueuedPath(unit);

    const path = unit.canFly
      ? buildAirPath(unit, destination)
      : findPath({
          world: this.world,
          start: unit,
          destination,
          blockedKeys: this.getBlockedKeys(unit.id),
        });

    return this.applyUnitPath(unit, destination, path, options);
  }

  queueUnitPath(unit, destination, options) {
    if (unit.canFly) {
      return this.assignUnitPath(unit, destination, options);
    }

    this.cancelQueuedPath(unit);

    const jobId = this.pathJobs.queue({
      start: unit,
      destination,
      blockedKeys: this.getBlockedKeys(unit.id),
      onComplete: (path) => {
        if (unit.pendingPathJobId !== jobId || unit.defeated) {
          return;
        }

        unit.pendingPathJobId = null;
        this.applyUnitPath(unit, destination, path, options);
      },
      onFail: () => {
        if (unit.pendingPathJobId !== jobId) {
          return;
        }

        unit.pendingPathJobId = null;
        unit.pauseMs = Math.max(unit.pauseMs || 0, 250);
      },
    });

    unit.pendingPathJobId = jobId;
    return true;
  }

  cancelQueuedPath(unit) {
    if (!unit.pendingPathJobId) {
      return;
    }

    this.pathJobs.cancel(unit.pendingPathJobId);
    unit.pendingPathJobId = null;
  }

  stopAfterCurrentStep(unit) {
    this.cancelQueuedPath(unit);
    unit.movementQueue = [];
  }

  applyUnitPath(unit, destination, path, { order, orderIcon, markerId = null, stage = null, pauseAfterPathMs = 0 } = {}) {
    if (path.length < 2 && (unit.column !== destination.column || unit.row !== destination.row)) {
      return false;
    }

    unit.movementQueue = path.length > 1 ? path.slice(1) : [];
    unit.movementSegment = null;
    unit.order = order;
    unit.orderIcon = orderIcon;
    unit.markerId = markerId;
    unit.stage = stage;
    unit.pauseMs = pauseAfterPathMs;
    this.startNextSegment(unit);
    return true;
  }

  assignReturnPath(unit, options) {
    const dropOffTile = this.getDropOffTile(unit);
    const assignedDropOff = this.assignUnitPath(unit, dropOffTile, options);

    if (assignedDropOff) {
      return assignedDropOff;
    }

    return this.assignUnitPath(unit, this.getCampAccessTile(unit), options);
  }

  getDropOffTile(origin = this.campTile) {
    let nearest = this.getCampAccessTile(origin);
    let nearestDistance = tileDistance(origin, nearest);

    for (const tile of this.world.tiles) {
      if (tile.building !== "storage-house") {
        continue;
      }

      const distance = tileDistance(origin, tile);

      if (distance < nearestDistance) {
        nearest = tile;
        nearestDistance = distance;
      }
    }

    return nearest;
  }

  getCampAccessTile(origin = this.campTile) {
    let nearest = null;
    let nearestDistance = Infinity;

    for (let row = this.campTile.row - 1; row <= this.campTile.row + 1; row += 1) {
      for (let column = this.campTile.column - 1; column <= this.campTile.column + 1; column += 1) {
        const tile = this.world.getTile(column, row);

        if (!tile || tile.id === this.campTile.id || !isTilePassable(tile)) {
          continue;
        }

        const distance = tileDistance(origin, tile);

        if (distance < nearestDistance) {
          nearest = tile;
          nearestDistance = distance;
        }
      }
    }

    return nearest || this.campTile;
  }

  assignEscort(unit, carrier, markerId) {
    this.cancelQueuedPath(unit);
    unit.order = "escort";
    unit.orderIcon = "shield";
    unit.markerId = markerId;
    unit.escortTargetId = carrier.id;
    unit.movementQueue = [];
    unit.movementSegment = null;
    this.updateEscort(unit);
  }

  updateBehavior(unit, delta) {
    if (unit.faction === "player" && unit.health < unit.maxHealth && unit.order !== "recover") {
      this.sendToRecovery(unit);
      return;
    }

    if (unit.order === "recover") {
      this.updateRecovery(unit, delta);
      return;
    }

    if (unit.staggerMs > 0) {
      unit.pauseMs = Math.max(unit.pauseMs || 0, 80);
      return;
    }

    if (unit.order === "attack") {
      this.updateAttack(unit);
      return;
    }

    if (unit.order === "explore") {
      this.updateExplore(unit);
      return;
    }

    if (unit.order === "haul") {
      this.updateHaul(unit);
      return;
    }

    if (unit.order === "herb") {
      this.updateHerb(unit, delta);
      return;
    }

    if (unit.order === "resource") {
      this.updateResource(unit, delta);
      return;
    }

    if (unit.order === "clean") {
      this.updateClean(unit, delta);
      return;
    }

    if (unit.order === "meat") {
      this.updateMeat(unit, delta);
      return;
    }

    if (unit.order === "revive") {
      this.updateRevive(unit);
      return;
    }

    if (unit.order === "build") {
      this.updateBuild(unit, delta);
      return;
    }

    if (unit.order === "guard") {
      this.updateGuard(unit);
      return;
    }

    if (unit.order === "escort") {
      this.updateEscort(unit);
      return;
    }

    if (unit.isHero) {
      this.updateHero(unit, delta);
      return;
    }

    unit.pauseMs -= delta;

    if (unit.pauseMs > 0) {
      return;
    }

    if (unit.order === "monsterPatrol") {
      this.patrolMonster(unit);
      return;
    }

    this.patrolPlayer(unit);
  }

  updateExplore(unit) {
    if (unit.stage === "outbound") {
      this.fogOfWar.revealAround(unit, REVEAL_RADIUS + 1);
      this.removeMarker(unit.markerId);
      this.assignUnitPath(unit, this.getCampAccessTile(unit), {
        order: "explore",
        orderIcon: "eye",
        markerId: null,
        stage: "returning",
      });
      say(unit, "Area clear!", "smile", 950);
      return;
    }

    this.setPatrol(unit);
  }

  updateHaul(unit) {
    if (unit.stage === "toTreasure") {
      if (this.treasureManager.pickUp(unit.targetTreasureId, unit.id)) {
        unit.carryingTreasureId = unit.targetTreasureId;
        unit.orderIcon = "muscle";
        const assignedReturn = this.assignReturnPath(unit, {
          order: "haul",
          orderIcon: "muscle",
          markerId: unit.markerId,
          stage: "returning",
        });

        if (!assignedReturn) {
          this.treasureManager.release(unit.carryingTreasureId);
          unit.carryingTreasureId = null;
          this.setPatrol(unit);
          return;
        }

        say(unit, "Heavy load!", "muscle", 1100);
      } else {
        this.setPatrol(unit);
      }
      return;
    }

    const deliveredLoot = this.treasureManager.deposit(unit.carryingTreasureId);
    const gold = deliveredLoot.gold || 0;

    if (gold > 0) {
      this.onGoldDelivered(gold);
      showResourceText(unit, gold, "gold");
    }

    if (deliveredLoot.items?.length > 0) {
      this.handleDeliveredLootItems(unit, deliveredLoot.items);
    }

    say(unit, deliveredLoot.items?.length > 0 ? "Spoils secured!" : "Gold secured!", "smile", 1200);
    this.removeMarker(unit.markerId);
    unit.carryingTreasureId = null;
    unit.targetTreasureId = null;
    this.setPatrol(unit);
  }

  updateHerb(unit, delta) {
    if (unit.stage === "toHerb") {
      unit.stage = "harvesting";
      unit.workMs = HERB_WORK_MS;
      unit.pauseMs = 160;
      say(unit, "Gathering...", "herb", 900);
      return;
    }

    if (unit.stage === "harvesting") {
      unit.workMs -= delta;
      unit.pauseMs = 160;

      if (unit.workMs > 0) {
        return;
      }

      if (!this.herbManager.pickLoad(unit.targetHerbId, unit.id)) {
        this.removeMarker(unit.markerId);
        this.herbManager.release(unit.targetHerbId, unit.id);
        this.setPatrol(unit);
        return;
      }

      unit.carryingHerbId = unit.targetHerbId;
      unit.orderIcon = "herb";
      const assignedReturn = this.assignReturnPath(unit, {
        order: "herb",
        orderIcon: "herb",
        markerId: unit.markerId,
        stage: "returning",
      });

      if (!assignedReturn) {
        unit.carryingHerbId = null;
        this.herbManager.release(unit.targetHerbId, unit.id);
        this.setPatrol(unit);
        return;
      }

      say(unit, "Herbs ready!", "herb", 950);
      return;
    }

    if (unit.carryingHerbId) {
      this.onHerbsDelivered(1);
      showResourceText(unit, 1, "herb");
      unit.carryingHerbId = null;
    }

    const herb = this.herbManager.getById(unit.targetHerbId);

    if (herb && herb.loadsRemaining > 0) {
      const herbTile = this.world.getTile(herb.column, herb.row);
      const didReserve = this.herbManager.reserve(herb.id, unit.id);
      const assignedNextTrip =
        didReserve &&
        this.assignUnitPath(unit, this.getNearbyWorkTile(herbTile, 0) || herbTile, {
          order: "herb",
          orderIcon: "herb",
          markerId: unit.markerId,
          stage: "toHerb",
        });

      if (assignedNextTrip) {
        return;
      }

      if (didReserve) {
        this.herbManager.release(herb.id, unit.id);
      }
    }

    this.removeMarker(unit.markerId);
    this.herbManager.release(unit.targetHerbId, unit.id);
    unit.targetHerbId = null;
    unit.workMs = 0;
    this.setPatrol(unit);
  }

  updateResource(unit, delta) {
    if (unit.stage === "toResource") {
      const node = this.resourceNodeManager.getById(unit.targetResourceNodeId);
      const workMs = getResourceWorkMs(node);

      unit.stage = "harvesting";
      unit.workMs = workMs;
      unit.pauseMs = 160;
      say(unit, getWorkSpeech(node?.type), node?.type || "pick", 900);
      return;
    }

    if (unit.stage === "harvesting") {
      unit.workMs -= delta;
      unit.pauseMs = 160;

      if (unit.workMs > 0) {
        return;
      }

      const load = this.resourceNodeManager.pickLoad(unit.targetResourceNodeId, unit.id);

      if (!load) {
        this.removeMarker(unit.markerId);
        this.resourceNodeManager.release(unit.targetResourceNodeId, unit.id);
        this.setPatrol(unit);
        return;
      }

      unit.carryingResourceNodeId = unit.targetResourceNodeId;
      unit.carryingResourceType = load.type;
      unit.carryingResourceAmount = load.value;
      unit.orderIcon = load.type;
      const assignedReturn = this.assignReturnPath(unit, {
        order: "resource",
        orderIcon: load.type,
        markerId: unit.markerId,
        stage: "returning",
      });

      if (!assignedReturn) {
        unit.carryingResourceNodeId = null;
        unit.carryingResourceType = null;
        unit.carryingResourceAmount = 0;
        this.resourceNodeManager.release(unit.targetResourceNodeId, unit.id);
        this.setPatrol(unit);
        return;
      }

      say(unit, getResourceLoadSpeech(load.type), load.type, 950);
      return;
    }

    if (unit.carryingResourceNodeId && unit.carryingResourceType) {
      this.onResourceDelivered(unit.carryingResourceType, unit.carryingResourceAmount || 1);
      showResourceText(unit, unit.carryingResourceAmount || 1, unit.carryingResourceType);
      unit.carryingResourceNodeId = null;
      unit.carryingResourceType = null;
      unit.carryingResourceAmount = 0;
    }

    const node = this.resourceNodeManager.getById(unit.targetResourceNodeId);

    if (node && node.loadsRemaining > 0) {
      const gatherTile = this.getResourceGatherTile(node);
      const didReserve = this.resourceNodeManager.reserve(node.id, unit.id);
      const assignedNextTrip =
        didReserve &&
        gatherTile &&
        this.assignUnitPath(unit, this.getNearbyWorkTile(gatherTile, 0) || gatherTile, {
          order: "resource",
          orderIcon: node.type,
          markerId: unit.markerId,
          stage: "toResource",
        });

      if (assignedNextTrip) {
        return;
      }

      if (didReserve) {
        this.resourceNodeManager.release(node.id, unit.id);
      }
    }

    this.removeMarker(unit.markerId);
    this.resourceNodeManager.release(unit.targetResourceNodeId, unit.id);
    unit.targetResourceNodeId = null;
    unit.workMs = 0;
    this.setPatrol(unit);
  }

  updateClean(unit, delta) {
    const tile = this.getTileById(unit.targetCleanTileId);

    if (unit.stage === "toClean") {
      unit.stage = "cleaning";
      unit.workMs = CLEAN_WORK_MS;
      unit.pauseMs = 160;
      say(unit, "Clearing...", "clean", 900);
      return;
    }

    unit.workMs -= delta;
    unit.pauseMs = 160;

    if (unit.workMs > 0) {
      return;
    }

    if (tile) {
      this.onTileCleaned?.(tile);
      tile.cleanReservedBy = null;
      say(unit, "Cleared!", "clean", 950);
    }

    this.removeMarker(unit.markerId);
    unit.targetCleanTileId = null;
    unit.workMs = 0;
    this.setPatrol(unit);
  }

  updateMeat(unit, delta) {
    const corpse = this.getCorpseById(unit.targetCorpseId);

    if (unit.stage === "toCorpse") {
      unit.stage = "harvesting";
      unit.workMs = MEAT_WORK_MS;
      unit.pauseMs = 160;
      say(unit, "Butchering...", "meat", 900);
      return;
    }

    if (unit.stage === "harvesting") {
      unit.workMs -= delta;
      unit.pauseMs = 160;

      if (unit.workMs > 0) {
        return;
      }

      if (!corpse || corpse.harvested) {
        this.removeMarker(unit.markerId);
        this.setPatrol(unit);
        return;
      }

      corpse.harvested = true;
      unit.carryingMeatCorpseId = corpse.id;
      unit.carryingResourceType = "meat";
      unit.carryingResourceAmount = corpse.meatValue || 1;
      unit.stage = "returning";

      const assignedReturn = this.assignReturnPath(unit, {
        order: "meat",
        orderIcon: "meat",
        markerId: unit.markerId,
        stage: "returning",
      });

      if (!assignedReturn) {
        unit.carryingMeatCorpseId = null;
        unit.carryingResourceType = null;
        unit.carryingResourceAmount = 0;
        this.setPatrol(unit);
      }
      return;
    }

    if (unit.carryingMeatCorpseId) {
      this.onResourceDelivered("meat", unit.carryingResourceAmount || 1);
      showResourceText(unit, unit.carryingResourceAmount || 1, "meat");
      this.removeCorpse(unit.carryingMeatCorpseId);
      say(unit, "Meat stored!", "meat", 1000);
    }

    this.removeMarker(unit.markerId);
    unit.carryingMeatCorpseId = null;
    unit.targetCorpseId = null;
    unit.carryingResourceType = null;
    unit.carryingResourceAmount = 0;
    unit.workMs = 0;
    this.setPatrol(unit);
  }

  updateRevive(unit) {
    const corpse = this.getCorpseById(unit.targetCorpseId);

    if (!corpse || !corpse.revivable) {
      this.removeMarker(unit.markerId);
      this.setPatrol(unit);
      return;
    }

    if (unit.stage === "toCorpse") {
      corpse.status = "carried";
      corpse.carriedBy = unit.id;
      corpse.reservedBy = unit.id;
      unit.carryingReviveCorpseId = corpse.id;

      const assignedReturn = this.assignUnitPath(unit, this.getCampAccessTile(unit), {
        order: "revive",
        orderIcon: "rest",
        markerId: unit.markerId,
        stage: "toFire",
      });

      if (!assignedReturn) {
        this.dropCarriedReviveCorpse(unit);
        this.setPatrol(unit);
        return;
      }

      say(unit, "Hold on.", "rest", 1000);
      return;
    }

    corpse.status = "healing";
    corpse.carriedBy = null;
    corpse.reservedBy = null;
    corpse.column = unit.column;
    corpse.row = unit.row;
    corpse.visualColumn = unit.visualColumn;
    corpse.visualRow = unit.visualRow;
    corpse.healMs = 0;
    corpse.healDurationMs = REVIVE_HEAL_MS;
    unit.carryingReviveCorpseId = null;
    say(unit, "Healing by fire.", "herb", 1200);
    this.removeMarker(unit.markerId);
    this.setPatrol(unit);
  }

  updateBuild(unit, delta) {
    const tile = this.getTileById(unit.targetBuildTileId);

    if (unit.stage === "toBuild") {
      unit.stage = "working";
      unit.workMs = BUILD_WORK_MS;
      unit.pauseMs = 160;
      say(unit, "Raising frame!", "build", 900);
      return;
    }

    unit.workMs -= delta;
    unit.pauseMs = 160;

    if (unit.workMs > 0) {
      return;
    }

    if (tile) {
      this.onConstructionStarted?.(tile, unit.targetBuildingId);
      tile.buildReservedBy = null;
      say(unit, "Frame set!", "build", 950);
    }

    this.removeMarker(unit.markerId);
    unit.targetBuildTileId = null;
    unit.targetBuildingId = null;
    unit.workMs = 0;
    this.setPatrol(unit);
  }

  updateEscort(unit) {
    const carrier = this.units.find((candidate) => candidate.id === unit.escortTargetId);

    if (!carrier || carrier.order !== "haul") {
      this.setPatrol(unit);
      return;
    }

    if (tileDistance(unit, carrier) <= 1) {
      unit.pauseMs = 220;
      return;
    }

    const escortTile = this.getNearbyPassableTile(carrier, 1) || this.world.getTile(carrier.column, carrier.row);

    this.queueUnitPath(unit, escortTile, {
      order: "escort",
      orderIcon: "shield",
      markerId: unit.markerId,
      stage: "follow",
    });
    unit.escortTargetId = carrier.id;
  }

  updateGuard(unit) {
    const worker = this.units.find((candidate) => candidate.id === unit.guardTargetId);

    if (
      !worker ||
      worker.defeated ||
      worker.order === "patrol" ||
      worker.order === "recover" ||
      tileDistance(worker, this.campTile) <= 1
    ) {
      this.setPatrol(unit);
      return;
    }

    if (tileDistance(unit, worker) <= 1) {
      unit.pauseMs = 180;
      return;
    }

    const guardTile = this.getNearbyPassableTile(worker, 1) || this.world.getTile(worker.column, worker.row);

    this.queueUnitPath(unit, guardTile, {
      order: "guard",
      orderIcon: "shield",
      stage: "follow",
    });
    unit.guardTargetId = worker.id;
  }

  assignGuardToWorker(worker) {
    if (!worker || worker.role !== "Settler") {
      return false;
    }

    if (this.units.some((unit) => unit.order === "guard" && unit.guardTargetId === worker.id)) {
      return true;
    }

    const guard = this.getAvailableWarriors(worker)[0];

    if (!guard) {
      return false;
    }

    this.cancelQueuedPath(guard);
    guard.order = "guard";
    guard.orderIcon = "shield";
    guard.guardTargetId = worker.id;
    guard.movementQueue = [];
    guard.movementSegment = null;
    say(guard, "On guard!", "shield", 1000);
    this.updateGuard(guard);
    return true;
  }

  updateThreats() {
    const playerUnits = this.threatPlayerUnits;
    const scaryMonsters = this.threatScaryMonsters;

    playerUnits.length = 0;
    scaryMonsters.length = 0;

    for (const unit of this.units) {
      if (unit.defeated || unit.isAwayOnQuest) {
        continue;
      }

      if (unit.faction === "player" && unit.order !== "recover") {
        playerUnits.push(unit);
      } else if (unit.faction === "monster" && unit.temperament === "scary") {
        scaryMonsters.push(unit);
      }
    }

    for (const monster of scaryMonsters) {
      const nearestPlayer = findNearestUnit(monster, playerUnits);

      if (!nearestPlayer || tileDistance(monster, nearestPlayer) > THREAT_RADIUS) {
        continue;
      }

      this.alertMonster(monster, nearestPlayer);

      for (const player of playerUnits) {
        if (
          tileDistance(player, monster) <= RESPONSE_RADIUS &&
          player.role === "Warrior" &&
          !player.carryingTreasureId &&
          !player.carryingHerbId &&
          !player.carryingResourceNodeId
        ) {
          this.alertPlayer(player, monster);
        }
      }
    }
  }

  alertMonster(monster, targetUnit) {
    if (monster.order !== "attack" || monster.targetUnitId !== targetUnit.id) {
      monster.order = "attack";
      monster.orderIcon = "alert";
      monster.targetUnitId = targetUnit.id;
      monster.targetMonsterId = null;
      this.stopAfterCurrentStep(monster);
      say(monster, "!", "alert", 900);
    }
  }

  alertPlayer(unit, monster) {
    if (unit.role !== "Warrior") {
      return;
    }

    if (unit.health < unit.maxHealth) {
      this.sendToRecovery(unit);
      return;
    }

    if (unit.order === "attack" && unit.targetMonsterId === monster.id) {
      return;
    }

    if (unit.markerId) {
      this.removeMarker(unit.markerId);
    }

    if (unit.targetHerbId) {
      this.herbManager.release(unit.targetHerbId, unit.id);
      unit.targetHerbId = null;
    }

    if (unit.targetTreasureId && !unit.carryingTreasureId) {
      this.treasureManager.release(unit.targetTreasureId);
      unit.targetTreasureId = null;
    }

    if (unit.targetResourceNodeId) {
      this.resourceNodeManager.release(unit.targetResourceNodeId, unit.id);
      unit.targetResourceNodeId = null;
    }

    if (unit.targetCleanTileId) {
      const tile = this.getTileById(unit.targetCleanTileId);

      if (tile) {
        tile.cleanReservedBy = null;
      }
      unit.targetCleanTileId = null;
    }

    unit.order = "attack";
    unit.orderIcon = "alert";
    unit.targetMonsterId = monster.id;
    unit.targetUnitId = null;
    unit.markerId = null;
    unit.stage = null;
    this.stopAfterCurrentStep(unit);
    say(unit, "!", "alert", 900);
  }

  updateAttack(unit) {
    const target = this.units.find((candidate) => {
      if (unit.faction === "player") {
        return candidate.id === unit.targetMonsterId && !candidate.defeated;
      }

      return candidate.id === unit.targetUnitId && !candidate.defeated;
    });

    if (!target) {
      this.setPatrol(unit);
      return;
    }

    const attackRange = getAttackRange(unit);

    if (tileDistance(unit, target) > attackRange) {
      const attackTile = this.getAttackTile(unit, target, attackRange);

      if (!attackTile) {
        unit.pauseMs = 300;
        return;
      }

      this.assignUnitPath(unit, attackTile, {
        order: "attack",
        orderIcon: "alert",
      });

      if (unit.faction === "player") {
        unit.targetMonsterId = target.id;
      } else {
        unit.targetUnitId = target.id;
      }
      return;
    }

    if (unit.attackCooldownMs > 0) {
      unit.pauseMs = 80;
      return;
    }

    unit.attackCooldownMs = ATTACK_INTERVAL_MS;
    unit.attackFlashMs =
      unit.art?.system === "unitV2"
        ? getUnitV2AnimationMs(unit, "attack", 360)
        : unit.attackStyle === "ranged"
          ? 260
          : 140;
    unit.attackVector = {
      column: target.visualColumn - unit.visualColumn,
      row: target.visualRow - unit.visualRow,
    };

    if (unit.faction === "player") {
      this.applyDamage(target, unit.attackDamage || 1);

      if (target.health <= 0) {
        this.gainHeroExperience(unit, target.decorative ? 1 : 2);
        const didDropLoot = this.handleMonsterLoot(target, unit);
        target.defeated = true;
        if (!didDropLoot) {
          say(unit, "Safe!", "smile", 900);
        } else if (!unit.isHero) {
          say(unit, "Loot!", "gold", 1100);
        }
        this.setPatrol(unit);
      }

      this.applyWarriorKnockback(unit, target);
      return;
    }

    this.applyDamage(target, unit.attackDamage || 1);

    if (!target.defeated) {
      this.sendToRecovery(target);
    }

    this.setPatrol(unit);
  }

  applyWarriorKnockback(unit, target) {
    if (!shouldApplyWarriorKnockback(unit, target)) {
      return false;
    }

    target.staggerMs = Math.max(target.staggerMs || 0, WARRIOR_KNOCKBACK_STAGGER_MS);
    target.attackCooldownMs = Math.max(target.attackCooldownMs || 0, WARRIOR_KNOCKBACK_STAGGER_MS);

    const offset = getKnockbackOffset(unit, target);
    const destination = this.getKnockbackTile(target, offset);

    if (!destination) {
      return false;
    }

    this.cancelQueuedPath(target);
    target.movementQueue = [];
    target.movementSegment = {
      from: {
        column: target.visualColumn,
        row: target.visualRow,
      },
      to: {
        column: destination.column,
        row: destination.row,
      },
      elapsed: 0,
      duration: WARRIOR_KNOCKBACK_MS,
    };
    target.facingX = getMovementFacingX(target.movementSegment);
    return true;
  }

  getKnockbackTile(target, offset) {
    if (!offset.column && !offset.row) {
      return null;
    }

    const destination = this.world.getTile(target.column + offset.column, target.row + offset.row);

    if (
      !destination ||
      !isTilePassable(destination) ||
      destination.building ||
      destination.construction ||
      this.getBlockedKeys(target.id).has(destination.id)
    ) {
      return null;
    }

    return destination;
  }

  applyDamage(target, amount) {
    target.health = Math.max(0, target.health - amount);
    target.hitFlashMs = HIT_FLASH_MS;
    showCombatText(target, `-${amount}`, "damage");

    if (target.health > 0) {
      return;
    }

    if (target.faction === "player") {
      this.abandonAssignments(target);
    }

    this.recordCorpse(target);
    target.defeated = true;
  }

  recordCorpse(unit) {
    if (!["monster", "player"].includes(unit.faction) || this.corpses.some((corpse) => corpse.id === `corpse-${unit.id}`)) {
      return;
    }

    const isPlayer = unit.faction === "player";

    this.corpses.push({
      id: `corpse-${unit.id}`,
      definition: unit.definition,
      body: unit.body,
      art: unit.art,
      colors: unit.colors,
      faction: unit.faction,
      scale: unit.scale || 1,
      column: unit.column,
      row: unit.row,
      visualColumn: unit.visualColumn,
      visualRow: unit.visualRow,
      ageMs: 0,
      status: "waiting",
      revivable: isPlayer,
      reviveUnit: isPlayer ? createReviveSnapshot(unit) : null,
      healMs: 0,
      healDurationMs: REVIVE_HEAL_MS,
      meatValue: unit.decorative ? 1 : 2,
      harvested: false,
      reservedBy: null,
      carriedBy: null,
    });
  }

  handleMonsterLoot(monster, killer) {
    const loot = createMonsterLoot(monster);

    if (!loot) {
      return false;
    }

    if (killer?.isHero) {
      this.grantLootToHero(killer, loot);
      return true;
    }

    const tile = this.findLootDropTile(monster);
    const drop = this.treasureManager.addLootDrop({ tile, loot });

    if (drop) {
      showCombatText(monster, loot.items?.length > 0 ? "Loot!" : `+${loot.gold}`, "resource");
    }

    return Boolean(drop);
  }

  grantLootToHero(hero, loot) {
    if (loot.gold > 0) {
      hero.heroGold = (hero.heroGold || 0) + loot.gold;
      showResourceText(hero, loot.gold, "gold");
    }

    let didEquip = false;
    let didSell = false;
    let didStash = false;

    for (const item of loot.items || []) {
      if (applyHeroLootItem(hero, item)) {
        didEquip = true;
        showCombatText(hero, item.kind === "weapon" ? `+${item.attackBonus} atk` : `+${item.healthBonus} hp`, "heal");
        continue;
      }

      if (this.hasMarket()) {
        this.listMarketItem(item, hero);
        didSell = true;
      } else {
        hero.backpack = hero.backpack || [];
        hero.backpack.push(item);
        didStash = true;
      }
    }

    if (didEquip) {
      say(hero, "New gear!", "gold", 1400);
    } else if (didSell) {
      say(hero, "To market!", "gold", 1300);
    } else if (didStash) {
      say(hero, "Packed loot!", "gold", 1300);
    } else if (loot.gold > 0) {
      say(hero, "Mine!", "gold", 1100);
    }
  }

  handleDeliveredLootItems(unit, items) {
    let marketCount = 0;

    for (const item of items) {
      if (this.hasMarket()) {
        this.listMarketItem(item, unit);
        marketCount += 1;
      } else {
        this.vaultItems = this.vaultItems || [];
        this.vaultItems.push(item);
      }
    }

    if (marketCount > 0) {
      say(unit, "Market goods!", "gold", 1300);
    }
  }

  updateHeroMarket(delta) {
    this.heroMarketCheckMs = Math.max(0, (this.heroMarketCheckMs || 0) - delta);

    if (this.heroMarketCheckMs > 0) {
      return;
    }

    this.heroMarketCheckMs = HERO_MARKET_CHECK_MS;

    if (!this.hasMarket() || this.marketItems.length === 0) {
      return;
    }

    for (const hero of this.units) {
      if (
        !hero.isHero ||
        hero.isAwayOnQuest ||
        hero.defeated ||
        hero.order === "recover" ||
        hero.heroGold <= 0
      ) {
        continue;
      }

      const listingIndex = this.marketItems.findIndex(
        (listing) => canHeroUseLootItem(hero, listing.item) && (hero.heroGold || 0) >= listing.price,
      );

      if (listingIndex < 0) {
        continue;
      }

      const [listing] = this.marketItems.splice(listingIndex, 1);

      hero.heroGold -= listing.price;
      applyHeroLootItem(hero, listing.item);
      const fee = getLootItemFee({ saleValue: listing.price });

      this.onGoldDelivered(fee);
      showResourceText(hero, fee, "gold");
      say(hero, "Market upgrade!", "gold", 1400);
      break;
    }
  }

  listMarketItem(item, seller) {
    const listing = {
      id: `market-item-${this.nextMarketListingId}`,
      item,
      price: getLootItemPrice(item),
      sellerId: seller?.id || "village",
    };

    this.nextMarketListingId += 1;
    this.marketItems.push(listing);

    const fee = getLootItemFee(item);

    this.onGoldDelivered(fee);

    if (seller) {
      showResourceText(seller, fee, "gold");
    }

    return listing;
  }

  hasMarket() {
    return this.world.tiles.some((tile) => tile.building === "market");
  }

  findLootDropTile(origin) {
    const blockedKeys = this.getUnitTileKeys();
    const candidates = [];

    for (let radius = 0; radius <= 2; radius += 1) {
      for (let row = origin.row - radius; row <= origin.row + radius; row += 1) {
        for (let column = origin.column - radius; column <= origin.column + radius; column += 1) {
          const tile = this.world.getTile(column, row);

          if (
            !tile ||
            blockedKeys.has(tile.id) ||
            tile.building ||
            tile.construction ||
            !isTilePassable(tile) ||
            this.treasureManager.getTreasureAt(tile.column, tile.row)
          ) {
            continue;
          }

          candidates.push(tile);
        }
      }

      if (candidates.length > 0) {
        return candidates[Math.floor(Math.random() * candidates.length)];
      }
    }

    return this.world.getTile(origin.column, origin.row) || this.campTile;
  }

  updateCorpses(delta) {
    let writeIndex = 0;

    for (let readIndex = 0; readIndex < this.corpses.length; readIndex += 1) {
      const corpse = this.corpses[readIndex];

      corpse.ageMs += delta;

      if (corpse.revivable) {
        if (corpse.status === "healing") {
          corpse.healMs = Math.min(corpse.healDurationMs || REVIVE_HEAL_MS, (corpse.healMs || 0) + delta);

          if (corpse.healMs >= (corpse.healDurationMs || REVIVE_HEAL_MS)) {
            this.restoreRevivedUnit(corpse);
            continue;
          }
        }

        this.corpses[writeIndex] = corpse;
        writeIndex += 1;
        continue;
      }

      if ((this.corpseTtlMs && corpse.ageMs >= this.corpseTtlMs) || corpse.harvested) {
        continue;
      }

      this.corpses[writeIndex] = corpse;
      writeIndex += 1;
    }

    this.corpses.length = writeIndex;
  }

  getCorpseAt(column, row) {
    return (
      this.corpses.find(
        (corpse) =>
          corpse.column === column &&
          corpse.row === row &&
          corpse.status === "waiting" &&
          !corpse.harvested &&
          !corpse.reservedBy,
      ) || null
    );
  }

  getCorpseById(corpseId) {
    return this.corpses.find((corpse) => corpse.id === corpseId) || null;
  }

  removeCorpse(corpseId) {
    this.corpses = this.corpses.filter((corpse) => corpse.id !== corpseId);
  }

  restoreRevivedUnit(corpse) {
    if (!corpse.reviveUnit || this.units.some((unit) => unit.id === corpse.reviveUnit.id)) {
      return false;
    }

    const tile = this.world.getTile(corpse.column, corpse.row) || this.getCampAccessTile(this.campTile);
    const unit = {
      ...corpse.reviveUnit,
      column: tile.column,
      row: tile.row,
      visualColumn: tile.column,
      visualRow: tile.row,
      movementQueue: [],
      movementSegment: null,
      pendingPathJobId: null,
      order: "recover",
      orderIcon: "rest",
      speech: null,
      pauseMs: RECOVERY_PAUSE_MS,
      carryingTreasureId: null,
      carryingHerbId: null,
      carryingResourceNodeId: null,
      carryingResourceType: null,
      carryingResourceAmount: 0,
      carryingMeatCorpseId: null,
      carryingReviveCorpseId: null,
      targetCorpseId: null,
      escortTargetId: null,
      guardTargetId: null,
      targetResourceNodeId: null,
      targetMonsterId: null,
      targetUnitId: null,
      attackCooldownMs: 0,
      attackFlashMs: 0,
      staggerMs: 0,
      hitFlashMs: 0,
      defeated: false,
      health: Math.max(1, Math.ceil((corpse.reviveUnit.maxHealth || 1) * 0.5)),
      recoverMs: 0,
      combatText: null,
    };

    this.units.push(unit);
    showCombatText(unit, "Revived", "heal");
    say(unit, "I live.", "smile", 1300);
    return true;
  }

  sendToRecovery(unit) {
    if (unit.faction !== "player" || unit.defeated) {
      return;
    }

    this.abandonAssignments(unit);

    unit.order = "recover";
    unit.orderIcon = "rest";
    unit.targetMonsterId = null;
    unit.targetUnitId = null;
    unit.escortTargetId = null;
    unit.markerId = null;
    unit.recoverMs = Math.min(unit.recoverMs || 0, 0);

    const recoveryTile = this.getRecoveryTile(unit);
    const needsToMove =
      recoveryTile && (unit.column !== recoveryTile.column || unit.row !== recoveryTile.row);

    if (needsToMove) {
      const assigned = this.assignUnitPath(unit, recoveryTile, {
        order: "recover",
        orderIcon: "rest",
        stage: "toCamp",
      });

      if (assigned) {
        return;
      }
    }

    unit.movementQueue = [];
    unit.movementSegment = null;
    unit.stage = "resting";
    unit.pauseMs = RECOVERY_PAUSE_MS;
  }

  updateRecovery(unit, delta) {
    unit.orderIcon = "rest";
    unit.pauseMs = RECOVERY_PAUSE_MS;

    if (unit.stage === "toCamp") {
      unit.stage = "resting";
      unit.recoverMs = Math.min(unit.recoverMs || 0, 0);
    }

    unit.recoverMs = (unit.recoverMs || 0) + delta;

    if (unit.recoverMs < RECOVERY_TICK_MS) {
      return;
    }

    unit.recoverMs = 0;
    unit.health = Math.min(unit.maxHealth, unit.health + 1);
    showCombatText(unit, "+1", "heal");

    if (unit.health >= unit.maxHealth) {
      this.setPatrol(unit);
    }
  }

  getAttackTile(unit, target, range = 1) {
    if (range <= 1) {
      return this.getAdjacentAttackTile(unit, target);
    }

    const occupiedKeys = this.getUnitTileKeys();
    let bestTile = null;
    let bestScore = Infinity;

    for (let row = target.row - range; row <= target.row + range; row += 1) {
      for (let column = target.column - range; column <= target.column + range; column += 1) {
        const tile = this.world.getTile(column, row);

        if (!tile || !isTilePassable(tile) || occupiedKeys.has(tile.id) || tileDistance(tile, target) > range) {
          continue;
        }

        const score = tileDistance(unit, tile) + Math.abs(tileDistance(tile, target) - Math.max(2, range - 1)) * 0.35;

        if (score < bestScore) {
          bestScore = score;
          bestTile = tile;
        }
      }
    }

    return bestTile || this.getAdjacentAttackTile(unit, target);
  }

  getAdjacentAttackTile(unit, target) {
    const occupiedKeys = this.getUnitTileKeys();
    let bestTile = null;
    let bestDistance = Infinity;

    for (const offset of ATTACK_OFFSETS) {
      const tile = this.world.getTile(target.column + offset.column, target.row + offset.row);

      if (!tile || !isTilePassable(tile) || occupiedKeys.has(tile.id)) {
        continue;
      }

      const distance = tileDistance(unit, tile);

      if (distance < bestDistance) {
        bestDistance = distance;
        bestTile = tile;
      }
    }

    return bestTile;
  }

  patrolPlayer(unit) {
    const destination = getRandomPassableTileNear(
      this.world,
      { column: this.campTile.column, row: this.campTile.row },
      unit.patrolRadius,
      this.getBlockedKeys(unit.id),
    );

    if (!destination) {
      unit.pauseMs = 500;
      return;
    }

    this.queueUnitPath(unit, destination, {
      order: "patrol",
      orderIcon: null,
      pauseAfterPathMs: getRandomPatrolWaitMs(unit),
    });
  }

  patrolMonster(unit) {
    if (unit.patrolMode === "localRoam") {
      const localDestination = this.getLocalRoamTile(unit);

      if (localDestination) {
        this.queueUnitPath(unit, localDestination, {
          order: "monsterPatrol",
          orderIcon: null,
          pauseAfterPathMs: getRandomPatrolWaitMs(unit),
        });
        return;
      }
    }

    if (unit.patrolMode === "outerRoam") {
      const roamingDestination = this.getOuterRoamTile(unit);

      if (roamingDestination) {
        this.queueUnitPath(unit, roamingDestination, {
          order: "monsterPatrol",
          orderIcon: null,
          pauseAfterPathMs: getRandomPatrolWaitMs(unit),
        });
        return;
      }
    }

    const destination =
      (unit.canFly
        ? this.getRandomFlyTileNear(unit, unit.patrolRadius)
        : getRandomPassableTileNear(this.world, unit, unit.patrolRadius, this.getBlockedKeys(unit.id))) ||
      getRandomPassableTileNear(
        this.world,
        { column: Math.floor(this.world.columns / 2), row: Math.floor(this.world.rows / 2) },
        14,
        this.getBlockedKeys(unit.id),
      );

    if (!destination) {
      unit.pauseMs = 700;
      return;
    }

    this.queueUnitPath(unit, destination, {
      order: "monsterPatrol",
      orderIcon: null,
      pauseAfterPathMs: getRandomPatrolWaitMs(unit),
    });
  }

  getLocalRoamTile(unit) {
    const blockedKeys = this.getBlockedKeys(unit.id);
    const origin = unit.home || unit;
    const minCampDistance = unit.roamMinCampDistance || 0;

    for (let attempt = 0; attempt < MONSTER_OUTER_ROAM_ATTEMPTS; attempt += 1) {
      const tile = getRandomPassableTileNear(this.world, origin, unit.patrolRadius, blockedKeys);

      if (!tile || tileDistance(tile, this.campTile) < minCampDistance) {
        continue;
      }

      return tile;
    }

    const fallback = getRandomPassableTileNear(
      this.world,
      unit,
      Math.max(2, Math.floor(unit.patrolRadius / 2)),
      blockedKeys,
    );

    return fallback && tileDistance(fallback, this.campTile) >= minCampDistance ? fallback : null;
  }

  getOuterRoamTile(unit) {
    const blockedKeys = this.getBlockedKeys(unit.id);
    const minDistance = unit.roamMinCampDistance || MONSTER_OUTER_ROAM_CAMP_RADIUS;

    for (let attempt = 0; attempt < MONSTER_OUTER_ROAM_ATTEMPTS; attempt += 1) {
      const tile = this.world.getTile(
        Math.floor(Math.random() * this.world.columns),
        Math.floor(Math.random() * this.world.rows),
      );

      if (
        !tile ||
        blockedKeys.has(tile.id) ||
        !isTilePassable(tile) ||
        tileDistance(tile, this.campTile) < minDistance
      ) {
        continue;
      }

      return tile;
    }

    const fallback = getRandomPassableTileNear(this.world, unit, unit.patrolRadius, blockedKeys);

    return fallback && tileDistance(fallback, this.campTile) >= minDistance ? fallback : null;
  }

  setPatrol(unit) {
    this.cancelQueuedPath(unit);
    this.dropCarriedReviveCorpse(unit);

    if (unit.targetHerbId) {
      this.herbManager.release(unit.targetHerbId, unit.id);
    }

    if (unit.targetResourceNodeId) {
      this.resourceNodeManager.release(unit.targetResourceNodeId, unit.id);
    }

    if (unit.targetCleanTileId) {
      const tile = this.getTileById(unit.targetCleanTileId);

      if (tile) {
        tile.cleanReservedBy = null;
      }
    }

    if (unit.targetBuildTileId) {
      const tile = this.getTileById(unit.targetBuildTileId);

      if (tile) {
        tile.buildReservedBy = null;
      }
    }

    if (unit.targetCorpseId) {
      const corpse = this.getCorpseById(unit.targetCorpseId);

      if (corpse && corpse.reservedBy === unit.id && !corpse.harvested) {
        corpse.reservedBy = null;
      }
    }

    if (unit.targetTreasureId && !unit.carryingTreasureId) {
      this.treasureManager.release(unit.targetTreasureId);
    }

    unit.order = unit.faction === "player" ? "patrol" : "monsterPatrol";
    unit.orderIcon = null;
    unit.markerId = null;
    unit.stage = null;
    unit.escortTargetId = null;
    unit.targetHerbId = null;
    unit.carryingHerbId = null;
    unit.targetResourceNodeId = null;
    unit.carryingResourceNodeId = null;
    unit.carryingResourceType = null;
    unit.carryingResourceAmount = 0;
    unit.targetCleanTileId = null;
    unit.targetBuildTileId = null;
    unit.targetBuildingId = null;
    unit.targetCorpseId = null;
    unit.carryingMeatCorpseId = null;
    unit.carryingReviveCorpseId = null;
    unit.guardTargetId = null;
    unit.workMs = 0;
    unit.targetMonsterId = null;
    unit.targetUnitId = null;
    unit.recoverMs = 0;
    unit.movementQueue = [];
    unit.movementSegment = null;
    unit.pauseMs = getRandomPatrolWaitMs(unit);
  }

  removeDefeatedUnits() {
    let writeIndex = 0;

    for (let readIndex = 0; readIndex < this.units.length; readIndex += 1) {
      const unit = this.units[readIndex];

      if (unit.defeated) {
        this.cancelQueuedPath(unit);
        continue;
      }

      this.units[writeIndex] = unit;
      writeIndex += 1;
    }

    this.units.length = writeIndex;
  }

  abandonAssignments(unit) {
    this.cancelQueuedPath(unit);
    this.removeMarker(unit.markerId);
    this.dropCarriedReviveCorpse(unit);

    if (unit.targetHerbId) {
      this.herbManager.release(unit.targetHerbId, unit.id);
    }

    if (unit.targetResourceNodeId) {
      this.resourceNodeManager.release(unit.targetResourceNodeId, unit.id);
    }

    if (unit.carryingTreasureId || unit.targetTreasureId) {
      this.treasureManager.release(unit.carryingTreasureId || unit.targetTreasureId);
    }

    if (unit.targetCleanTileId) {
      const tile = this.getTileById(unit.targetCleanTileId);

      if (tile) {
        tile.cleanReservedBy = null;
      }
    }

    if (unit.targetBuildTileId) {
      const tile = this.getTileById(unit.targetBuildTileId);

      if (tile) {
        tile.buildReservedBy = null;
      }
    }

    if (unit.targetCorpseId) {
      const corpse = this.getCorpseById(unit.targetCorpseId);

      if (corpse && corpse.reservedBy === unit.id && !corpse.harvested) {
        corpse.reservedBy = null;
      }
    }

    unit.carryingTreasureId = null;
    unit.targetTreasureId = null;
    unit.carryingHerbId = null;
    unit.targetHerbId = null;
    unit.carryingResourceNodeId = null;
    unit.targetResourceNodeId = null;
    unit.carryingResourceType = null;
    unit.carryingResourceAmount = 0;
    unit.targetCleanTileId = null;
    unit.targetBuildTileId = null;
    unit.targetBuildingId = null;
    unit.targetCorpseId = null;
    unit.carryingMeatCorpseId = null;
    unit.carryingReviveCorpseId = null;
    unit.guardTargetId = null;
    unit.workMs = 0;
  }

  dropCarriedReviveCorpse(unit) {
    if (!unit.carryingReviveCorpseId) {
      return;
    }

    const corpse = this.getCorpseById(unit.carryingReviveCorpseId);

    if (corpse && corpse.status === "carried" && corpse.carriedBy === unit.id) {
      corpse.status = "waiting";
      corpse.carriedBy = null;
      corpse.reservedBy = null;
      corpse.column = unit.column;
      corpse.row = unit.row;
      corpse.visualColumn = unit.visualColumn;
      corpse.visualRow = unit.visualRow;
    }
  }

  updateMovement(unit, delta) {
    if (!unit.movementSegment) {
      return;
    }

    let remaining = delta;

    while (unit.movementSegment && remaining > 0) {
      const segment = unit.movementSegment;
      const previousElapsed = segment.elapsed;
      const nextElapsed = Math.min(segment.duration, previousElapsed + remaining);
      const consumed = nextElapsed - previousElapsed;

      segment.elapsed = nextElapsed;
      remaining -= consumed;

      const progress = Math.min(1, segment.elapsed / segment.duration);
      const movementProgress = getVisualMovementProgress(unit, progress);

      unit.visualColumn = lerp(segment.from.column, segment.to.column, movementProgress);
      unit.visualRow = lerp(segment.from.row, segment.to.row, movementProgress);

      if (progress < 1) {
        return;
      }

      unit.column = segment.to.column;
      unit.row = segment.to.row;
      unit.visualColumn = unit.column;
      unit.visualRow = unit.row;
      unit.movementSegment = null;

      if (unit.faction === "player") {
        this.fogOfWar.revealAround(unit, REVEAL_RADIUS);
      }

      this.startNextSegment(unit);
    }
  }

  startNextSegment(unit) {
    const nextTile = unit.movementQueue.shift();

    if (!nextTile) {
      return;
    }

    const destinationTile = this.world.getTile(nextTile.column, nextTile.row);
    const carryMultiplier = hasCarriedLoad(unit) ? 2 : 1;
    const nightMultiplier = unit.faction === "player" ? 1 + this.nightAmount * 0.3 : 1;
    const terrainCost = unit.canFly ? 1 : getTileMovementCost(destinationTile);
    const stepDistanceMultiplier = getUnitStepDistanceMultiplier(unit, nextTile);
    const duration =
      (BASE_STEP_MS *
        terrainCost *
        stepDistanceMultiplier *
        carryMultiplier *
        nightMultiplier *
        getMovementDurationMultiplier(unit)) /
      unit.speed;

    unit.movementSegment = {
      from: {
        column: unit.column,
        row: unit.row,
      },
      to: nextTile,
      elapsed: 0,
      duration,
    };
    unit.facingX = getMovementFacingX(unit.movementSegment);
  }

  getNearbyPassableTile(origin, radius) {
    return getRandomPassableTileNear(this.world, origin, radius, this.getUnitTileKeys());
  }

  findHeroSpawnTile(origin) {
    const blockedKeys = this.getUnitTileKeys();

    for (let radius = 1; radius <= 4; radius += 1) {
      for (let row = origin.row - radius; row <= origin.row + radius; row += 1) {
        for (let column = origin.column - radius; column <= origin.column + radius; column += 1) {
          const tile = this.world.getTile(column, row);

          if (!tile || blockedKeys.has(tile.id) || !isTilePassable(tile) || tile.building || tile.construction) {
            continue;
          }

          return tile;
        }
      }
    }

    return findNearestPassableTile(this.world, origin, blockedKeys);
  }

  addHero(hero, spawnTile, homeTile) {
    const unit = createHeroUnit(hero, spawnTile, homeTile);

    this.units.push(unit);
    this.fogOfWar.revealAround(unit, REVEAL_RADIUS);
    say(unit, `${hero.className} hired!`, "smile", 1200);
    return unit;
  }

  getNearbyWorkTile(origin, index) {
    if (index === 0 && isTilePassable(origin) && !this.getBlockedKeys(null).has(origin.id)) {
      return origin;
    }

    const offsets = [
      { column: 1, row: 0 },
      { column: -1, row: 0 },
      { column: 0, row: 1 },
      { column: 0, row: -1 },
      { column: 1, row: 1 },
      { column: -1, row: -1 },
      { column: 1, row: -1 },
      { column: -1, row: 1 },
    ];
    const blockedKeys = this.getUnitTileKeys();

    for (let i = 0; i < offsets.length; i += 1) {
      const offset = offsets[(index + i) % offsets.length];
      const tile = this.world.getTile(origin.column + offset.column, origin.row + offset.row);

      if (tile && isTilePassable(tile) && !blockedKeys.has(tile.id)) {
        return tile;
      }
    }

    return findNearestPassableTile(this.world, origin, blockedKeys);
  }

  getResourceGatherTile(resourceNode) {
    const tile = this.world.getTile(resourceNode.column, resourceNode.row);

    if (tile && isTilePassable(tile)) {
      return tile;
    }

    return findNearestPassableTile(this.world, resourceNode, this.getUnitTileKeys());
  }

  updateHero(unit, delta) {
    if (this.nightAmount > 0.42) {
      this.updateHeroRest(unit);
      return;
    }

    if (unit.order === "heroRest") {
      this.setPatrol(unit);
      return;
    }

    if (unit.order === "heroActivity") {
      this.updateHeroActivity(unit, delta);
      return;
    }

    unit.pauseMs -= delta;

    if (unit.pauseMs > 0) {
      return;
    }

    const destination = this.getHeroHobbyTile(unit);

    if (destination) {
      this.queueUnitPath(unit, destination, {
        order: "heroActivity",
        orderIcon: getHeroHobbyIcon(unit.heroHobby),
        stage: "toActivity",
      });
      say(unit, getHeroHobbyTravelSpeech(unit.heroHobby), getHeroHobbyIcon(unit.heroHobby), 1000);
      return;
    }

    this.patrolPlayer(unit);
  }

  updateHeroActivity(unit, delta) {
    if (unit.stage === "toActivity") {
      unit.stage = "working";
      unit.workMs = getHeroHobbyWorkMs(unit.heroHobby);
      unit.pauseMs = 160;
      say(unit, getHeroHobbyWorkSpeech(unit.heroHobby), getHeroHobbyIcon(unit.heroHobby), 1000);
      return;
    }

    unit.workMs -= delta;
    unit.pauseMs = 160;

    if (unit.workMs > 0) {
      return;
    }

    this.gainHeroExperience(unit, 1);
    unit.pauseMs = 700 + Math.random() * 1200;
    this.setPatrol(unit);
  }

  updateHeroRest(unit) {
    const homeTile = this.getTileById(unit.heroHomeTileId) || this.campTile;

    if (tileDistance(unit, homeTile) <= 1) {
      unit.order = "heroRest";
      unit.orderIcon = "rest";
      unit.pauseMs = 600;
      return;
    }

    const restTile = this.findHeroRestTile(homeTile, unit.id) || homeTile;

    if (tileDistance(unit, restTile) > 0) {
      this.queueUnitPath(unit, restTile, {
        order: "heroRest",
        orderIcon: "rest",
        stage: "toHome",
      });
      say(unit, "Back by nightfall.", "rest", 1000);
      return;
    }

    unit.order = "heroRest";
    unit.orderIcon = "rest";
    unit.pauseMs = 600;
  }

  findHeroRestTile(origin, unitId) {
    const blockedKeys = this.getBlockedKeys(unitId);

    for (let radius = 1; radius <= 3; radius += 1) {
      for (let row = origin.row - radius; row <= origin.row + radius; row += 1) {
        for (let column = origin.column - radius; column <= origin.column + radius; column += 1) {
          const tile = this.world.getTile(column, row);

          if (!tile || blockedKeys.has(tile.id) || !isTilePassable(tile) || tile.building || tile.construction) {
            continue;
          }

          return tile;
        }
      }
    }

    return null;
  }

  getHeroHobbyTile(unit) {
    if (unit.heroHobby === "fishing") {
      return this.getNearestResourceWorkTile(unit, "fish");
    }

    if (unit.heroHobby === "foraging") {
      return this.getNearestResourceWorkTile(unit, "berries");
    }

    if (unit.heroHobby === "hunting") {
      const monsters = this.units.filter(
        (candidate) => candidate.faction === "monster" && candidate.temperament === "scary" && !candidate.defeated,
      );
      const nearest = findNearestUnit(unit, monsters);
      const attackTile = nearest ? this.getAttackTile(unit, nearest, getAttackRange(unit)) : null;

      return attackTile || getRandomPassableTileNear(this.world, unit, 8, this.getUnitTileKeys());
    }

    return getRandomPassableTileNear(this.world, unit, 6, this.getUnitTileKeys());
  }

  getNearestResourceWorkTile(unit, type) {
    const nodes = this.resourceNodeManager
      .getVisibleNodes()
      .filter((node) => node.type === type && node.loadsRemaining > 0);
    let bestTile = null;
    let bestDistance = Infinity;

    for (const node of nodes) {
      const tile = findNearestPassableTile(this.world, node, this.getUnitTileKeys());

      if (!tile) {
        continue;
      }

      const distance = tileDistance(unit, tile);

      if (distance < bestDistance) {
        bestDistance = distance;
        bestTile = tile;
      }
    }

    return bestTile || getRandomPassableTileNear(this.world, unit, 7, this.getUnitTileKeys());
  }

  gainHeroExperience(unit, amount) {
    if (!unit.isHero || amount <= 0) {
      return;
    }

    unit.heroXp = (unit.heroXp || 0) + amount;

    while (unit.heroXp >= unit.heroNextLevelXp) {
      unit.heroXp -= unit.heroNextLevelXp;
      unit.heroLevel += 1;
      unit.heroNextLevelXp += 2;
      unit.maxHealth += 1;
      unit.health = unit.maxHealth;
      unit.speed += 0.04;

      if (unit.heroLevel % 2 === 0) {
        unit.attackDamage += 1;
      }

      showCombatText(unit, `Lv ${unit.heroLevel}`, "heal");
      say(unit, "Level up!", "smile", 1200);
    }
  }

  cheerQuestReturn(guildTile, result, heroes) {
    const cheers = result.succeeded
      ? ["Heroes!", "Gold!", "Huzzah!", "They return!"]
      : ["Welcome back!", "Rest now.", "Next time!"];
    let cheerIndex = 0;

    for (const unit of this.units) {
      if (
        unit.defeated ||
        unit.isAwayOnQuest ||
        unit.faction !== "player" ||
        heroes.includes(unit) ||
        tileDistance(unit, guildTile) > 9
      ) {
        continue;
      }

      say(unit, cheers[cheerIndex % cheers.length], result.succeeded ? "smile" : "rest", 1600);
      cheerIndex += 1;
    }
  }

  getRandomFlyTileNear(origin, radius) {
    const candidates = [];

    for (let row = origin.row - radius; row <= origin.row + radius; row += 1) {
      for (let column = origin.column - radius; column <= origin.column + radius; column += 1) {
        const tile = this.world.getTile(column, row);

        if (!tile || (column === origin.column && row === origin.row)) {
          continue;
        }

        candidates.push(tile);
      }
    }

    return candidates[Math.floor(Math.random() * candidates.length)] || null;
  }

  getTileById(tileId) {
    if (!tileId) {
      return null;
    }

    const [column, row] = tileId.split(":").map(Number);

    return this.world.getTile(column, row);
  }

  getRecoveryTile(unit) {
    const blockedKeys = this.getBlockedKeys(unit.id);
    const candidates = [];

    for (let row = this.campTile.row - RECOVERY_RADIUS; row <= this.campTile.row + RECOVERY_RADIUS; row += 1) {
      for (
        let column = this.campTile.column - RECOVERY_RADIUS;
        column <= this.campTile.column + RECOVERY_RADIUS;
        column += 1
      ) {
        const tile = this.world.getTile(column, row);

        if (!tile || blockedKeys.has(tile.id) || !isTilePassable(tile)) {
          continue;
        }

        candidates.push(tile);
      }
    }

    candidates.sort((a, b) => {
      const campPenaltyA = a.id === this.campTile.id ? 1 : 0;
      const campPenaltyB = b.id === this.campTile.id ? 1 : 0;

      return campPenaltyA - campPenaltyB || tileDistance(unit, a) - tileDistance(unit, b);
    });

    return candidates[0] || this.campTile;
  }

  addMarker(type, tile) {
    const marker = {
      id: `marker-${this.nextMarkerId}`,
      type,
      column: tile.column,
      row: tile.row,
    };

    this.nextMarkerId += 1;
    this.activeMarkers.push(marker);
    return marker;
  }

  removeMarker(markerId) {
    if (!markerId) {
      return;
    }

    this.activeMarkers = this.activeMarkers.filter((marker) => marker.id !== markerId);
  }

  getBlockedKeys(exceptUnitId) {
    return new Set(
      this.units
        .filter((unit) => unit.id !== exceptUnitId && !unit.isAwayOnQuest)
        .map((unit) => toKey(unit.column, unit.row)),
    );
  }

  getUnitTileKeys() {
    return new Set(this.units.filter((unit) => !unit.isAwayOnQuest).map((unit) => toKey(unit.column, unit.row)));
  }
}

function say(unit, text, icon, duration = 1300) {
  unit.speech = {
    text,
    icon,
    remainingMs: duration,
  };
  unit.orderIcon = icon || unit.orderIcon;
}

function getGatherSpeech(type) {
  if (type === "fish") {
    return "Fishing!";
  }

  if (type === "rock") {
    return "Mining!";
  }

  return "Picking!";
}

function getResourceLoadSpeech(type) {
  if (type === "fish") {
    return "Fresh catch!";
  }

  if (type === "rock") {
    return "Stone ready!";
  }

  return "Basket full!";
}

function getResourceWorkMs(node) {
  const workMs = getResourceDefinition(node?.type)?.workMs || 6000;

  if (typeof workMs === "number") {
    return workMs;
  }

  return workMs.min + Math.random() * (workMs.max - workMs.min);
}

function getWorkSpeech(type) {
  if (type === "fish") {
    return "Fishing...";
  }

  if (type === "wood") {
    return "Chopping...";
  }

  if (type === "rock") {
    return "Mining...";
  }

  return "Gathering...";
}

function tickUnitEffects(unit, delta) {
  tickSpeech(unit, delta);
  unit.waveMs = Math.max(0, (unit.waveMs || 0) - delta);
  unit.attackCooldownMs = Math.max(0, unit.attackCooldownMs - delta);
  unit.attackFlashMs = Math.max(0, (unit.attackFlashMs || 0) - delta);
  unit.hitFlashMs = Math.max(0, (unit.hitFlashMs || 0) - delta);
  unit.staggerMs = Math.max(0, (unit.staggerMs || 0) - delta);

  if (unit.combatText) {
    unit.combatText.remainingMs -= delta;

    if (unit.combatText.remainingMs <= 0) {
      unit.combatText = null;
    }
  }
}

function tickSpeech(unit, delta) {
  if (!unit.speech) {
    return;
  }

  unit.speech.remainingMs -= delta;

  if (unit.speech.remainingMs <= 0) {
    unit.speech = null;
  }
}

function showCombatText(unit, text, tone) {
  unit.combatText = {
    text,
    tone,
    remainingMs: COMBAT_TEXT_MS,
    durationMs: COMBAT_TEXT_MS,
  };
}

function showResourceText(unit, amount, type) {
  unit.combatText = {
    text: `+${amount}`,
    tone: "resource",
    resourceType: type,
    remainingMs: COMBAT_TEXT_MS + 220,
    durationMs: COMBAT_TEXT_MS + 220,
  };
}

function createReviveSnapshot(unit) {
  return {
    ...unit,
    movementQueue: [],
    movementSegment: null,
    pendingPathJobId: null,
    order: "recover",
    orderIcon: "rest",
    speech: null,
    pauseMs: RECOVERY_PAUSE_MS,
    carryingTreasureId: null,
    carryingHerbId: null,
    carryingResourceNodeId: null,
    carryingResourceType: null,
    carryingResourceAmount: 0,
    carryingMeatCorpseId: null,
    carryingReviveCorpseId: null,
    escortTargetId: null,
    guardTargetId: null,
    targetHerbId: null,
    targetTreasureId: null,
    targetResourceNodeId: null,
    targetCleanTileId: null,
    targetBuildTileId: null,
    targetBuildingId: null,
    targetCorpseId: null,
    targetMonsterId: null,
    targetUnitId: null,
    attackCooldownMs: 0,
    attackFlashMs: 0,
    staggerMs: 0,
    recoverMs: 0,
    hitFlashMs: 0,
    combatText: null,
    defeated: false,
  };
}

function getAttackRange(unit) {
  return Math.max(1, unit.attackRange || 1);
}

function shouldApplyWarriorKnockback(unit, target) {
  return (
    unit.faction === "player" &&
    unit.role === "Warrior" &&
    unit.attackStyle !== "ranged" &&
    target.faction === "monster" &&
    target.health > 0 &&
    !target.defeated &&
    !target.decorative &&
    !target.canFly
  );
}

function getKnockbackOffset(unit, target) {
  const visualColumnDelta = target.visualColumn - unit.visualColumn || target.column - unit.column;
  const visualRowDelta = target.visualRow - unit.visualRow || target.row - unit.row;

  if (Math.abs(visualColumnDelta) >= Math.abs(visualRowDelta)) {
    return { column: Math.sign(visualColumnDelta), row: 0 };
  }

  return { column: 0, row: Math.sign(visualRowDelta) };
}

function createHeroUnit(hero, spawnTile, homeTile) {
  const template = getHeroClassTemplate(hero.classId);

  return {
    ...template,
    id: `hero-${hero.id}`,
    definition: template.body,
    name: hero.name,
    faction: "player",
    role: "Warrior",
    isHero: true,
    heroClass: hero.className,
    heroHobby: hero.hobby,
    heroPortrait: hero.portrait || null,
    heroLevel: 1,
    heroXp: 0,
    heroNextLevelXp: 3,
    heroGold: 0,
    equipment: {},
    backpack: [],
    heroHomeTileId: homeTile.id,
    column: spawnTile.column,
    row: spawnTile.row,
    visualColumn: spawnTile.column,
    visualRow: spawnTile.row,
    movementQueue: [],
    movementSegment: null,
    pendingPathJobId: null,
    order: "patrol",
    orderIcon: null,
    speech: null,
    pauseMs: 450 + Math.random() * 900,
    carryingTreasureId: null,
    carryingHerbId: null,
    carryingResourceNodeId: null,
    carryingResourceType: null,
    carryingResourceAmount: 0,
    escortTargetId: null,
    targetResourceNodeId: null,
    targetMonsterId: null,
    targetUnitId: null,
    attackCooldownMs: 0,
    attackFlashMs: 0,
    staggerMs: 0,
    attackStyle: template.attackStyle || "melee",
    attackRange: template.attackRange || 1,
    baseAttackDamage: template.attackDamage || 1,
    attackDamage: template.attackDamage || 1,
    maxHealth: template.health,
    health: template.health,
    recoverMs: 0,
    hitFlashMs: 0,
    combatText: null,
    home: { column: homeTile.column, row: homeTile.row },
  };
}

function getHeroClassTemplate(classId) {
  const templates = {
    ranger: {
      body: "ranger",
      speed: 1.78,
      patrolRadius: 8,
      health: 4,
      attackDamage: 2,
      attackStyle: "ranged",
      attackRange: 4,
      scale: 1.03,
      art: {
        system: "unitV2",
        key: "ranger",
      },
      colors: {
        primary: "#396f50",
        secondary: "#cfe889",
        accent: "#fff0a6",
        shadow: "#1d392c",
      },
    },
    guardian: {
      body: "duneVanguard",
      speed: 1.48,
      patrolRadius: 6,
      health: 6,
      attackDamage: 2,
      scale: 1.08,
      art: {
        system: "unitV2",
        key: "duneVanguard",
      },
      colors: {
        primary: "#496477",
        secondary: "#dbe4d7",
        accent: "#8fe8ef",
        shadow: "#243442",
      },
    },
    angler: {
      body: "duneSettler",
      speed: 1.52,
      patrolRadius: 7,
      health: 4,
      attackDamage: 1,
      colors: {
        primary: "#2b746f",
        secondary: "#8fe8ef",
        accent: "#fff0a6",
        shadow: "#173e42",
      },
    },
    herbalist: {
      body: "duneSettler",
      speed: 1.58,
      patrolRadius: 7,
      health: 4,
      attackDamage: 1,
      colors: {
        primary: "#6c8646",
        secondary: "#cce68a",
        accent: "#fff4a3",
        shadow: "#33452b",
      },
    },
    barbarian: {
      body: "barbarian",
      speed: 1.32,
      patrolRadius: 6,
      health: 7,
      attackDamage: 3,
      scale: 1.02,
      art: {
        system: "unitV2",
        key: "barbarian",
      },
      colors: {
        primary: "#6f4a32",
        secondary: "#c28b62",
        accent: "#d8d0c0",
        shadow: "#2d2118",
      },
    },
    priest: {
      body: "lightPriest",
      speed: 1.42,
      patrolRadius: 7,
      health: 4,
      attackDamage: 2,
      attackStyle: "ranged",
      attackRange: 4,
      scale: 0.98,
      art: {
        system: "unitV2",
        key: "lightPriest",
      },
      colors: {
        primary: "#f1ead8",
        secondary: "#d8a94c",
        accent: "#fff7bd",
        shadow: "#5a4a38",
      },
    },
  };

  return templates[classId] || templates.ranger;
}

function getHeroHobbyIcon(hobby) {
  if (hobby === "fishing") {
    return "fish";
  }

  if (hobby === "foraging") {
    return "berries";
  }

  if (hobby === "hunting") {
    return "alert";
  }

  return "eye";
}

function getHeroHobbyTravelSpeech(hobby) {
  if (hobby === "fishing") {
    return "To the water.";
  }

  if (hobby === "hunting") {
    return "Tracks nearby.";
  }

  if (hobby === "foraging") {
    return "Foraging.";
  }

  return "Wandering.";
}

function getHeroHobbyWorkSpeech(hobby) {
  if (hobby === "fishing") {
    return "Casting line...";
  }

  if (hobby === "hunting") {
    return "On the hunt...";
  }

  if (hobby === "foraging") {
    return "Gathering wilds...";
  }

  return "Keeping watch...";
}

function getHeroHobbyWorkMs(hobby) {
  if (hobby === "fishing") {
    return 5000 + Math.random() * 7000;
  }

  if (hobby === "hunting") {
    return 4200 + Math.random() * 4200;
  }

  return 3800 + Math.random() * 4200;
}

function getRandomPatrolWaitMs(unit) {
  const min = unit.faction === "player" ? PLAYER_PATROL_WAIT_MIN_MS : MONSTER_PATROL_WAIT_MIN_MS;
  const max = unit.faction === "player" ? PLAYER_PATROL_WAIT_MAX_MS : MONSTER_PATROL_WAIT_MAX_MS;

  return min + Math.random() * (max - min);
}

function hasCarriedLoad(unit) {
  return Boolean(
    unit.carryingTreasureId ||
      unit.carryingHerbId ||
      unit.carryingResourceNodeId ||
      unit.carryingMeatCorpseId ||
      unit.carryingReviveCorpseId,
  );
}

function tileDistance(a, b) {
  return Math.abs(a.column - b.column) + Math.abs(a.row - b.row);
}

function findNearestUnit(origin, units) {
  let nearest = null;
  let nearestDistance = Infinity;

  for (const unit of units) {
    const distance = tileDistance(origin, unit);

    if (distance < nearestDistance) {
      nearest = unit;
      nearestDistance = distance;
    }
  }

  return nearest;
}

function buildAirPath(start, destination) {
  const path = [{ column: start.column, row: start.row }];
  let column = start.column;
  let row = start.row;

  while (column !== destination.column || row !== destination.row) {
    if (column < destination.column) {
      column += 1;
    } else if (column > destination.column) {
      column -= 1;
    }

    if (row < destination.row) {
      row += 1;
    } else if (row > destination.row) {
      row -= 1;
    }

    path.push({ column, row });
  }

  return path;
}

function easeInOut(value) {
  return value < 0.5 ? 2 * value * value : 1 - Math.pow(-2 * value + 2, 2) / 2;
}

function getVisualMovementProgress(unit, progress) {
  if (usesContinuousSpriteMovement(unit)) {
    return progress;
  }

  return easeInOut(progress);
}

function getMovementDurationMultiplier(unit) {
  const body = unit.body || unit.definition;

  if (body === "duneVanguard") {
    return SPRITE_WARRIOR_MOVE_MULTIPLIER;
  }

  if (body === "duneSettler") {
    return SPRITE_SETTLER_MOVE_MULTIPLIER;
  }

  return 1;
}

function getUnitStepDistanceMultiplier(unit, destination) {
  return getStepDistanceMultiplier(destination.column - unit.column, destination.row - unit.row);
}

function getUnitV2AnimationMs(unit, action, fallback) {
  const animation = UNIT_V2_ART[unit.art?.key]?.animations?.[action];

  return animation?.frames?.length && animation.frameMs ? animation.frames.length * animation.frameMs : fallback;
}

function usesContinuousSpriteMovement(unit) {
  const body = unit.body || unit.definition;

  return body === "duneVanguard" || body === "duneSettler" || unit.art?.system === "unitV2";
}

function getMovementFacingX(segment) {
  const isoX = segment.to.column - segment.from.column - (segment.to.row - segment.from.row);

  if (isoX === 0) {
    return 1;
  }

  return isoX < 0 ? -1 : 1;
}

function lerp(a, b, amount) {
  return a + (b - a) * amount;
}
