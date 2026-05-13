import { GameLoop } from "./GameLoop.js";
import { InputController } from "../engine/InputController.js";
import { loadImageAssets } from "../engine/assets/AssetLoader.js";
import { Camera2D } from "../rendering/Camera2D.js";
import { CanvasRenderer } from "../rendering/CanvasRenderer.js";
import { RUNTIME_IMAGE_ASSETS } from "../content/assets/runtimeImages.js";
import { createHeroRoster, getHeroQuestPower } from "../content/heroes/roster.js";
import { createQuestRoster, getQuestTeamPower, seededQuestRoll } from "../content/quests/roster.js";
import { createDesertMap } from "../world/createDesertMap.js";
import { DayNightCycle } from "../world/DayNightCycle.js";
import { FogOfWar } from "../world/FogOfWar.js";
import { HerbManager } from "../gameplay/resources/HerbManager.js";
import { ResourceNodeManager } from "../gameplay/resources/ResourceNodeManager.js";
import { BuilderProposalSystem } from "../gameplay/builders/BuilderProposalSystem.js";
import { BuilderQuestionDock } from "../ui/BuilderQuestionDock.js";
import { Hud } from "../ui/Hud.js";
import { PerformanceMonitor } from "../ui/PerformanceMonitor.js";
import { TreasureManager } from "../gameplay/resources/TreasureManager.js";
import { UnitManager } from "../gameplay/units/UnitManager.js";
import { createStartingUnits, findCampTile } from "../content/units/definitions.js";
import { BUILDINGS, getBuildingById } from "../content/buildings/definitions.js";
import { getResourceIcon } from "../content/resources/definitions.js";
import { TILE_TYPES, isTilePassable } from "../content/tiles/definitions.js";
import { duneSettlerArt } from "../content/units/dune-settler/art.js";

const CONSTRUCTION_MS = 12 * 1000;
const START_CLEAR_RADIUS = 5;
const BUILD_FOOTPRINT_RADIUS = 1;
const BUILD_CONNECTOR_DISTANCE = BUILD_FOOTPRINT_RADIUS + 1;
const BUILD_ANCHOR_DISTANCE = BUILD_FOOTPRINT_RADIUS + 2;
const BUILD_ANCHOR_CLEARANCE = BUILD_FOOTPRINT_RADIUS + 1;
const INTRO_GROUP_WALK_START_MS = 3350;
const INTRO_GROUP_WALK_MS = 3600;
const INTRO_FIRE_SPOTTED_MS = 6200;
const INTRO_FIRE_MOVE_MS = 7000;
const INTRO_FIRE_START_MS = 15100;
const INTRO_FIRE_DURATION_MS = 4000;
const INTRO_DURATION_MS = 20000;
const INTRO_UI_REVEAL_MS = 19700;
const INTRO_GREETING_MS = 19400;
const INTRO_PORTAL_REVEAL_RADIUS = 7;
const INTRO_UNIT_REVEAL_RADIUS = 4;
const INTRO_UNIT_REVEAL_INTERVAL_MS = 180;
const INTRO_FIRE_REVEAL_RADIUS = 12;
const INTRO_PORTAL_ARRIVAL_RADIUS = 2;
const INTRO_PORTAL_SCATTER_RADIUS = 4;
const INTRO_EXPLORE_RADIUS = 8;
const INTRO_FIRE_REACTION_STEP_MS = 420;
const BASE_HABITANT_CAPACITY = 6;

export class Game {
  constructor({ canvas, root, config }) {
    this.config = config;
    this.resources = { ...config.resources };
    this.root = root;
    this.dayNightCycle = new DayNightCycle(config.timeOfDay);
    this.world = createDesertMap(config.map);
    this.fogOfWar = new FogOfWar(this.world);
    this.campTile = findCampTile(this.world);
    this.campTile.blocksMovement = true;
    this.portalTile = findCampPortalTile(this.world, this.campTile);
    if (this.portalTile) {
      clearPortalLandingArea(this.world, this.portalTile);
      this.portalTile.hasDarkPortal = true;
      this.portalTile.blocksMovement = true;
    }
    const startingUnits = createStartingUnits(this.world, this.campTile, {
      reservedTileIds: this.portalTile ? [this.portalTile.id] : [],
    });
    const startingReservedKeys = this.getStartingReservedKeys(startingUnits);
    const reservedSpawnKeys = new Set([
      ...startingReservedKeys,
      ...this.getPortalReservedKeys(),
    ]);
    this.treasures = new TreasureManager({
      world: this.world,
      count: 36,
      reservedKeys: reservedSpawnKeys,
    });
    this.herbs = new HerbManager({
      world: this.world,
      count: 90,
      reservedKeys: reservedSpawnKeys,
    });
    this.resourceNodes = new ResourceNodeManager({
      world: this.world,
      counts: {
        fish: 54,
        berries: 72,
        wood: 260,
        rock: 60,
      },
      reservedKeys: reservedSpawnKeys,
      startAreaReservedKeys: startingReservedKeys,
    });
    this.units = new UnitManager({
      world: this.world,
      units: startingUnits,
      campTile: this.campTile,
      fogOfWar: this.fogOfWar,
      treasureManager: this.treasures,
      herbManager: this.herbs,
      resourceNodeManager: this.resourceNodes,
      onGoldDelivered: (gold) => this.addGold(gold),
      onHerbsDelivered: (herbs) => this.addHerbs(herbs),
      onResourceDelivered: (type, amount) => this.addResource(type, amount),
      onTileCleaned: (tile) => this.cleanTile(tile),
      onConstructionStarted: (tile, buildingId) => this.startConstruction(tile, buildingId),
      onBuildProposalReady: (unit, tile, buildingId) => this.markBuildProposalReady(unit, tile, buildingId),
      corpseTtlMs: this.dayNightCycle.totalMs,
    });
    this.camera = new Camera2D(config.render);
    this.hud = new Hud(root);
    this.builderQuestionDock = new BuilderQuestionDock(root, {
      onSelect: (proposalId) => this.selectBuildProposal(proposalId),
    });
    this.renderer = new CanvasRenderer({
      canvas,
      camera: this.camera,
      config: config.render,
    });
    this.performanceMonitor = new PerformanceMonitor({
      canvas: root.querySelector('[data-ui="perf-graph"]'),
      valueNode: root.querySelector('[data-ui="frame-ms"]'),
    });
    this.helpButton = root.querySelector('[data-ui="help-toggle"]');
    this.helpPanel = root.querySelector('[data-ui="help-panel"]');
    this.helpCloseButton = root.querySelector('[data-ui="help-close"]');
    this.heroDock = root.querySelector('[data-ui="hero-dock"]');
    this.buildMenu = root.querySelector('[data-ui="build-menu"]');
    this.buildGrid = root.querySelector('[data-ui="build-grid"]');
    this.buildCloseButton = root.querySelector('[data-ui="build-close"]');
    this.buildTitle = root.querySelector('[data-ui="build-title"]');
    this.buildCaption = root.querySelector('[data-ui="build-caption"]');
    this.buildTileLabel = root.querySelector('[data-ui="build-tile"]');
    this.heroProfile = root.querySelector('[data-ui="hero-profile"]');
    this.heroProfileCloseButton = root.querySelector('[data-ui="hero-profile-close"]');
    this.heroProfileImage = root.querySelector('[data-ui="hero-profile-image"]');
    this.heroProfileName = root.querySelector('[data-ui="hero-profile-name"]');
    this.heroProfileClass = root.querySelector('[data-ui="hero-profile-class"]');
    this.heroProfileLevel = root.querySelector('[data-ui="hero-profile-level"]');
    this.heroProfileHealth = root.querySelector('[data-ui="hero-profile-health"]');
    this.heroProfileXp = root.querySelector('[data-ui="hero-profile-xp"]');
    this.heroProfilePower = root.querySelector('[data-ui="hero-profile-power"]');
    this.heroProfileGold = root.querySelector('[data-ui="hero-profile-gold"]');
    this.heroProfileState = root.querySelector('[data-ui="hero-profile-state"]');
    this.heroProfileHobby = root.querySelector('[data-ui="hero-profile-hobby"]');
    this.heroProfileInventory = root.querySelector('[data-ui="hero-profile-inventory"]');
    this.loadingPanel = root.querySelector('[data-ui="loading-panel"]');
    this.loadingFill = root.querySelector('[data-ui="loading-fill"]');
    this.loadingValue = root.querySelector('[data-ui="loading-value"]');
    this.isPaused = false;
    this.isHelpOpen = false;
    this.isBuildMenuOpen = false;
    this.isHeroProfileOpen = false;
    this.isIntroActive = true;
    this.introCinematicSteps = new Set();
    this.didRevealIntroUi = false;
    this.introUnitRevealElapsedMs = INTRO_UNIT_REVEAL_INTERVAL_MS;
    this.campFire = {
      isLit: false,
      revealRadius: INTRO_FIRE_REVEAL_RADIUS,
    };
    this.intro = {
      active: true,
      elapsedMs: 0,
      durationMs: INTRO_DURATION_MS,
      campTile: this.campTile,
      focusTile: this.portalTile || this.campTile,
      portalTile: this.portalTile,
      playerUnitIds: startingUnits.filter((unit) => unit.faction === "player").map((unit) => unit.id),
      arrivals: [],
      walkStartMs: INTRO_GROUP_WALK_START_MS,
      walkDurationMs: INTRO_GROUP_WALK_MS,
      portalRevealRadius: INTRO_PORTAL_REVEAL_RADIUS,
      fireStartMs: INTRO_FIRE_START_MS,
      fireDurationMs: INTRO_FIRE_DURATION_MS,
      fireStarterUnitId: "settler-tor",
      didFireReveal: false,
    };
    this.cardMenuMode = "build";
    this.selectedBuildTile = null;
    this.selectedTavernTile = null;
    this.selectedGuildTile = null;
    this.selectedHeroUnit = null;
    this.dayIndex = 0;
    this.heroRoster = createHeroRoster(this.dayIndex);
    this.questRoster = createQuestRoster(this.dayIndex);
    this.questSelections = new Map();
    this.activeQuests = [];
    this.nextQuestRunId = 1;
    this.pausedElapsed = 0;
    this.hudRefreshMs = 0;
    this.heroDockStateKey = "";
    this.buildProposalSystem = new BuilderProposalSystem({
      world: this.world,
      units: this.units,
      campTile: this.campTile,
      getBuilding: (buildingId) => getBuildingById(buildingId),
      getHabitantStatus: () => this.getHabitantStatus(),
      canAfford: (cost) => this.canAfford(cost),
      spendResources: (cost) => this.spendResources(cost),
      getRoadConnector: (tile) => this.getBuildRoadConnector(tile),
      isBuildSite: (tile) => this.isBuildSiteCenter(tile),
      refreshBuildSitesAndRoads: () => this.refreshBuildSitesAndRoads(),
      touchStructure: (tile) => this.world.touchStructure(tile),
      syncHudResources: () => this.syncHudResources(),
      getTileById: (tileId) => this.getTileById(tileId),
      onChanged: () => this.renderBuilderQuestionDock(),
    });
    this.lastHudTileId = null;
    this.input = new InputController({
      canvas,
      camera: this.camera,
      renderer: this.renderer,
      world: this.world,
      units: this.units,
      onTileClick: (tile) => this.handleTileClick(tile),
    });
    this.loop = new GameLoop((frame) => this.update(frame));
    this.root.classList.add("is-intro-active");
  }

