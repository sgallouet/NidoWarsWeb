import { findNearestPassableTile, findPath, getRandomPassableTileNear, toKey } from "./pathfinding.js";
import { getTileMovementCost, isTilePassable } from "../world/tileTypes.js";

const BASE_STEP_MS = 520;
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
    this.activeMarkers = [];
    this.nextMarkerId = 1;
    this.corpses = [];
    this.threatPlayerUnits = [];
    this.threatScaryMonsters = [];

    for (const unit of this.units) {
      unit.home = { column: campTile.column, row: campTile.row };
    }
  }

  update(delta) {
    for (const unit of this.units) {
      tickUnitEffects(unit, delta);
      this.updateMovement(unit, delta);
    }

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

    const explorers = this.getAvailablePlayerUnits(targetTile).slice(0, 2);

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
    const availableUnits = this.getAvailablePlayerUnits(treasureTile);
    const carrier = availableUnits[0];
    const escort = availableUnits[1];

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

    if (escort) {
      this.assignEscort(escort, carrier, marker.id);
      say(escort, "On guard!", "smile");
    }

    return true;
  }

  commandGatherHerb(herb) {
    const herbTile = this.world.getTile(herb.column, herb.row);
    const gatherer = this.getAvailablePlayerUnits(herbTile)[0];

    if (!gatherer) {
      return false;
    }

    if (!this.herbManager.reserve(herb.id, gatherer.id)) {
      return false;
    }

    const marker = this.addMarker("herb", herbTile);
    gatherer.targetHerbId = herb.id;

    const assigned = this.assignUnitPath(gatherer, herbTile, {
      order: "herb",
      orderIcon: "herb",
      markerId: marker.id,
      stage: "toHerb",
    });

    if (!assigned) {
      this.removeMarker(marker.id);
      this.herbManager.release(herb.id, gatherer.id);
      this.setPatrol(gatherer);
      return false;
    }

    say(gatherer, "On it!", "herb");
    return true;
  }

  commandGatherResource(resourceNode) {
    const gatherTile = this.getResourceGatherTile(resourceNode);

    if (!gatherTile) {
      return false;
    }

    const gatherer = this.getAvailablePlayerUnits(gatherTile)[0];

    if (!gatherer) {
      return false;
    }

    if (!this.resourceNodeManager.reserve(resourceNode.id, gatherer.id)) {
      return false;
    }

    const marker = this.addMarker(resourceNode.type, this.world.getTile(resourceNode.column, resourceNode.row));
    gatherer.targetResourceNodeId = resourceNode.id;

    const assigned = this.assignUnitPath(gatherer, gatherTile, {
      order: "resource",
      orderIcon: resourceNode.type,
      markerId: marker.id,
      stage: "toResource",
    });

    if (!assigned) {
      this.removeMarker(marker.id);
      this.resourceNodeManager.release(resourceNode.id, gatherer.id);
      this.setPatrol(gatherer);
      return false;
    }

    say(gatherer, getGatherSpeech(resourceNode.type), resourceNode.type, 1050);
    return true;
  }

  getAvailablePlayerUnits(targetTile) {
    return this.units
      .filter((unit) => unit.faction === "player" && unit.order === "patrol" && unit.health >= unit.maxHealth)
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
      this.updateHerb(unit);
      return;
    }

    if (unit.order === "resource") {
      this.updateResource(unit);
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

  updateHerb(unit) {
    if (unit.stage === "toHerb") {
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
      const assignedNextTrip = this.assignUnitPath(unit, herbTile, {
        order: "herb",
        orderIcon: "herb",
        markerId: unit.markerId,
        stage: "toHerb",
      });

      if (assignedNextTrip) {
        return;
      }
    }

    this.removeMarker(unit.markerId);
    this.herbManager.release(unit.targetHerbId, unit.id);
    unit.targetHerbId = null;
    this.setPatrol(unit);
  }

  updateResource(unit) {
    if (unit.stage === "toResource") {
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
      const assignedNextTrip =
        gatherTile &&
        this.assignUnitPath(unit, gatherTile, {
          order: "resource",
          orderIcon: node.type,
          markerId: unit.markerId,
          stage: "toResource",
        });

      if (assignedNextTrip) {
        return;
      }
    }

    this.removeMarker(unit.markerId);
    this.resourceNodeManager.release(unit.targetResourceNodeId, unit.id);
    unit.targetResourceNodeId = null;
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
    });
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

    unit.carryingTreasureId = null;
    unit.targetTreasureId = null;
    unit.carryingHerbId = null;
    unit.targetHerbId = null;
    unit.carryingResourceNodeId = null;
    unit.targetResourceNodeId = null;
    unit.carryingResourceType = null;
    unit.carryingResourceAmount = 0;
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
    const terrainCost = unit.canFly ? 1 : getTileMovementCost(destinationTile);
    const duration = (BASE_STEP_MS * terrainCost * carryMultiplier) / unit.speed;

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
  return Boolean(unit.carryingTreasureId || unit.carryingHerbId || unit.carryingResourceNodeId);
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
