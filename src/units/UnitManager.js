import { findNearestPassableTile, findPath, getRandomPassableTileNear, toKey } from "./pathfinding.js";
import { getTileMovementCost, isTilePassable } from "../world/tileTypes.js";

const BASE_STEP_MS = 520;
const REVEAL_RADIUS = 4;
const CAMP_REVEAL_RADIUS = 6;
const THREAT_RADIUS = 5;
const RESPONSE_RADIUS = 6;
const ATTACK_INTERVAL_MS = 650;

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

    for (const unit of this.units) {
      unit.home = { column: campTile.column, row: campTile.row };
    }
  }

  update(delta) {
    for (const unit of this.units) {
      tickSpeech(unit, delta);
      unit.attackCooldownMs = Math.max(0, unit.attackCooldownMs - delta);
      this.updateMovement(unit, delta);
    }

    this.updateThreats();

    for (const unit of this.units) {
      if (unit.movementSegment || unit.movementQueue.length > 0) {
        continue;
      }

      this.updateBehavior(unit, delta);
    }

    this.units = this.units.filter((unit) => !unit.defeated);
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

    say(gatherer, resourceNode.type === "fish" ? "Fishing!" : "Picking!", resourceNode.type, 1050);
    return true;
  }

  getAvailablePlayerUnits(targetTile) {
    return this.units
      .filter((unit) => unit.faction === "player" && unit.order === "patrol")
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

      say(unit, load.type === "fish" ? "Fresh catch!" : "Basket full!", load.type, 950);
      return;
    }

    if (unit.carryingResourceNodeId && unit.carryingResourceType) {
      this.onResourceDelivered(unit.carryingResourceType, unit.carryingResourceAmount || 1);
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
    const playerUnits = this.units.filter((unit) => unit.faction === "player" && !unit.defeated);
    const scaryMonsters = this.units.filter(
      (unit) => unit.faction === "monster" && unit.temperament === "scary" && !unit.defeated,
    );

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
      target.health -= 1;
      say(unit, "Strike!", "alert", 650);

      if (target.health <= 0) {
        target.defeated = true;
        say(unit, "Safe!", "smile", 900);
        this.setPatrol(unit);
      }
      return;
    }

    say(unit, "!", "alert", 650);
  }

  getAdjacentAttackTile(unit, target) {
    const candidates = [
      { column: target.column + 1, row: target.row },
      { column: target.column - 1, row: target.row },
      { column: target.column, row: target.row + 1 },
      { column: target.column, row: target.row - 1 },
    ]
      .map((tile) => this.world.getTile(tile.column, tile.row))
      .filter((tile) => tile && isTilePassable(tile) && !this.getUnitTileKeys().has(tile.id));

    candidates.sort((a, b) => tileDistance(unit, a) - tileDistance(unit, b));

    return candidates[0] || null;
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
    unit.movementQueue = [];
    unit.movementSegment = null;
    unit.pauseMs = 250 + Math.random() * 600;
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
    const carryMultiplier = unit.carryingTreasureId ? 2 : unit.carryingResourceNodeId ? 1.25 : 1;
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

function tickSpeech(unit, delta) {
  if (!unit.speech) {
    return;
  }

  unit.speech.remainingMs -= delta;

  if (unit.speech.remainingMs <= 0) {
    unit.speech = null;
  }
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