  async start() {
    const assetWeight = 0.22;

    this.renderer.resize();
    this.performanceMonitor.resize();
    this.camera.frameTile(this.portalTile || this.campTile, this.renderer.viewport);
    this.syncHudResources();
    this.hud.setCycle(this.dayNightCycle.getState());
    this.hud.setTile(this.campTile);
    this.setupIntroCinematic();
    this.revealIntroPortalArea();
    this.hud.setUnitSummary(this.units.units);
    this.setupHelpOverlay();
    this.setupHeroDock();
    this.setupBuildMenu();
    this.setupHeroProfile();
    this.renderHeroDock();
    this.setLoadingProgress(0);
    this.setLoadingVisible(true);

    const imageCache = await loadImageAssets(RUNTIME_IMAGE_ASSETS, (progress) => {
      this.setLoadingProgress(progress * assetWeight);
    });
    this.renderer.setImageCache(imageCache);

    await this.renderer.prepareWorld(this.world, this.fogOfWar, (progress) => {
      this.setLoadingProgress(assetWeight + progress * (1 - assetWeight));
    });

    this.setLoadingVisible(false);

    window.addEventListener("resize", () => {
      this.renderer.resize();
      this.performanceMonitor.resize();
      if (this.isIntroActive) {
        this.camera.frameTile(this.portalTile || this.campTile, this.renderer.viewport);
      }
    });

    this.loop.start();
  }

  setLoadingVisible(isVisible) {
    if (!this.loadingPanel) {
      return;
    }

    this.loadingPanel.hidden = !isVisible;
  }

  setLoadingProgress(progress) {
    const clamped = Math.max(0, Math.min(1, progress || 0));
    const percent = Math.round(clamped * 100);

    if (this.loadingFill) {
      this.loadingFill.style.transform = `scaleX(${clamped})`;
    }

    if (this.loadingValue) {
      this.loadingValue.textContent = `${percent}%`;
    }
  }

  update(frame) {
    const frameStart = performance.now();

    const delta = this.isPaused ? 0 : frame.delta;
    const elapsed = this.isPaused ? this.pausedElapsed : frame.elapsed;

    if (this.isIntroActive) {
      this.updateIntro(delta);
      this.units.updateIntro(delta);
    }

    if (!this.isPaused) {
      const previousCycleElapsed = this.dayNightCycle.elapsedMs;

      this.dayNightCycle.update(delta);

      if (this.dayNightCycle.elapsedMs < previousCycleElapsed) {
        this.advanceDay();
      }
    }

    const dayNight = this.dayNightCycle.getState();

    if (!this.isPaused) {
      if (!this.isIntroActive) {
        this.units.update(delta, dayNight);
        this.buildProposalSystem.update(delta, { isDialogOpen: this.isBuildMenuOpen });
      }
      this.treasures.update(delta);
      this.updateConstructions(delta);
      this.updateQuests(delta);
    }

    const hoveredTile = this.input.getHoveredTile();

    if (hoveredTile && hoveredTile.id !== this.lastHudTileId) {
      this.hud.setTile(hoveredTile);
      this.lastHudTileId = hoveredTile.id;
    }

    this.hudRefreshMs += delta;

    if (this.hudRefreshMs >= 250) {
      this.hudRefreshMs = 0;
      this.syncHudResources();
      this.hud.setUnitSummary(this.units.units);
      this.hud.setCycle(dayNight);
      this.renderHeroDock();
    }

    this.renderer.render({
      world: this.world,
      units: this.units.units,
      corpses: this.units.getCorpses(),
      treasures: this.treasures.treasures,
      herbs: this.herbs.herbs,
      resourceNodes: this.resourceNodes.nodes,
      fogOfWar: this.fogOfWar,
      campTile: this.campTile,
      portalTile: this.portalTile,
      orderMarkers: this.units.getOrderMarkers(),
      hoveredTile,
      dayNight,
      elapsed,
      intro: this.intro,
    });

    this.performanceMonitor.record(performance.now() - frameStart);
  }

  updateIntro(delta) {
    this.intro.elapsedMs = Math.min(this.intro.durationMs, this.intro.elapsedMs + delta);
    this.updateIntroCinematic();
    this.updateIntroFogReveal(delta);

    if (!this.didRevealIntroUi && this.intro.elapsedMs >= INTRO_UI_REVEAL_MS) {
      this.didRevealIntroUi = true;
      this.root.classList.add("is-intro-ui-ready");
    }

    if (this.intro.elapsedMs < this.intro.durationMs) {
      return;
    }

    this.refreshBuildSitesAndRoads();
    this.units.finishIntroCinematic();
    this.isIntroActive = false;
    this.intro.active = false;
    this.root.classList.remove("is-intro-active");
    this.root.classList.remove("is-intro-ui-ready");
  }

  setupIntroCinematic() {
    const origin = this.portalTile || this.campTile;
    const occupied = new Set([origin.id]);
    const arrivals = [];

    this.intro.playerUnitIds.forEach((unitId, index) => {
      const unit = this.units.units.find((candidate) => candidate.id === unitId);
      const tile = this.findIntroTile(origin, INTRO_PORTAL_ARRIVAL_RADIUS, occupied, index, {
        minDistance: index === 0 ? 0 : 1,
      });

      if (!unit || !tile) {
        return;
      }

      occupied.add(tile.id);
      arrivals.push({ unitId, tile });
    });

    this.intro.arrivals = arrivals;
    this.units.placeIntroUnitsAtPortal(origin, arrivals);
  }

  updateIntroCinematic() {
    this.runIntroStep("scatter", INTRO_GROUP_WALK_START_MS, () => this.scatterIntroUnits());
    this.runIntroStep("arrivalSpeech", INTRO_GROUP_WALK_START_MS + 900, () => this.playIntroArrivalSpeech());
    this.runIntroStep("explore", INTRO_GROUP_WALK_START_MS + INTRO_GROUP_WALK_MS, () => this.sendIntroExplorers());
    this.runIntroStep("spotFire", INTRO_FIRE_SPOTTED_MS, () => this.spotIntroFire());
    this.scheduleIntroFireReactions();
    this.runIntroStep("moveToFire", INTRO_FIRE_MOVE_MS, () => this.moveIntroGroupToFire());
    this.runIntroStep("lightFire", INTRO_FIRE_START_MS, () => this.startIntroFire());
    this.runIntroStep("revealFire", INTRO_FIRE_START_MS + INTRO_FIRE_DURATION_MS, () => this.lightCampFire());
    this.runIntroStep("greeting", INTRO_GREETING_MS, () => this.units.playIntroGreeting());
  }

