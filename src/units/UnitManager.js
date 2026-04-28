import { findNearestPassableTile, findPath, getRandomPassableTileNear, toKey } from "./pathfinding.js";
import { getTileMovementCost } from "../world/tileTypes.js";

const BASE_STEP_MS = 520;
const REVEAL_RADIUS = 4;
const CAMP_REVEAL_RADIUS = 6;

export class UnitManager {
  constructor({ world, units, campTile, fogOfWar, treasureManager, onGoldDelivered }) {
    this.world = world;
    this.units = units;
    this.campTile = campTile;
    this.fogOfWar = fogOfWar;
    this.treasureManager = treasureManager;
    this.onGoldDelivered = onGoldDelivered;
    this.activeMarkers = [];
    this.nextMarkerId = 1;

    for (const unit of this.units) {
      unit.home = { column: campTile.column, row: campTile.row };
    }
  }

  update(delta) {
    for (const unit of this.units) {
      tickSpeech(unit, delta);
      this.updateMovement(unit, delta);
    }

    for (const unit of this.units) {
      if (unit.movementSegment || unit.movementQueue.length > 0) {
        continue;
      }

      this.updateBehavior(unit, delta);
    }
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

  getAvailablePlayerUnits(targetTile) {
    return this.units
      .filter((unit) => unit.faction === "player" && unit.order === "patrol")
      .sort((a, b) => tileDistance(a, targetTile) - tileDistance(b, targetTile));
  }

  assignUnitPath(unit, destination, { order, orderIcon, markerId = null, stage = null }) {
    const path = findPath({
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
    if (unit.order === "explore") {
      this.updateExplore(unit);
      return;
    }

    if (unit.order === "haul") {
      this.updateHaul(unit);
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
      getRandomPassableTileNear(this.world, unit, unit.patrolRadius, this.getBlockedKeys(unit.id)) ||
      getRandomPassableTileNear(this.world, { column: 15, row: 15 }, 14, this.getBlockedKeys(unit.id));

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
    unit.order = unit.faction === "player" ? "patrol" : "monsterPatrol";
    unit.orderIcon = null;
    unit.markerId = null;
    unit.stage = null;
    unit.escortTargetId = null;
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
    const carryMultiplier = unit.carryingTreasureId ? 2 : 1;
    const terrainCost = getTileMovementCost(destinationTile);
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

function easeInOut(value) {
  return value < 0.5 ? 2 * value * value : 1 - Math.pow(-2 * value + 2, 2) / 2;
}

function lerp(a, b, amount) {
  return a + (b - a) * amount;
}
