import { findNearestPassableTile, findPath, getRandomPassableTileNear, toKey } from "./pathfinding.js";
import { getTileMovementCost, isTilePassable } from "../world/tileTypes.js";
import { HERB_WORK_MS } from "../world/HerbManager.js";
import { getResourceDefinition } from "../world/ResourceNodeManager.js";

const BASE_STEP_MS = 520;
const CLEAN_WORK_MS = 3600;
const MEAT_WORK_MS = 5000;
const BUILD_WORK_MS = 2600;
const REVEAL_RADIUS = 4;
const CAMP_REVEAL_RADIUS = 6;
const THREAT_RADIUS = 5;
const RESPONSE_RADIUS = 6;
const ATTACK_INTERVAL_MS = 650;
const HIT_FLASH_MS = 180;
const COMBAT_TEXT_MS = 720;
const RECOVERY_RADIUS = 2;
const RECOVERY_TICK_MS = 1800;
const RECOVERY_PAUSE_MS = 260;
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
    this.corpses = [];
    this.threatPlayerUnits = [];
    this.threatScaryMonsters = [];
    this.nightAmount = 0;

    for (const unit of this.units) {
      unit.home = { column: campTile.column, row: campTile.row };
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

    for (const unit of this.units) {
      if (unit.movementSegment || unit.movementQueue.length > 0) {
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

  commandExplore(tile) {
    const targetTile = findNearestPassableTile(this.world, tile, this.getUnitTileKeys());

    if (!targetTile) {
      return false;
    }

    const explorers = this.getAvailableSettlers(targetTile).slice(0, 2);

    if (explorers.length === 0) {
      return false;
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
      return false;
    }

    return true;
  }

  commandGatherTreasure(treasure) {
    if (!this.treasureManager.reserve(treasure.id)) {
      return false;
    }

    const treasureTile = this.world.getTile(treasure.column, treasure.row);
    const availableUnits = this.getAvailableSettlers(treasureTile);
    const carrier = availableUnits[0];

    if (!carrier) {
      this.treasureManager.release(treasure.id);
      return false;
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
      return false;
    }

    say(carrier, "Sire! yes sir!", "muscle");
    this.assignGuardToWorker(carrier);

    return true;
  }

  commandGatherHerb(herb) {
    const herbTile = this.world.getTile(herb.column, herb.row);
    const gatherers = this.getAvailableSettlers(herbTile).slice(0, Math.min(4, herb.loadsRemaining));
    let assignedCount = 0;

    if (gatherers.length === 0) {
      return false;
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

    return assignedCount > 0;
  }

  commandGatherResource(resourceNode) {
    const gatherTile = this.getResourceGatherTile(resourceNode);

    if (!gatherTile) {
      return false;
    }

    const definition = getResourceDefinition(resourceNode.type);
    const maxWorkers = Math.min(definition?.maxWorkers || 1, resourceNode.loadsRemaining);
    const gatherers = this.getAvailableSettlers(gatherTile).slice(0, maxWorkers);
    let assignedCount = 0;

    if (gatherers.length === 0) {
      return false;
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

    return assignedCount > 0;
  }

  commandCleanTile(tile) {
    if (tile.cleanReservedBy) {
      return false;
    }

    const cleanTile = findNearestPassableTile(this.world, tile, this.getUnitTileKeys());

    if (!cleanTile) {
      return false;
    }

    const worker = this.getAvailableSettlers(cleanTile)[0];

    if (!worker) {
      return false;
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
      return false;
    }

    say(worker, "Clearing!", "clean", 1000);
    this.assignGuardToWorker(worker);
    return true;
  }

  commandHarvestCorpse(corpse) {
    if (!corpse || corpse.harvested || corpse.reservedBy) {
      return false;
    }

    const corpseTile = this.world.getTile(corpse.column, corpse.row);
    const worker = this.getAvailableSettlers(corpseTile)[0];

    if (!worker) {
      return false;
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
      return false;
    }

    this.assignGuardToWorker(worker);
    say(worker, "Harvesting!", "meat", 1000);
    return true;
  }

  commandBuildTile(tile, buildingId) {
    if (tile.buildReservedBy || tile.construction || tile.building) {
      return false;
    }

    const builder = this.getAvailableSettlers(tile)[0];

    if (!builder) {
      return false;
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
      return false;
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

  assignUnitPath(unit, destination, { order, orderIcon, markerId = null, stage = null }) {
    const path = unit.canFly
      ? buildAirPath(unit, destination)
      : findPath({
          world: this.world,
          start: unit,
          destination,
          blockedKeys: this.getBlockedKeys(unit.id),
        });

    if (path.length < 2 && (unit.column !== destination.column || unit.row !== destination.row)) {
      return false;
    }

    unit.movementQueue = path.length > 1 ? path.slice(1) : [];
    unit.movementSegment = null;
    unit.order = order;
    unit.orderIcon = orderIcon;
    unit.markerId = markerId;
    unit.stage = stage;
    unit.pauseMs = 0;
    this.startNextSegment(unit);
    return true;
  }

  assignEscort(unit, carrier, markerId) {
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
      this.assignUnitPath(unit, this.campTile, {
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
        const assignedReturn = this.assignUnitPath(unit, this.campTile, {
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

    const gold = this.treasureManager.deposit(unit.carryingTreasureId);

    if (gold > 0) {
      this.onGoldDelivered(gold);
      showResourceText(unit, gold, "gold");
      say(unit, "Gold secured!", "smile", 1200);
    }

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
      const assignedReturn = this.assignUnitPath(unit, this.campTile, {
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
      const assignedReturn = this.assignUnitPath(unit, this.campTile, {
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

      const assignedReturn = this.assignUnitPath(unit, this.campTile, {
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

    this.assignUnitPath(unit, escortTile, {
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

    this.assignUnitPath(unit, guardTile, {
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
      if (unit.defeated) {
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
      monster.movementQueue = [];
      monster.movementSegment = null;
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
    unit.movementQueue = [];
    unit.movementSegment = null;
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

    if (tileDistance(unit, target) > 1) {
      const attackTile = this.getAdjacentAttackTile(unit, target);

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

    if (unit.faction === "player") {
      this.applyDamage(target, unit.attackDamage || 1);

      if (target.health <= 0) {
        target.defeated = true;
        say(unit, "Safe!", "smile", 900);
        this.setPatrol(unit);
      }
      return;
    }

    this.applyDamage(target, unit.attackDamage || 1, { keepPlayerAlive: true });

    if (!target.defeated) {
      this.sendToRecovery(target);
      this.setPatrol(unit);
    }
  }

  applyDamage(target, amount, options = {}) {
    target.health = Math.max(0, target.health - amount);
    target.hitFlashMs = HIT_FLASH_MS;
    showCombatText(target, `-${amount}`, "damage");

    if (target.health > 0) {
      return;
    }

    if (target.faction === "player" && options.keepPlayerAlive) {
      target.health = 1;
      target.recoverMs = Math.min(target.recoverMs || 0, -RECOVERY_TICK_MS);
      showCombatText(target, `-${amount}`, "heavyDamage");
      return;
    }

    this.recordCorpse(target);
    target.defeated = true;
  }

  recordCorpse(unit) {
    if (unit.faction !== "monster" || this.corpses.some((corpse) => corpse.id === `corpse-${unit.id}`)) {
      return;
    }

    this.corpses.push({
      id: `corpse-${unit.id}`,
      definition: unit.definition,
      body: unit.body,
      colors: unit.colors,
      faction: unit.faction,
      scale: unit.scale || 1,
      column: unit.column,
      row: unit.row,
      visualColumn: unit.visualColumn,
      visualRow: unit.visualRow,
      ageMs: 0,
      meatValue: unit.decorative ? 1 : 2,
      harvested: false,
      reservedBy: null,
    });
  }

  updateCorpses(delta) {
    if (!this.corpseTtlMs) {
      return;
    }

    let writeIndex = 0;

    for (let readIndex = 0; readIndex < this.corpses.length; readIndex += 1) {
      const corpse = this.corpses[readIndex];

      corpse.ageMs += delta;

      if (corpse.ageMs >= this.corpseTtlMs || corpse.harvested) {
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
        (corpse) => corpse.column === column && corpse.row === row && !corpse.harvested && !corpse.reservedBy,
      ) || null
    );
  }

  getCorpseById(corpseId) {
    return this.corpses.find((corpse) => corpse.id === corpseId) || null;
  }

  removeCorpse(corpseId) {
    this.corpses = this.corpses.filter((corpse) => corpse.id !== corpseId);
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

    this.assignUnitPath(unit, destination, {
      order: "patrol",
      orderIcon: null,
    });
    unit.pauseMs = 500 + Math.random() * 900;
  }

  patrolMonster(unit) {
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

    this.assignUnitPath(unit, destination, {
      order: "monsterPatrol",
      orderIcon: null,
    });
    unit.pauseMs = 700 + Math.random() * 1200;
  }

  setPatrol(unit) {
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
    unit.guardTargetId = null;
    unit.workMs = 0;
    unit.targetMonsterId = null;
    unit.targetUnitId = null;
    unit.recoverMs = 0;
    unit.movementQueue = [];
    unit.movementSegment = null;
    unit.pauseMs = 250 + Math.random() * 600;
  }

  removeDefeatedUnits() {
    let writeIndex = 0;

    for (let readIndex = 0; readIndex < this.units.length; readIndex += 1) {
      const unit = this.units[readIndex];

      if (unit.defeated) {
        continue;
      }

      this.units[writeIndex] = unit;
      writeIndex += 1;
    }

    this.units.length = writeIndex;
  }

  abandonAssignments(unit) {
    this.removeMarker(unit.markerId);

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
    unit.guardTargetId = null;
    unit.workMs = 0;
  }

  updateMovement(unit, delta) {
    if (!unit.movementSegment) {
      return;
    }

    unit.movementSegment.elapsed += delta;

    const progress = Math.min(1, unit.movementSegment.elapsed / unit.movementSegment.duration);
    const eased = easeInOut(progress);

    unit.visualColumn = lerp(unit.movementSegment.from.column, unit.movementSegment.to.column, eased);
    unit.visualRow = lerp(unit.movementSegment.from.row, unit.movementSegment.to.row, eased);

    if (progress < 1) {
      return;
    }

    unit.column = unit.movementSegment.to.column;
    unit.row = unit.movementSegment.to.row;
    unit.visualColumn = unit.column;
    unit.visualRow = unit.row;
    unit.movementSegment = null;

    if (unit.faction === "player") {
      this.fogOfWar.revealAround(unit, REVEAL_RADIUS);
    }

    this.startNextSegment(unit);
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
    const duration = (BASE_STEP_MS * terrainCost * carryMultiplier * nightMultiplier) / unit.speed;

    unit.movementSegment = {
      from: {
        column: unit.column,
        row: unit.row,
      },
      to: nextTile,
      elapsed: 0,
      duration,
    };
  }

  getNearbyPassableTile(origin, radius) {
    return getRandomPassableTileNear(this.world, origin, radius, this.getUnitTileKeys());
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
        .filter((unit) => unit.id !== exceptUnitId)
        .map((unit) => toKey(unit.column, unit.row)),
    );
  }

  getUnitTileKeys() {
    return new Set(this.units.map((unit) => toKey(unit.column, unit.row)));
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
  unit.attackCooldownMs = Math.max(0, unit.attackCooldownMs - delta);
  unit.hitFlashMs = Math.max(0, (unit.hitFlashMs || 0) - delta);

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

function hasCarriedLoad(unit) {
  return Boolean(
    unit.carryingTreasureId || unit.carryingHerbId || unit.carryingResourceNodeId || unit.carryingMeatCorpseId,
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

function lerp(a, b, amount) {
  return a + (b - a) * amount;
}