  runIntroStep(key, atMs, action) {
    if (this.introCinematicSteps.has(key) || this.intro.elapsedMs < atMs) {
      return;
    }

    this.introCinematicSteps.add(key);
    action();
  }

  scatterIntroUnits() {
    const origin = this.portalTile || this.campTile;
    const occupied = new Set([origin.id]);

    for (const unitId of this.intro.playerUnitIds) {
      const tile = this.findIntroTile(origin, INTRO_PORTAL_SCATTER_RADIUS, occupied, unitId.length, { minDistance: 2 });

      if (!tile) {
        continue;
      }

      occupied.add(tile.id);
      this.units.commandIntroMove(unitId, tile, {
        speech: getIntroLine(unitId, "arrival"),
        icon: "eye",
        stage: "leavePortal",
        pauseAfterPathMs: 650,
      });
    }
  }

  playIntroArrivalSpeech() {
    const lines = ["New air...", "Where did it send us?", "Quiet. Listen.", "No tracks.", "Stay near."];

    this.intro.playerUnitIds.forEach((unitId, index) => {
      this.units.setIntroSpeech(unitId, lines[index % lines.length], index % 2 ? "rest" : "eye", 3000);
    });
  }

  sendIntroExplorers() {
    const origin = this.portalTile || this.campTile;
    const occupied = new Set([origin.id]);

    for (const unitId of this.intro.playerUnitIds) {
      if (unitId === this.intro.fireStarterUnitId) {
        continue;
      }

      const tile = this.findIntroTile(origin, INTRO_EXPLORE_RADIUS, occupied, unitId.charCodeAt(0), { minDistance: 5 });

      if (!tile) {
        continue;
      }

      occupied.add(tile.id);
      this.units.commandIntroMove(unitId, tile, {
        speech: getIntroLine(unitId, "explore"),
        icon: "eye",
        stage: "exploreNewLand",
        pauseAfterPathMs: 900,
      });
    }
  }

  spotIntroFire() {
    this.units.setIntroSpeech(this.intro.fireStarterUnitId, "Hey, I spot a fire.", "alert", 2500);
  }

  scheduleIntroFireReactions() {
    const responders = this.intro.playerUnitIds.filter((unitId) => unitId !== this.intro.fireStarterUnitId);

    responders.forEach((unitId, index) => {
      this.runIntroStep(`fireReaction:${unitId}`, INTRO_FIRE_SPOTTED_MS + 850 + index * INTRO_FIRE_REACTION_STEP_MS, () => {
        this.units.setIntroSpeech(unitId, getIntroLine(unitId, "fireReaction"), index % 2 ? "smile" : "eye", 2200);
      });
    });
  }

  startIntroFire() {
    this.units.clearIntroSpeech();
    this.units.playIntroFireStart(this.intro.fireStarterUnitId, INTRO_FIRE_DURATION_MS);
  }

  moveIntroGroupToFire() {
    const fireTile = this.getIntroFireAccessTile();

    this.units.commandIntroMove(this.intro.fireStarterUnitId, fireTile, {
      speech: "I'll light it.",
      icon: "wood",
      stage: "toFire",
      pauseAfterPathMs: 400,
    });
    this.units.setIntroFollowers(
      this.intro.playerUnitIds.filter((unitId) => unitId !== this.intro.fireStarterUnitId),
      fireTile,
    );
  }

  getIntroFireAccessTile() {
    return this.findIntroTile(this.campTile, 2, new Set([this.campTile.id]), 0, { minDistance: 1 }) || this.campTile;
  }

  findIntroTile(origin, radius, occupied, seed = 0, options = {}) {
    const minDistance = options.minDistance || 0;
    const candidates = [];

    for (let row = origin.row - radius; row <= origin.row + radius; row += 1) {
      for (let column = origin.column - radius; column <= origin.column + radius; column += 1) {
        const tile = this.world.getTile(column, row);

        if (!tile || occupied.has(tile.id) || !isTilePassable(tile) || tile.building || tile.construction) {
          continue;
        }

        const distanceSquared = (column - origin.column) ** 2 + (row - origin.row) ** 2;

        if (distanceSquared > radius * radius || distanceSquared < minDistance * minDistance) {
          continue;
        }

        candidates.push(tile);
      }
    }

    if (candidates.length === 0) {
      return null;
    }

    return candidates[Math.abs(seed * 7 + origin.column + origin.row) % candidates.length];
  }

  revealIntroPortalArea() {
    const origin = this.portalTile || this.campTile;

    this.fogOfWar.revealAround(origin, INTRO_PORTAL_REVEAL_RADIUS);
  }

  updateIntroFogReveal(delta) {
    if (!this.intro?.active) {
      return;
    }

    this.introUnitRevealElapsedMs += delta;

    if (this.introUnitRevealElapsedMs < INTRO_UNIT_REVEAL_INTERVAL_MS) {
      return;
    }

    this.introUnitRevealElapsedMs = 0;
    this.revealIntroUnitAreas();
  }

  revealIntroUnitAreas() {
    for (const unit of this.units.units) {
      if (unit.faction !== "player" || unit.defeated) {
        continue;
      }

      this.fogOfWar.revealAround(unit, INTRO_UNIT_REVEAL_RADIUS);
    }
  }

  lightCampFire() {
    if (this.campFire.isLit) {
      return;
    }

    this.campFire.isLit = true;
    this.intro.didFireReveal = true;
    this.revealFirelitArea();
  }

  revealFirelitArea() {
    this.fogOfWar.revealAround(this.campTile, this.campFire.revealRadius);

    for (const unit of this.units.units) {
      if (unit.faction === "player" && !unit.defeated) {
        this.fogOfWar.revealAround(unit, INTRO_UNIT_REVEAL_RADIUS + 1);
      }
    }
  }

