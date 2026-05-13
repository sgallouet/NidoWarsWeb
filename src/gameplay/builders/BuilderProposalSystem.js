const AUTO_HOUSE_SCAN_MS = 2200;
const AUTO_HOUSE_DECLINE_COOLDOWN_MS = 18000;
const REJECTED_HOUSE_AREA_RADIUS = 5;
const HOUSE_BUILDING_ID = "settler-hut";

export class BuilderProposalSystem {
  constructor({
    world,
    units,
    campTile,
    getBuilding,
    getHabitantStatus,
    canAfford,
    spendResources,
    getRoadConnector,
    isBuildSite,
    refreshBuildSitesAndRoads,
    touchStructure,
    syncHudResources,
    getTileById,
    onChanged = () => {},
  }) {
    this.world = world;
    this.units = units;
    this.campTile = campTile;
    this.getBuilding = getBuilding;
    this.getHabitantStatus = getHabitantStatus;
    this.canAfford = canAfford;
    this.spendResources = spendResources;
    this.getRoadConnector = getRoadConnector;
    this.isBuildSite = isBuildSite;
    this.refreshBuildSitesAndRoads = refreshBuildSitesAndRoads;
    this.touchStructure = touchStructure;
    this.syncHudResources = syncHudResources;
    this.getTileById = getTileById;
    this.onChanged = onChanged;
    this.active = null;
    this.rejectedTileIds = new Set();
    this.scanMs = AUTO_HOUSE_SCAN_MS;
    this.cooldownMs = AUTO_HOUSE_SCAN_MS;
  }

  update(delta, { isDialogOpen = false } = {}) {
    if (this.active && !this.getActiveDetails()) {
      this.clearActive();
      this.refreshBuildSitesAndRoads();
    }

    if (isDialogOpen || this.active) {
      return;
    }

    const house = this.getBuilding(HOUSE_BUILDING_ID);
    const habitantStatus = this.getHabitantStatus();

    if (!house || habitantStatus.used < habitantStatus.capacity || !this.canAfford(house.cost)) {
      return;
    }

    this.cooldownMs = Math.max(0, this.cooldownMs - delta);
    this.scanMs = Math.max(0, this.scanMs - delta);

    if (this.cooldownMs > 0 || this.scanMs > 0) {
      return;
    }

    this.scanMs = AUTO_HOUSE_SCAN_MS;
    this.tryStartHouseProposal();
  }

  tryStartHouseProposal() {
    const house = this.getBuilding(HOUSE_BUILDING_ID);
    const tile = house ? this.findAutomaticHouseTile() : null;

    if (!house || !tile) {
      this.cooldownMs = AUTO_HOUSE_SCAN_MS;
      return false;
    }

    const unit = this.units.commandProposeBuildTile(tile, house.id);

    if (!unit) {
      this.cooldownMs = AUTO_HOUSE_SCAN_MS;
      return false;
    }

    const roadConnector = this.getRoadConnector(tile);

    tile.roadConnector = roadConnector ? { column: roadConnector.column, row: roadConnector.row } : null;
    this.active = {
      id: `proposal-${unit.id}-${tile.id}-${house.id}`,
      unitId: unit.id,
      tileId: tile.id,
      buildingId: house.id,
      state: "traveling",
    };
    this.refreshBuildSitesAndRoads();
    this.onChanged();
    return true;
  }

  markReady(unit, tile, buildingId) {
    if (!this.active || this.active.unitId !== unit.id || this.active.tileId !== tile.id) {
      return false;
    }

    this.active.state = "ready";
    this.active.buildingId = buildingId;
    this.onChanged();
    return true;
  }

  getVisibleProposals() {
    const details = this.getActiveDetails();

    return details ? [{ ...details, id: this.active.id, state: this.active.state }] : [];
  }

  getActiveDetails() {
    if (!this.active) {
      return null;
    }

    const unit = this.units.units.find((candidate) => candidate.id === this.active.unitId);
    const tile = this.getTileById(this.active.tileId);
    const building = this.getBuilding(this.active.buildingId);

    if (!unit || !tile || !building || unit.targetBuildTileId !== tile.id || unit.targetBuildingId !== building.id) {
      return null;
    }

    return { unit, tile, building };
  }

  confirm() {
    const proposal = this.getActiveDetails();

    if (!proposal || !this.canAfford(proposal.building.cost)) {
      return false;
    }

    const roadConnector = this.getRoadConnector(proposal.tile) || proposal.tile.roadConnector;

    if (!roadConnector || !this.units.confirmBuildProposal(proposal.unit.id, proposal.tile, proposal.building.id)) {
      return false;
    }

    proposal.tile.roadConnector = { column: roadConnector.column, row: roadConnector.row };
    this.spendResources(proposal.building.cost);
    this.clearActive();
    this.cooldownMs = AUTO_HOUSE_SCAN_MS;
    this.refreshBuildSitesAndRoads();
    this.touchStructure(proposal.tile);
    this.syncHudResources();
    return true;
  }

  reroute() {
    const proposal = this.getActiveDetails();

    if (proposal) {
      this.rejectHouseArea(proposal.tile);
      this.units.cancelBuildProposal(proposal.unit.id, "Elsewhere.");
    }

    this.clearActive();
    this.cooldownMs = 0;
    this.scanMs = 0;
    this.refreshBuildSitesAndRoads();
    this.tryStartHouseProposal();
  }

  reject() {
    const proposal = this.getActiveDetails();

    if (proposal) {
      this.units.cancelBuildProposal(proposal.unit.id, "Not now.");
    }

    this.clearActive();
    this.cooldownMs = AUTO_HOUSE_DECLINE_COOLDOWN_MS;
    this.scanMs = AUTO_HOUSE_SCAN_MS;
    this.refreshBuildSitesAndRoads();
  }

  clearActive() {
    this.active = null;
    this.onChanged();
  }

  findAutomaticHouseTile() {
    const candidates = this.world.tiles.filter(
      (tile) =>
        tile.canBuild &&
        !tile.building &&
        !tile.construction &&
        !tile.buildReservedBy &&
        this.isBuildSite(tile) &&
        !this.rejectedTileIds.has(tile.id),
    );

    candidates.sort((a, b) => tileDistance(a, this.campTile) - tileDistance(b, this.campTile));
    return candidates[0] || null;
  }

  rejectHouseArea(tile) {
    const radiusSquared = REJECTED_HOUSE_AREA_RADIUS * REJECTED_HOUSE_AREA_RADIUS;

    for (let row = tile.row - REJECTED_HOUSE_AREA_RADIUS; row <= tile.row + REJECTED_HOUSE_AREA_RADIUS; row += 1) {
      for (
        let column = tile.column - REJECTED_HOUSE_AREA_RADIUS;
        column <= tile.column + REJECTED_HOUSE_AREA_RADIUS;
        column += 1
      ) {
        const dx = column - tile.column;
        const dy = row - tile.row;

        if (dx * dx + dy * dy > radiusSquared) {
          continue;
        }

        const nearbyTile = this.world.getTile(column, row);

        if (nearbyTile) {
          this.rejectedTileIds.add(nearbyTile.id);
        }
      }
    }
  }
}

function tileDistance(a, b) {
  return Math.hypot(a.column - b.column, a.row - b.row);
}