  setupHelpOverlay() {
    if (!this.helpButton || !this.helpPanel || !this.helpCloseButton) {
      return;
    }

    this.helpButton.addEventListener("click", () => this.setHelpOpen(true));
    this.helpCloseButton.addEventListener("click", () => this.setHelpOpen(false));
    this.helpPanel.addEventListener("click", (event) => {
      if (event.target === this.helpPanel) {
        this.setHelpOpen(false);
      }
    });
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && this.isHelpOpen) {
        this.setHelpOpen(false);
      }
    });
  }

  setHelpOpen(isOpen) {
    this.isHelpOpen = isOpen;
    this.syncPauseState();
    this.helpPanel.hidden = !isOpen;
    this.helpButton.setAttribute("aria-expanded", String(isOpen));

    if (isOpen) {
      this.pausedElapsed = this.loop.elapsed;
      this.helpCloseButton.focus();
    } else {
      this.helpButton.focus();
    }
  }

  setupHeroDock() {
    if (!this.heroDock) {
      return;
    }

    this.heroDock.addEventListener("click", (event) => {
      const button = event.target.closest("[data-hero-unit-id]");

      if (!button) {
        return;
      }

      this.focusHero(button.dataset.heroUnitId);
    });
  }

  focusHero(heroUnitId) {
    const hero = this.units.units.find((unit) => unit.id === heroUnitId && unit.isHero);

    if (!hero || hero.isAwayOnQuest) {
      return;
    }

    this.setHeroProfileOpen(false);
    this.setBuildMenuOpen(false);
    this.camera.frameTile(hero, this.renderer.viewport);
  }

  getHeroUnits() {
    return this.units.units.filter((unit) => unit.isHero);
  }

  renderHeroDock() {
    if (!this.heroDock) {
      return;
    }

    const heroes = this.getHeroUnits();
    const nextKey = heroes
      .map((hero) => [hero.id, hero.heroHead, hero.name, hero.health, hero.maxHealth, hero.isAwayOnQuest ? 1 : 0].join(":"))
      .join("|");

    if (nextKey === this.heroDockStateKey) {
      return;
    }

    this.heroDockStateKey = nextKey;
    this.heroDock.hidden = heroes.length === 0;
    this.heroDock.innerHTML = heroes.map((hero) => renderHeroDockButton(hero)).join("");
  }

  setupBuildMenu() {
    if (!this.buildMenu || !this.buildGrid || !this.buildCloseButton) {
      return;
    }

    this.buildCloseButton.addEventListener("click", () => this.closeBuildMenu());
    this.buildMenu.addEventListener("click", (event) => {
      if (event.target === this.buildMenu) {
        this.closeBuildMenu();
      }
    });
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && this.isBuildMenuOpen) {
        this.closeBuildMenu();
      }
    });
  }

  closeBuildMenu() {
    if (this.cardMenuMode === "buildProposal") {
      this.rejectBuildProposal();
      return;
    }

    this.setBuildMenuOpen(false);
  }

  setupHeroProfile() {
    if (!this.heroProfile || !this.heroProfileCloseButton) {
      return;
    }

    this.heroProfileCloseButton.addEventListener("click", () => this.setHeroProfileOpen(false));
    this.heroProfile.addEventListener("click", (event) => {
      if (event.target === this.heroProfile) {
        this.setHeroProfileOpen(false);
      }
    });
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && this.isHeroProfileOpen) {
        this.setHeroProfileOpen(false);
      }
    });
  }

  setBuildMenuOpen(isOpen, tile = null) {
    if (!this.buildMenu) {
      return;
    }

    this.cardMenuMode = "build";
    this.isBuildMenuOpen = isOpen;
    this.selectedBuildTile = isOpen ? tile : null;
    this.selectedTavernTile = null;
    this.selectedGuildTile = null;
    if (isOpen) {
      this.pausedElapsed = this.loop.elapsed;
    }
    this.syncPauseState();
    this.buildMenu.hidden = !isOpen;
    this.buildMenu.classList.remove("is-settler-dialog");

    if (isOpen) {
      this.renderBuildHeader(tile);
      this.renderBuildCards(tile);
      this.buildCloseButton?.focus();
    }
  }

  setBuildProposalOpen(isOpen, proposal = null) {
    if (!this.buildMenu) {
      return;
    }

    this.cardMenuMode = "buildProposal";
    this.isBuildMenuOpen = isOpen;
    this.selectedBuildTile = isOpen ? proposal?.tile || null : null;
    this.selectedTavernTile = null;
    this.selectedGuildTile = null;
    if (isOpen) {
      this.pausedElapsed = this.loop.elapsed;
    }
    this.syncPauseState();
    this.buildMenu.hidden = !isOpen;
    this.buildMenu.classList.toggle("is-settler-dialog", isOpen);

    if (isOpen) {
      this.renderBuildProposalHeader(proposal);
      this.renderBuildProposalCards(proposal);
      this.buildGrid?.querySelector('[data-build-proposal="ok"]')?.focus();
    }
  }

  setHeroMenuOpen(isOpen, tile = null) {
    if (!this.buildMenu) {
      return;
    }

    this.cardMenuMode = "hero";
    this.isBuildMenuOpen = isOpen;
    this.selectedBuildTile = null;
    this.selectedTavernTile = isOpen ? tile : null;
    this.selectedGuildTile = null;
    if (isOpen) {
      this.pausedElapsed = this.loop.elapsed;
    }
    this.syncPauseState();
    this.buildMenu.hidden = !isOpen;
    this.buildMenu.classList.remove("is-settler-dialog");

    if (isOpen) {
      this.renderHeroHeader();
      this.renderHeroCards();
      this.buildCloseButton?.focus();
    }
  }

  setQuestMenuOpen(isOpen, tile = null) {
    if (!this.buildMenu) {
      return;
    }

    this.cardMenuMode = "quest";
    this.isBuildMenuOpen = isOpen;
    this.selectedBuildTile = null;
    this.selectedTavernTile = null;
    this.selectedGuildTile = isOpen ? tile : null;
    if (isOpen) {
      this.pausedElapsed = this.loop.elapsed;
    }
    this.syncPauseState();
    this.buildMenu.hidden = !isOpen;
    this.buildMenu.classList.remove("is-settler-dialog");

    if (isOpen) {
      this.renderQuestHeader();
      this.renderQuestCards();
      this.buildCloseButton?.focus();
    }
  }

  renderBuildHeader(tile) {
    if (this.buildTitle) {
      this.buildTitle.textContent = "Build Site";
    }

    if (this.buildCaption) {
      this.buildCaption.innerHTML = `Tile <span data-ui="build-tile">${tile ? `${tile.column}, ${tile.row}` : ""}</span>`;
      this.buildTileLabel = this.buildCaption.querySelector('[data-ui="build-tile"]');
    }
  }

  renderHeroHeader() {
    if (this.buildTitle) {
      this.buildTitle.textContent = "Tavern Heroes";
    }

    if (this.buildCaption) {
      this.buildCaption.textContent = `Daily roster - day ${this.dayIndex + 1}`;
      this.buildTileLabel = null;
    }
  }

  renderQuestHeader() {
    if (this.buildTitle) {
      this.buildTitle.textContent = "Guild Quests";
    }

    if (this.buildCaption) {
      this.buildCaption.textContent = `Contracts - day ${this.dayIndex + 1}`;
      this.buildTileLabel = null;
    }
  }

  syncPauseState() {
    this.isPaused = this.isHelpOpen || this.isBuildMenuOpen || this.isHeroProfileOpen;
  }

  setHeroProfileOpen(isOpen, unit = null) {
    if (!this.heroProfile) {
      return;
    }

    this.isHeroProfileOpen = isOpen;
    this.selectedHeroUnit = isOpen ? unit : null;
    if (isOpen) {
      this.pausedElapsed = this.loop.elapsed;
      this.renderHeroProfile(unit);
    }
    this.syncPauseState();
    this.heroProfile.hidden = !isOpen;

    if (isOpen) {
      this.heroProfileCloseButton?.focus();
    }
  }

  renderBuildProposalHeader(proposal) {
    if (this.buildTitle) {
      this.buildTitle.textContent = "Settler Question";
    }

    if (this.buildCaption) {
      const name = proposal?.unit?.name || "A settler";
      this.buildCaption.textContent = `${name} awaits your answer`;
      this.buildTileLabel = null;
    }
  }

  renderHeroProfile(unit) {
    if (!unit) {
      return;
    }

    if (this.heroProfileImage) {
      this.heroProfileImage.src = unit.heroPortrait || "";
      this.heroProfileImage.alt = unit.heroPortrait ? `${unit.name} portrait` : "";
      this.heroProfileImage.hidden = !unit.heroPortrait;
    }

    if (this.heroProfileName) {
      this.heroProfileName.textContent = unit.name;
    }

    if (this.heroProfileClass) {
      this.heroProfileClass.textContent = unit.heroClass || unit.role || "Hero";
    }

    if (this.heroProfileLevel) {
      this.heroProfileLevel.textContent = `Lv ${unit.heroLevel || 1}`;
    }

    if (this.heroProfileHealth) {
      this.heroProfileHealth.textContent = `${unit.health || 0}/${unit.maxHealth || unit.health || 0}`;
    }

    if (this.heroProfileXp) {
      this.heroProfileXp.textContent = `${unit.heroXp || 0}/${unit.heroNextLevelXp || 1}`;
    }

    if (this.heroProfilePower) {
      this.heroProfilePower.textContent = String(getHeroQuestPower(unit));
    }

    if (this.heroProfileGold) {
      this.heroProfileGold.textContent = String(unit.heroGold || 0);
    }

    if (this.heroProfileState) {
      this.heroProfileState.textContent = formatHeroState(unit);
    }

    if (this.heroProfileHobby) {
      this.heroProfileHobby.textContent = capitalize(unit.heroHobby || "patrol");
    }

    if (this.heroProfileInventory) {
      this.heroProfileInventory.innerHTML = formatHeroInventory(unit);
    }
  }

  handleTileClick(tile) {
    if (!tile || this.isIntroActive) {
      return;
    }

    const treasure = this.treasures.getTreasureAt(tile.column, tile.row);

    if (treasure) {
      this.units.commandGatherTreasure(treasure);
      return;
    }

    const unit = this.units.getUnitAt(tile.column, tile.row);

    if (unit?.isHero) {
      this.setHeroProfileOpen(true, unit);
      return;
    }

    if (tile.building === "tavern") {
      this.setHeroMenuOpen(true, tile);
      return;
    }

    if (tile.building === "guild-town") {
      this.setQuestMenuOpen(true, tile);
      return;
    }

    const corpse = this.units.getCorpseAt(tile.column, tile.row);

    if (corpse) {
      if (corpse.revivable) {
        this.units.commandReviveCorpse(corpse);
      } else {
        this.units.commandHarvestCorpse(corpse);
      }
      return;
    }

    const herb = this.herbs.getHerbAt(tile.column, tile.row);

    if (herb) {
      this.units.commandGatherHerb(herb);
      return;
    }

    const resourceNode = this.resourceNodes.getNodeAt(tile.column, tile.row);

    if (resourceNode) {
      this.units.commandGatherResource(resourceNode);
      return;
    }

    if (this.isCleanableTile(tile)) {
      this.units.commandCleanTile(tile);
      return;
    }

    if (!this.fogOfWar.isRevealed(tile)) {
      this.units.commandExplore(tile);
    }
  }

  renderBuildCards(tile) {
    if (!this.buildGrid) {
      return;
    }

    this.buildGrid.classList.remove("is-proposal-grid", "is-settler-dialog-grid");
    this.buildGrid.innerHTML = "";

    if (this.buildTileLabel) {
      this.buildTileLabel.textContent = tile ? `${tile.column}, ${tile.row}` : "";
    }

    for (const building of BUILDINGS) {
      const card = document.createElement("article");
      card.className = `build-card build-card-${building.tone}`;

      const canAfford = this.canAfford(building.cost);
      const cost = formatResourcePips(building.cost);
      const maintenance = formatResourcePips(building.maintenance, { suffix: "/day" });
      const effect = formatEffect(building);

      card.innerHTML = `
        <div class="build-card-art" aria-hidden="true"><span></span></div>
        <div class="build-card-body">
          <div class="build-card-title">
            <span class="build-card-kind">${building.tone}</span>
            <h3>${building.name}</h3>
          </div>
          <p class="build-card-effect">${effect}</p>
          <dl>
            <div><dt>Build</dt><dd>${cost}</dd></div>
            <div><dt>Keep</dt><dd>${maintenance}</dd></div>
          </dl>
          <button type="button" ${canAfford ? "" : "disabled"} data-building-id="${building.id}">
            ${canAfford ? "Build" : "Need materials"}
          </button>
        </div>
      `;

      const button = card.querySelector("button");
      button.addEventListener("click", () => this.buildOnSelectedTile(building.id));
      this.buildGrid.append(card);
    }
  }

  renderHeroCards() {
    if (!this.buildGrid) {
      return;
    }

    this.buildGrid.classList.remove("is-proposal-grid", "is-settler-dialog-grid");
    this.buildGrid.innerHTML = "";

    for (const hero of this.heroRoster) {
      const card = document.createElement("article");
      card.className = `build-card hero-card hero-card-${hero.classId}`;

      const canAfford = this.canAfford(hero.cost);
      const cost = formatResourcePips(hero.cost);
      const hireLabel = hero.hired ? "Hired" : canAfford ? "Hire" : "Need resources";
      const portraitStyle = hero.portrait ? ` style="--hero-portrait: url('${escapeHtml(hero.portrait)}')"` : "";

      card.innerHTML = `
        <div class="build-card-art hero-card-art${hero.portrait ? " has-portrait" : ""}" aria-hidden="true"${portraitStyle}><span></span></div>
        <div class="build-card-body">
          <div class="build-card-title">
            <span class="build-card-kind">${escapeHtml(hero.className)}</span>
            <h3>${escapeHtml(hero.name)}</h3>
          </div>
          <p class="build-card-effect">
            ${formatHeroEffect(hero)}
          </p>
          <dl>
            <div><dt>Hobby</dt><dd><span class="hero-chip">${escapeHtml(hero.hobbyLabel)}</span></dd></div>
            <div><dt>Hire</dt><dd>${cost}</dd></div>
          </dl>
          <button type="button" ${canAfford && !hero.hired ? "" : "disabled"} data-hero-id="${hero.id}">
            ${hireLabel}
          </button>
        </div>
      `;

      const button = card.querySelector("button");
      button.addEventListener("click", () => this.hireHero(hero.id));
      this.buildGrid.append(card);
    }
  }

  hireHero(heroId) {
    const hero = this.heroRoster.find((candidate) => candidate.id === heroId);
    const tavernTile = this.selectedTavernTile;

    if (!hero || hero.hired || !tavernTile || !this.canAfford(hero.cost)) {
      return;
    }

    const spawnTile = this.units.findHeroSpawnTile(tavernTile);

    if (!spawnTile) {
      return;
    }

    for (const [resource, amount] of Object.entries(hero.cost)) {
      this.resources[resource] -= amount;
    }

    hero.hired = true;
    this.units.addHero(hero, spawnTile, tavernTile);
    this.syncHudResources();
    this.hud.setUnitSummary(this.units.units);
    this.renderHeroDock();
    this.renderHeroCards();
  }

  renderQuestCards() {
    if (!this.buildGrid) {
      return;
    }

    this.buildGrid.classList.remove("is-proposal-grid", "is-settler-dialog-grid");
    const availableHeroes = this.units.getAvailableHeroes(this.selectedGuildTile || this.campTile);
    const activeQuestCards = this.activeQuests.map((quest) => renderActiveQuestCard(quest)).join("");

    this.buildGrid.innerHTML = activeQuestCards;

    for (const quest of this.questRoster) {
      const selected = this.getQuestSelection(quest.id);
      const availableHeroIds = new Set(availableHeroes.map((hero) => hero.id));

      for (const heroId of selected) {
        if (!availableHeroIds.has(heroId)) {
          selected.delete(heroId);
        }
      }

      const selectedHeroes = availableHeroes.filter((hero) => selected.has(hero.id));
      const selectedPower = getQuestTeamPower(selectedHeroes);
      const isFull = selected.size >= quest.maxTeam;
      const canStart = selected.size >= quest.minTeam;
      const buttonLabel = canStart ? "Start Quest" : `Pick ${quest.minTeam}`;
      const card = document.createElement("article");

      card.className = `build-card quest-card quest-card-${quest.tone}`;
      card.innerHTML = `
        <div class="build-card-art quest-card-art" aria-hidden="true"><span></span></div>
        <div class="build-card-body">
          <div class="build-card-title">
            <span class="build-card-kind">${escapeHtml(quest.kind)}</span>
            <h3>${escapeHtml(quest.name)}</h3>
          </div>
          <p class="build-card-effect">${formatQuestEffect(quest, selectedPower)}</p>
          <dl>
            <div><dt>Reward</dt><dd>${formatResourcePips(quest.reward)}</dd></div>
            <div><dt>Party</dt><dd><span class="hero-chip">${selected.size}/${quest.maxTeam} heroes</span></dd></div>
          </dl>
          <div class="quest-team" data-quest-team="${quest.id}">
            ${availableHeroes.map((hero) => renderQuestHeroChip(hero, selected.has(hero.id), isFull)).join("")}
          </div>
          <button type="button" ${canStart ? "" : "disabled"} data-quest-id="${quest.id}">
            ${buttonLabel}
          </button>
        </div>
      `;

      for (const chip of card.querySelectorAll("[data-hero-id]")) {
        chip.addEventListener("click", () => this.toggleQuestHero(quest.id, chip.dataset.heroId, quest.maxTeam));
      }

      const button = card.querySelector("button[data-quest-id]");
      button.addEventListener("click", () => this.startQuest(quest.id));
      this.buildGrid.append(card);
    }
  }

  getQuestSelection(questId) {
    if (!this.questSelections.has(questId)) {
      this.questSelections.set(questId, new Set());
    }

    return this.questSelections.get(questId);
  }

  toggleQuestHero(questId, heroId, maxTeam) {
    const selection = this.getQuestSelection(questId);

    if (selection.has(heroId)) {
      selection.delete(heroId);
    } else if (selection.size < maxTeam) {
      selection.add(heroId);
    }

    this.renderQuestCards();
  }

  startQuest(questId) {
    const quest = this.questRoster.find((candidate) => candidate.id === questId);
    const guildTile = this.selectedGuildTile;
    const selectedIds = [...this.getQuestSelection(questId)];

    if (!quest || !guildTile || selectedIds.length < quest.minTeam || selectedIds.length > quest.maxTeam) {
      return;
    }

    const party = this.units.getHeroesByIds(selectedIds);

    if (party.length !== selectedIds.length) {
      return;
    }

    const assigned = this.units.sendHeroesOnQuest(selectedIds, guildTile, quest);

    if (!assigned) {
      return;
    }

    this.activeQuests.push({
      ...quest,
      runId: `quest-run-${this.nextQuestRunId}`,
      heroIds: selectedIds,
      heroNames: party.map((hero) => hero.name),
      remainingMs: quest.durationMs,
      durationMs: quest.durationMs,
      guildTileId: guildTile.id,
      teamPower: getQuestTeamPower(party),
    });
    this.nextQuestRunId += 1;
    this.questRoster = this.questRoster.filter((candidate) => candidate.id !== questId);
    this.questSelections.delete(questId);
    this.syncHudResources();
    this.renderQuestCards();
  }

  markBuildProposalReady(unit, tile, buildingId) {
    this.buildProposalSystem.markReady(unit, tile, buildingId);
  }

  renderBuilderQuestionDock() {
    this.builderQuestionDock.render(this.buildProposalSystem.getVisibleProposals());
  }

  selectBuildProposal(proposalId) {
    const proposal = this.buildProposalSystem.getVisibleProposals().find((candidate) => candidate.id === proposalId);

    if (!proposal) {
      return;
    }

    this.camera.frameTile(proposal.unit, this.renderer.viewport, this.config.render.maxZoom * 0.9);

    if (proposal.state !== "ready") {
      return;
    }

    this.builderQuestionDock.render([]);
    this.setBuildProposalOpen(true, proposal);
  }

  confirmBuildProposal() {
    if (this.buildProposalSystem.confirm()) {
      this.setBuildProposalOpen(false);
    }
  }

  rerouteBuildProposal() {
    this.setBuildProposalOpen(false);
    this.buildProposalSystem.reroute();
  }

  rejectBuildProposal() {
    this.setBuildProposalOpen(false);
    this.buildProposalSystem.reject();
  }

  buildOnSelectedTile(buildingId) {
    const tile = this.selectedBuildTile;
    const building = getBuildingById(buildingId);
    const roadConnector = tile ? this.getBuildRoadConnector(tile) : null;

    if (
      !tile ||
      !building ||
      tile.building ||
      tile.construction ||
      tile.buildReservedBy ||
      !tile.canBuild ||
      !roadConnector ||
      !this.canAfford(building.cost)
    ) {
      return;
    }

    const assigned = this.units.commandBuildTile(tile, building.id);

    if (!assigned) {
      this.setBuildMenuOpen(false);
      return;
    }

    tile.roadConnector = { column: roadConnector.column, row: roadConnector.row };

    for (const [resource, amount] of Object.entries(building.cost)) {
      this.resources[resource] -= amount;
    }

    this.refreshBuildSitesAndRoads();
    this.world.touchStructure(tile);
    this.syncHudResources();
    this.setBuildMenuOpen(false);
  }

  canAfford(cost) {
    return Object.entries(cost).every(([resource, amount]) => (this.resources[resource] || 0) >= amount);
  }

  spendResources(cost) {
    for (const [resource, amount] of Object.entries(cost)) {
      this.resources[resource] -= amount;
    }
  }

  isCleanableTile(tile) {
    if (this.herbs.getActiveHerbAt(tile.column, tile.row) || this.resourceNodes.getActiveNodeAt(tile.column, tile.row)) {
      return false;
    }

    return Boolean(
      this.herbs.getDepletedHerbAt(tile.column, tile.row) ||
        this.resourceNodes.getDepletedCleanableNodeAt(tile.column, tile.row) ||
        tile.type === "rock" ||
        tile.type === "obsidian" ||
        tile.type === "water",
    );
  }

  cleanTile(tile) {
    const didCleanHerb = this.herbs.cleanAt(tile.column, tile.row);
    const didCleanNode = this.resourceNodes.cleanAt(tile.column, tile.row);
    const didCleanTerrain = tile.type === "rock" || tile.type === "obsidian" || tile.type === "water";

    if (!didCleanHerb && !didCleanNode && !didCleanTerrain) {
      return false;
    }

    tile.type = getEmptyTileType(tile);
    tile.label = TILE_TYPES[tile.type].label;
    tile.elevation = 0;
    tile.isEmpty = true;
    tile.building = null;
    tile.cleanReservedBy = null;
    this.world.touchTerrain(tile);
    this.refreshBuildSitesAndRoads();
    return true;
  }

  startConstruction(tile, buildingId) {
    if (!tile || tile.construction || tile.building) {
      return false;
    }

    const roadConnector = tile.roadConnector
      ? this.world.getTile(tile.roadConnector.column, tile.roadConnector.row)
      : this.getBuildRoadConnector(tile);

    if (!roadConnector) {
      return false;
    }

    tile.construction = {
      buildingId,
      remainingMs: CONSTRUCTION_MS,
      durationMs: CONSTRUCTION_MS,
    };
    tile.roadConnector = roadConnector ? { column: roadConnector.column, row: roadConnector.row } : null;
    this.refreshBuildSitesAndRoads();
    this.world.touchStructure(tile);
    return true;
  }

  updateConstructions(delta) {
    let changed = false;

    for (const tile of this.world.tiles) {
      if (!tile.construction) {
        continue;
      }

      tile.construction.remainingMs -= delta;

      if (tile.construction.remainingMs > 0) {
        continue;
      }

      tile.building = tile.construction.buildingId;
      tile.construction = null;
      tile.isEmpty = false;
      this.world.touchStructure(tile);
      changed = true;
    }

    if (changed) {
      this.refreshBuildSitesAndRoads();
      this.syncHudResources();
    }
  }

  renderBuildProposalCards(proposal) {
    if (!this.buildGrid || !proposal) {
      return;
    }

    this.buildGrid.classList.add("is-proposal-grid", "is-settler-dialog-grid");
    const building = proposal.building || getBuildingById(proposal.buildingId);

    if (!building) {
      return;
    }

    const canAfford = this.canAfford(building.cost);
    const cost = formatDialogCost(building.cost);
    const habitants = building.habitants || 0;
    const population = formatDialogBonus("Population", habitants, "habitants");
    const name = proposal.unit?.name || "Settler";

    this.buildGrid.innerHTML = `
      <article class="settler-dialog" aria-labelledby="settler-dialog-speaker">
        <div class="settler-dialog-portrait" aria-hidden="true">
          <img src="${duneSettlerArt.questionPortrait}" alt="" />
        </div>
        <div class="settler-dialog-body">
          <p id="settler-dialog-speaker" class="settler-dialog-speaker">${escapeHtml(name)}</p>
          <p class="settler-dialog-message">
            My lord, should we build a house here?
          </p>
          <div class="dialog-tag-row" aria-label="Action cost and reward">${cost}${population}</div>
          <div class="settler-dialog-actions">
            <button type="button" ${canAfford ? "" : "disabled"} data-build-proposal="ok">
              <span>Build here</span>
              <small>${canAfford ? "Begin the house" : "Need wood"}</small>
            </button>
            <button type="button" data-build-proposal="elsewhere">
              <span>Find another place</span>
              <small>Keep looking</small>
            </button>
            <button type="button" data-build-proposal="no">
              <span>Not now</span>
              <small>Return to work</small>
            </button>
          </div>
        </div>
      </article>
    `;

    this.buildGrid.querySelector('[data-build-proposal="ok"]')?.addEventListener("click", () =>
      this.confirmBuildProposal(),
    );
    this.buildGrid.querySelector('[data-build-proposal="elsewhere"]')?.addEventListener("click", () =>
      this.rerouteBuildProposal(),
    );
    this.buildGrid.querySelector('[data-build-proposal="no"]')?.addEventListener("click", () =>
      this.rejectBuildProposal(),
    );
  }

  updateQuests(delta) {
    let changed = false;

    for (const quest of this.activeQuests) {
      quest.remainingMs -= delta;

      if (quest.remainingMs > 0) {
        continue;
      }

      this.finishQuest(quest);
      changed = true;
    }

    if (changed) {
      this.activeQuests = this.activeQuests.filter((quest) => quest.remainingMs > 0);

      if (this.isBuildMenuOpen && this.cardMenuMode === "quest") {
        this.renderQuestCards();
      }
    }
  }

  finishQuest(quest) {
    const guildTile = this.getTileById(quest.guildTileId) || this.campTile;
    const successChance = Math.max(0.35, Math.min(0.92, 0.58 + (quest.teamPower - quest.difficulty) * 0.11));
    const successRoll = seededQuestRoll(`${quest.runId}:${this.dayIndex}:${quest.teamPower}`);
    const succeeded = successRoll <= successChance;
    const reward = succeeded ? quest.reward.gold || 0 : Math.max(1, Math.floor((quest.reward.gold || 0) * 0.25));

    if (reward > 0) {
      this.addGold(reward);
    }

    this.units.completeHeroQuest(quest.heroIds, guildTile, {
      title: quest.name,
      reward,
      succeeded,
      xp: succeeded ? quest.xp : 1,
    });
    this.syncHudResources();
    this.hud.setUnitSummary(this.units.units);
  }

  refreshBuildSitesAndRoads() {
    const roadConnectorIds = this.getAssignedRoadConnectorIds();
    const previousState = new Map();

    for (const tile of this.world.tiles) {
      previousState.set(tile.id, getStructureStateKey(tile));
    }

    for (const tile of this.world.tiles) {
      tile.canBuild = false;
      tile.hasRoad = false;
      tile.roadConnections = null;
    }

    for (const tile of this.world.tiles) {
      if (this.isRoadTile(tile, roadConnectorIds)) {
        tile.hasRoad = true;
      }
    }

    for (const tile of this.world.tiles) {
      if (this.isBuildSiteCenter(tile)) {
        tile.canBuild = true;
      }
    }

    for (const tile of this.world.tiles) {
      if (tile.hasRoad) {
        tile.roadConnections = this.getRoadConnections(tile);
      }
    }

    const changedTiles = [];

    for (const tile of this.world.tiles) {
      if (previousState.get(tile.id) !== getStructureStateKey(tile)) {
        changedTiles.push(tile);
      }
    }

    this.world.touchStructureTiles(changedTiles);
  }

  getRoadConnections(tile) {
    return {
      columnPlus: this.isRoadNeighbor(tile.column + 1, tile.row),
      columnMinus: this.isRoadNeighbor(tile.column - 1, tile.row),
      rowPlus: this.isRoadNeighbor(tile.column, tile.row + 1),
      rowMinus: this.isRoadNeighbor(tile.column, tile.row - 1),
    };
  }

  isRoadNeighbor(column, row) {
    const tile = this.world.getTile(column, row);

    return Boolean(tile && (tile.hasRoad || this.isRoadNetworkAnchor(tile)));
  }

  isBuildSiteCenter(tile) {
    if (
      !tile?.isEmpty ||
      tile.hasDarkPortal ||
      tile.building ||
      tile.construction ||
      tile.buildReservedBy ||
      this.hasNearbyRoadAnchor(tile, BUILD_ANCHOR_CLEARANCE) ||
      !this.canConnectToRoadNetwork(tile)
    ) {
      return false;
    }

    for (let row = tile.row - BUILD_FOOTPRINT_RADIUS; row <= tile.row + BUILD_FOOTPRINT_RADIUS; row += 1) {
      for (
        let column = tile.column - BUILD_FOOTPRINT_RADIUS;
        column <= tile.column + BUILD_FOOTPRINT_RADIUS;
        column += 1
      ) {
        const neighbor = this.world.getTile(column, row);

        if (
          !neighbor?.isEmpty ||
          neighbor.building ||
          neighbor.construction ||
          neighbor.buildReservedBy ||
          neighbor.hasRoad
        ) {
          return false;
        }
      }
    }

    return true;
  }

  canConnectToRoadNetwork(tile) {
    return Boolean(this.getBuildRoadConnector(tile));
  }

  getBuildRoadConnector(tile) {
    const offsets = [
      { column: 1, row: 0 },
      { column: -1, row: 0 },
      { column: 0, row: 1 },
      { column: 0, row: -1 },
    ];

    for (const offset of offsets) {
      const connector = this.world.getTile(
        tile.column + offset.column * BUILD_CONNECTOR_DISTANCE,
        tile.row + offset.row * BUILD_CONNECTOR_DISTANCE,
      );
      const anchor = this.world.getTile(
        tile.column + offset.column * BUILD_ANCHOR_DISTANCE,
        tile.row + offset.row * BUILD_ANCHOR_DISTANCE,
      );

      if (
        connector?.isEmpty &&
        !connector.building &&
        !connector.construction &&
        anchor &&
        this.isRoadNetworkAnchor(anchor)
      ) {
        return connector;
      }
    }

    return null;
  }

  hasNearbyRoadAnchor(tile, radius) {
    for (let row = tile.row - radius; row <= tile.row + radius; row += 1) {
      for (let column = tile.column - radius; column <= tile.column + radius; column += 1) {
        if (column === tile.column && row === tile.row) {
          continue;
        }

        if (this.isRoadAnchor(column, row)) {
          return true;
        }
      }
    }

    return false;
  }

  getAssignedRoadConnectorIds() {
    const ids = new Set();

    for (const tile of this.world.tiles) {
      if ((tile.building || tile.construction || tile.buildReservedBy) && tile.roadConnector) {
        ids.add(`${tile.roadConnector.column}:${tile.roadConnector.row}`);
      }
    }

    return ids;
  }

  isRoadTile(tile, roadConnectorIds = null) {
    if (!tile?.isEmpty || tile.hasDarkPortal || tile.building || tile.construction || tile.id === this.campTile.id) {
      return false;
    }

    if (roadConnectorIds?.has(tile.id)) {
      return true;
    }

    return (
      this.hasRoadConnection(tile.column - 1, tile.row, tile.column + 1, tile.row) ||
      this.hasRoadConnection(tile.column, tile.row - 1, tile.column, tile.row + 1)
    );
  }

  hasRoadConnection(firstColumn, firstRow, secondColumn, secondRow) {
    const firstIsAnchor = this.isRoadAnchor(firstColumn, firstRow);
    const secondIsAnchor = this.isRoadAnchor(secondColumn, secondRow);

    return (
      (firstIsAnchor && this.isRoadNetworkAnchor(this.world.getTile(secondColumn, secondRow))) ||
      (secondIsAnchor && this.isRoadNetworkAnchor(this.world.getTile(firstColumn, firstRow)))
    );
  }

  isRoadAnchor(column, row) {
    const tile = this.world.getTile(column, row);

    return Boolean(tile && (tile.building || tile.construction || tile.id === this.campTile.id));
  }

  isRoadNetworkAnchor(tile) {
    return Boolean(tile && (tile.hasRoad || tile.building || tile.construction || tile.id === this.campTile.id));
  }

  addGold(gold) {
    this.resources.gold += gold;
    this.syncHudResources();
  }

  addHerbs(herbs) {
    this.resources.herbs += herbs;
    this.syncHudResources();
  }

  addResource(type, amount) {
    this.resources[type] += amount;
    this.syncHudResources();
  }

  syncHudResources() {
    this.hud.setResources({
      ...this.resources,
      habitants: this.getHabitantStatus(),
    });
  }

  getHabitantStatus() {
    const used = this.units.units.filter(
      (unit) => unit.faction === "player" && !unit.defeated && !unit.isAwayOnQuest,
    ).length;
    const capacity = BASE_HABITANT_CAPACITY + this.getBuiltHabitantCapacity();

    return {
      used,
      capacity,
      overCapacity: used > capacity,
    };
  }

  getBuiltHabitantCapacity() {
    let capacity = 0;

    for (const tile of this.world.tiles) {
      if (!tile.building) {
        continue;
      }

      capacity += getBuildingById(tile.building)?.habitants || 0;
    }

    return capacity;
  }

  advanceDay() {
    this.dayIndex += 1;
    this.heroRoster = createHeroRoster(this.dayIndex);
    this.questRoster = createQuestRoster(this.dayIndex);
    this.questSelections.clear();

    if (this.isBuildMenuOpen && this.cardMenuMode === "hero") {
      this.renderHeroHeader();
      this.renderHeroCards();
    } else if (this.isBuildMenuOpen && this.cardMenuMode === "quest") {
      this.renderQuestHeader();
      this.renderQuestCards();
    }
  }

  getTileById(tileId) {
    if (!tileId) {
      return null;
    }

    const [column, row] = tileId.split(":").map(Number);

    return this.world.getTile(column, row);
  }

  getStartingReservedKeys(startingUnits) {
    const keys = new Set([this.campTile.id, ...startingUnits.map((unit) => `${unit.column}:${unit.row}`)]);

    for (let row = this.campTile.row - START_CLEAR_RADIUS; row <= this.campTile.row + START_CLEAR_RADIUS; row += 1) {
      for (
        let column = this.campTile.column - START_CLEAR_RADIUS;
        column <= this.campTile.column + START_CLEAR_RADIUS;
        column += 1
      ) {
        const tile = this.world.getTile(column, row);

        if (tile) {
          keys.add(tile.id);
        }
      }
    }

    return keys;
  }

  getPortalReservedKeys() {
    const keys = new Set();

    if (this.portalTile) {
      addReservedTileRadius(this.world, keys, this.portalTile, 4);
    }

    return keys;
  }
}

function addReservedTileRadius(world, keys, center, radius) {
  for (let row = center.row - radius; row <= center.row + radius; row += 1) {
    for (let column = center.column - radius; column <= center.column + radius; column += 1) {
      const tile = world.getTile(column, row);

      if (tile) {
        keys.add(tile.id);
      }
    }
  }
}

function getIntroLine(unitId, phase) {
  const lines = {
    arrival: {
      "warrior-asha": "Weapons ready.",
      "settler-tor": "This ground feels wrong.",
      "settler-vale": "Where are the others?",
      "archer-mira": "I see no road.",
      "wolf-nyx": "Grr...",
    },
    explore: {
      "warrior-asha": "I'll sweep the edge.",
      "settler-vale": "Looking for tracks.",
      "archer-mira": "I'll scout ahead.",
      "wolf-nyx": "Sniff...",
    },
    fireReaction: {
      "warrior-asha": "A fire? Move.",
      "settler-vale": "I see the glow.",
      "archer-mira": "Good eyes.",
      "wolf-nyx": "Hrrr.",
    },
  };

  return lines[phase]?.[unitId] || (phase === "arrival" ? "We made it." : "Checking ahead.");
}

function clearPortalLandingArea(world, center) {
  for (let row = center.row - 4; row <= center.row + 4; row += 1) {
    for (let column = center.column - 4; column <= center.column + 4; column += 1) {
      const tile = world.getTile(column, row);

      if (!tile || Math.hypot(tile.column - center.column, tile.row - center.row) > 4.2) {
        continue;
      }

      tile.type = "campground";
      tile.label = TILE_TYPES[tile.type].label;
      tile.elevation = 0;
      tile.isEmpty = true;
      tile.building = null;
      tile.construction = null;
      tile.canBuild = false;
      tile.hasRoad = false;
      tile.roadConnections = null;
    }
  }
}

function findCampPortalTile(world, campTile) {
  const preferredOffsets = [
    { column: -9, row: 1 },
    { column: -9, row: 0 },
    { column: -8, row: 2 },
    { column: -10, row: 1 },
    { column: 9, row: -1 },
  ];

  for (const offset of preferredOffsets) {
    const tile = world.getTile(campTile.column + offset.column, campTile.row + offset.row);

    if (isOpenPortalTile(tile)) {
      return tile;
    }
  }

  for (let radius = 8; radius <= 12; radius += 1) {
    for (let row = -radius; row <= radius; row += 1) {
      for (let column = -radius; column <= radius; column += 1) {
        if (Math.abs(column) !== radius && Math.abs(row) !== radius) {
          continue;
        }

        const tile = world.getTile(campTile.column + column, campTile.row + row);

        if (isOpenPortalTile(tile)) {
          return tile;
        }
      }
    }
  }

  return null;
}

function isOpenPortalTile(tile) {
  return Boolean(tile?.isEmpty && !tile.building && !tile.construction && isTilePassable(tile));
}

function tileDistance(a, b) {
  return Math.hypot(a.column - b.column, a.row - b.row);
}

function getEmptyTileType(tile) {
  if (tile.biome === "snow") {
    return "snow";
  }

  if (tile.biome === "volcanic") {
    return "ash";
  }

  if (tile.biome === "desert") {
    return "sand";
  }

  return "grass";
}

function getStructureStateKey(tile) {
  const road = tile.roadConnections || {};

  return [
    tile.canBuild ? 1 : 0,
    tile.hasRoad ? 1 : 0,
    tile.building || "",
    tile.construction?.buildingId || "",
    tile.buildReservedBy || "",
    road.columnPlus ? 1 : 0,
    road.columnMinus ? 1 : 0,
    road.rowPlus ? 1 : 0,
    road.rowMinus ? 1 : 0,
  ].join(":");
}

function formatHeroEffect(hero) {
  return [
    `<strong class="build-effect-var build-effect-${hero.tone}">Lv 1 ${escapeHtml(hero.className)}</strong>`,
    " - ",
    escapeHtml(hero.pitch),
  ].join("");
}

function renderHeroDockButton(hero) {
  const health = Math.max(0, hero.health || 0);
  const maxHealth = Math.max(1, hero.maxHealth || health || 1);
  const healthPercent = Math.round((health / maxHealth) * 100);
  const label = `${hero.name}, ${hero.heroClass || "Hero"}, ${formatHeroState(hero)}`;
  const image = hero.heroHead
    ? `<img src="${escapeHtml(hero.heroHead)}" alt="" />`
    : `<span>${escapeHtml((hero.name || "?").charAt(0))}</span>`;

  return `
    <button
      type="button"
      class="hero-dock-button ${hero.isAwayOnQuest ? "is-away" : ""}"
      data-hero-unit-id="${escapeHtml(hero.id)}"
      aria-label="${escapeHtml(label)}"
      ${hero.isAwayOnQuest ? "disabled" : ""}
    >
      ${image}
      <small style="--hero-health: ${healthPercent}%"></small>
    </button>
  `;
}

function formatHeroState(hero) {
  if (hero.isAwayOnQuest) {
    return "Quest";
  }

  if (hero.defeated) {
    return "Down";
  }

  if (hero.order === "recover" || hero.order === "heroRest") {
    return "Resting";
  }

  if (hero.order === "attack") {
    return "Fighting";
  }

  if (hero.order === "heroActivity") {
    return capitalize(hero.heroHobby || "active");
  }

  return "Patrol";
}

function formatHeroInventory(hero) {
  const equipped = Object.entries(hero.equipment || {})
    .filter(([, item]) => item)
    .map(([slot, item]) => ({ ...item, slot }));
  const backpack = hero.backpack || [];
  const items = [...equipped, ...backpack];

  if (!items.length) {
    return `<li class="is-empty">No loot yet</li>`;
  }

  return items
    .map((item) => {
      const stat = item.attackBonus ? `+${item.attackBonus} atk` : item.healthBonus ? `+${item.healthBonus} hp` : "loot";
      const slot = item.slot || item.kind || "item";

      return `<li><span>${escapeHtml(item.name || "Unknown")}</span><small>${escapeHtml(slot)} / ${escapeHtml(stat)}</small></li>`;
    })
    .join("");
}

function renderActiveQuestCard(quest) {
  const progress = 1 - quest.remainingMs / quest.durationMs;
  const percent = Math.round(Math.max(0, Math.min(1, progress)) * 100);

  return `
    <article class="build-card quest-card quest-card-active">
      <div class="build-card-art quest-card-art" aria-hidden="true"><span></span></div>
      <div class="build-card-body">
        <div class="build-card-title">
          <span class="build-card-kind">Away</span>
          <h3>${escapeHtml(quest.name)}</h3>
        </div>
        <p class="build-card-effect">
          ${escapeHtml(quest.heroNames.join(", "))} are away. Return in
          <strong class="build-effect-var build-effect-hero">${formatDuration(quest.remainingMs)}</strong>.
        </p>
        <div class="quest-progress" aria-hidden="true"><span style="width: ${percent}%"></span></div>
        <dl>
          <div><dt>Reward</dt><dd>${formatResourcePips(quest.reward)}</dd></div>
          <div><dt>Power</dt><dd><span class="hero-chip">${quest.teamPower}/${quest.difficulty}</span></dd></div>
        </dl>
        <button type="button" disabled>In progress</button>
      </div>
    </article>
  `;
}

function renderQuestHeroChip(hero, isSelected, isFull) {
  const isDisabled = !isSelected && isFull;
  const level = hero.heroLevel || 1;
  const power = getHeroQuestPower(hero);

  return `
    <button
      type="button"
      class="quest-hero-chip ${isSelected ? "is-selected" : ""}"
      ${isDisabled ? "disabled" : ""}
      data-hero-id="${escapeHtml(hero.id)}"
    >
      <span>${escapeHtml(hero.name)}</span>
      <small>Lv ${level} / ${power}</small>
    </button>
  `;
}

function formatQuestEffect(quest, selectedPower) {
  return [
    `<strong class="build-effect-var build-effect-quest">${selectedPower}/${quest.difficulty}</strong>`,
    " power - ",
    escapeHtml(quest.pitch),
  ].join("");
}

function formatDuration(ms) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));

  return `${seconds}s`;
}

function formatEffect(building) {
  const tokens = building.effectTokens || [{ text: building.effect }];

  return tokens
    .map((token) => {
      const text = escapeHtml(token.text);

      if (!token.tone) {
        return text;
      }

      return `<strong class="build-effect-var build-effect-${token.tone}">${text}</strong>`;
    })
    .join("");
}

function formatResourcePips(resources, options = {}) {
  const suffix = typeof options === "string" ? options : options.suffix || "";

  return Object.entries(resources)
    .map(([resource, amount]) => {
      const icon = getResourceIcon(resource);
      const label = capitalize(resource);

      if (!icon) {
        return `<span class="resource-pip resource-pip-text"><span class="resource-rune" aria-hidden="true">${label.charAt(
          0,
        )}</span><span>${amount}${suffix}</span><span class="sr-only"> ${label}</span></span>`;
      }

      return `<span class="resource-pip"><img src="${icon}" alt="" /><span>${amount}${suffix}</span><span class="sr-only"> ${label}</span></span>`;
    })
    .join("");
}

function formatDialogCost(resources) {
  return Object.entries(resources)
    .map(([resource, amount]) =>
      renderDialogBadge({
        tone: "cost",
        sign: "-",
        amount,
        label: capitalize(resource),
        icon: getResourceIcon(resource),
      }),
    )
    .join(" ");
}

function formatDialogBonus(label, amount, resource = "") {
  return renderDialogBadge({
    tone: "gain",
    sign: "+",
    amount,
    label,
    icon: resource ? getResourceIcon(resource) : "",
  });
}

function renderDialogBadge({ tone, sign, amount, label, icon }) {
  const iconMarkup = icon ? `<img src="${icon}" alt="" />` : `<span aria-hidden="true">${escapeHtml(label.charAt(0))}</span>`;

  return `
    <strong class="dialog-badge dialog-badge-${tone}">
      ${iconMarkup}
      <span>${sign}${amount}</span>
      <span class="sr-only"> ${escapeHtml(label)}</span>
    </strong>
  `;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });
}

function capitalize(value) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}
