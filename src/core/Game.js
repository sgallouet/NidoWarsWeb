import { GameLoop } from "./GameLoop.js";
import { InputController } from "../engine/InputController.js";
import { Camera2D } from "../rendering/Camera2D.js";
import { CanvasRenderer } from "../rendering/CanvasRenderer.js";
import { createDesertMap } from "../world/createDesertMap.js";
import { DayNightCycle } from "../world/DayNightCycle.js";
import { FogOfWar } from "../world/FogOfWar.js";
import { HerbManager } from "../world/HerbManager.js";
import { ResourceNodeManager } from "../world/ResourceNodeManager.js";
import { Hud } from "../ui/Hud.js";
import { PerformanceMonitor } from "../ui/PerformanceMonitor.js";
import { TreasureManager } from "../world/TreasureManager.js";
import { UnitManager } from "../units/UnitManager.js";
import { createStartingUnits, findCampTile } from "../units/unitDefinitions.js";
import { BUILDINGS, getBuildingById } from "../world/buildings.js";
import { TILE_TYPES } from "../world/tileTypes.js";

const CONSTRUCTION_MS = 2 * 60 * 1000;
const START_CLEAR_RADIUS = 5;
const BUILD_FOOTPRINT_RADIUS = 1;
const BUILD_CONNECTOR_DISTANCE = BUILD_FOOTPRINT_RADIUS + 1;
const BUILD_ANCHOR_DISTANCE = BUILD_FOOTPRINT_RADIUS + 2;
const BUILD_ANCHOR_CLEARANCE = BUILD_FOOTPRINT_RADIUS + 1;
const INTRO_DURATION_MS = 2000;
const INTRO_UI_REVEAL_MS = 1700;
const INTRO_GREETING_MS = 1250;

export class Game {
  constructor({ canvas, root, config }) {
    this.config = config;
    this.resources = { ...config.resources };
    this.root = root;
    this.dayNightCycle = new DayNightCycle(config.timeOfDay);
    this.world = createDesertMap(config.map);
    this.fogOfWar = new FogOfWar(this.world);
    this.campTile = findCampTile(this.world);
    const startingUnits = createStartingUnits(this.world, this.campTile);
    const reservedSpawnKeys = this.getStartingReservedKeys(startingUnits);
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
        wood: 60,
        rock: 60,
      },
      reservedKeys: reservedSpawnKeys,
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
      corpseTtlMs: this.dayNightCycle.totalMs,
    });
    this.camera = new Camera2D(config.render);
    this.hud = new Hud(root);
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
    this.buildMenu = root.querySelector('[data-ui="build-menu"]');
    this.buildGrid = root.querySelector('[data-ui="build-grid"]');
    this.buildCloseButton = root.querySelector('[data-ui="build-close"]');
    this.buildTitle = root.querySelector('[data-ui="build-title"]');
    this.buildCaption = root.querySelector('[data-ui="build-caption"]');
    this.buildTileLabel = root.querySelector('[data-ui="build-tile"]');
    this.loadingPanel = root.querySelector('[data-ui="loading-panel"]');
    this.loadingFill = root.querySelector('[data-ui="loading-fill"]');
    this.loadingValue = root.querySelector('[data-ui="loading-value"]');
    this.isPaused = false;
    this.isHelpOpen = false;
    this.isBuildMenuOpen = false;
    this.isIntroActive = true;
    this.didIntroGreeting = false;
    this.didRevealIntroUi = false;
    this.intro = {
      active: true,
      elapsedMs: 0,
      durationMs: INTRO_DURATION_MS,
      campTile: this.campTile,
    };
    this.cardMenuMode = "build";
    this.selectedBuildTile = null;
    this.selectedTavernTile = null;
    this.selectedGuildTile = null;
    this.dayIndex = 0;
    this.heroRoster = createHeroRoster(this.dayIndex);
    this.questRoster = createQuestRoster(this.dayIndex);
    this.questSelections = new Map();
    this.activeQuests = [];
    this.nextQuestRunId = 1;
    this.pausedElapsed = 0;
    this.hudRefreshMs = 0;
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
    this.renderer.resize();
    this.performanceMonitor.resize();
    this.camera.frameTile(this.campTile, this.renderer.viewport);
    this.hud.setResources(this.resources);
    this.hud.setCycle(this.dayNightCycle.getState());
    this.hud.setTile(this.campTile);
    this.units.revealStartingArea();
    this.refreshBuildSitesAndRoads();
    this.hud.setUnitSummary(this.units.units);
    this.setupHelpOverlay();
    this.setupBuildMenu();
    this.setLoadingProgress(0);
    this.setLoadingVisible(true);

    await this.renderer.prepareWorld(this.world, this.fogOfWar, (progress) => {
      this.setLoadingProgress(progress);
    });

    this.setLoadingVisible(false);

    window.addEventListener("resize", () => {
      this.renderer.resize();
      this.performanceMonitor.resize();
      if (this.isIntroActive) {
        this.camera.frameTile(this.campTile, this.renderer.viewport);
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
      }
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
      this.hud.setUnitSummary(this.units.units);
      this.hud.setCycle(dayNight);
    }

    this.renderer.render({
      world: this.world,
      units: this.units.units,
      corpses: this.units.getCorpses(),
      treasures: this.treasures.getVisibleTreasures(),
      herbs: this.herbs.getVisibleHerbs(),
      resourceNodes: this.resourceNodes.getVisibleNodes(),
      fogOfWar: this.fogOfWar,
      campTile: this.campTile,
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

    if (!this.didIntroGreeting && this.intro.elapsedMs >= INTRO_GREETING_MS) {
      this.didIntroGreeting = true;
      this.units.playIntroGreeting();
    }

    if (!this.didRevealIntroUi && this.intro.elapsedMs >= INTRO_UI_REVEAL_MS) {
      this.didRevealIntroUi = true;
      this.root.classList.add("is-intro-ui-ready");
    }

    if (this.intro.elapsedMs < this.intro.durationMs) {
      return;
    }

    this.isIntroActive = false;
    this.intro.active = false;
    this.root.classList.remove("is-intro-active");
    this.root.classList.remove("is-intro-ui-ready");
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

  setupBuildMenu() {
    if (!this.buildMenu || !this.buildGrid || !this.buildCloseButton) {
      return;
    }

    this.buildCloseButton.addEventListener("click", () => this.setBuildMenuOpen(false));
    this.buildMenu.addEventListener("click", (event) => {
      if (event.target === this.buildMenu) {
        this.setBuildMenuOpen(false);
      }
    });
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && this.isBuildMenuOpen) {
        this.setBuildMenuOpen(false);
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

    if (isOpen) {
      this.renderBuildHeader(tile);
      this.renderBuildCards(tile);
      this.buildCloseButton?.focus();
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
    this.isPaused = this.isHelpOpen || this.isBuildMenuOpen;
  }

  handleTileClick(tile) {
    if (!tile || this.isIntroActive) {
      return;
    }

    const corpse = this.units.getCorpseAt(tile.column, tile.row);

    if (corpse) {
      this.units.commandHarvestCorpse(corpse);
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

    if (tile.canBuild && !tile.building && !tile.construction) {
      this.setBuildMenuOpen(true, tile);
      return;
    }

    const treasure = this.treasures.getTreasureAt(tile.column, tile.row);

    if (treasure) {
      this.units.commandGatherTreasure(treasure);
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

    this.buildGrid.innerHTML = "";

    for (const hero of this.heroRoster) {
      const card = document.createElement("article");
      card.className = `build-card hero-card hero-card-${hero.classId}`;

      const canAfford = this.canAfford(hero.cost);
      const cost = formatResourcePips(hero.cost);
      const hireLabel = hero.hired ? "Hired" : canAfford ? "Hire" : "Need resources";

      card.innerHTML = `
        <div class="build-card-art hero-card-art" aria-hidden="true"><span></span></div>
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
    this.hud.setResources(this.resources);
    this.hud.setUnitSummary(this.units.units);
    this.renderHeroCards();
  }

  renderQuestCards() {
    if (!this.buildGrid) {
      return;
    }

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
    this.renderQuestCards();
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

    tile.canBuild = false;
    this.world.touchTile(tile);
    this.refreshBuildSitesAndRoads();
    this.hud.setResources(this.resources);
    this.setBuildMenuOpen(false);
  }

  canAfford(cost) {
    return Object.entries(cost).every(([resource, amount]) => (this.resources[resource] || 0) >= amount);
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
    this.refreshBuildSitesAndRoads();
    this.world.touchTile(tile);
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
    tile.canBuild = false;
    tile.hasRoad = false;
    tile.roadConnector = roadConnector ? { column: roadConnector.column, row: roadConnector.row } : null;
    this.refreshBuildSitesAndRoads();
    this.world.touchTile(tile);
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
      tile.canBuild = false;
      tile.hasRoad = false;
      changed = true;
    }

    if (changed) {
      this.refreshBuildSitesAndRoads();
      this.world.touchTile();
    }
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
    this.hud.setUnitSummary(this.units.units);
  }

  refreshBuildSitesAndRoads() {
    const roadConnectorIds = this.getAssignedRoadConnectorIds();

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
    if (!tile?.isEmpty || tile.building || tile.construction || tile.id === this.campTile.id) {
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
    this.hud.setResources(this.resources);
  }

  addHerbs(herbs) {
    this.resources.herbs += herbs;
    this.hud.setResources(this.resources);
  }

  addResource(type, amount) {
    this.resources[type] += amount;
    this.hud.setResources(this.resources);
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

function createHeroRoster(dayIndex) {
  const names = ["Mira", "Borin", "Sava", "Keth", "Nara", "Oryn", "Talia", "Voss", "Elun", "Rook"];
  const classes = [
    {
      classId: "ranger",
      className: "Ranger",
      hobby: "hunting",
      hobbyLabel: "Hunting",
      cost: { gold: 4, meat: 2 },
      pitch: "Tracks monsters by day and returns to the tavern at night.",
      tone: "gain",
    },
    {
      classId: "angler",
      className: "Angler",
      hobby: "fishing",
      hobbyLabel: "Fishing",
      cost: { gold: 3, fish: 3 },
      pitch: "Roams toward fishing spots during daylight.",
      tone: "food",
    },
    {
      classId: "guardian",
      className: "Guardian",
      hobby: "hunting",
      hobbyLabel: "Hunting",
      cost: { gold: 5, rock: 4 },
      pitch: "A sturdy fighter who grows stronger from fights.",
      tone: "watch",
    },
    {
      classId: "herbalist",
      className: "Herbalist",
      hobby: "foraging",
      hobbyLabel: "Foraging",
      cost: { gold: 3, herbs: 3 },
      pitch: "Wanders berry and herb country while the sun is up.",
      tone: "food",
    },
  ];
  const roster = [];

  for (let index = 0; index < 3; index += 1) {
    const classTemplate = classes[(dayIndex + index * 2) % classes.length];
    const name = names[(dayIndex * 3 + index * 5) % names.length];

    roster.push({
      ...classTemplate,
      id: `${dayIndex}-${index}-${classTemplate.classId}`,
      name,
      hired: false,
    });
  }

  return roster;
}

function createQuestRoster(dayIndex) {
  const quests = [
    {
      key: "salt-giant",
      name: "Slay the Salt Giant",
      kind: "Hunt",
      pitch: "A huge monster is stomping through the salt flats.",
      minTeam: 1,
      maxTeam: 3,
      difficulty: 4,
      reward: { gold: 9 },
      xp: 3,
      durationMs: 65 * 1000,
      tone: "hunt",
    },
    {
      key: "lost-caravan",
      name: "Recover the Lost Caravan",
      kind: "Rescue",
      pitch: "Find the wagon lights before the dunes swallow them.",
      minTeam: 1,
      maxTeam: 2,
      difficulty: 3,
      reward: { gold: 6 },
      xp: 2,
      durationMs: 48 * 1000,
      tone: "rescue",
    },
    {
      key: "obsidian-crown",
      name: "Break the Obsidian Crown",
      kind: "Raid",
      pitch: "Strike a volcanic lair and bring back its tribute.",
      minTeam: 2,
      maxTeam: 3,
      difficulty: 6,
      reward: { gold: 12 },
      xp: 4,
      durationMs: 82 * 1000,
      tone: "raid",
    },
    {
      key: "moonwell",
      name: "Guard the Moonwell",
      kind: "Watch",
      pitch: "Hold a night road until the pilgrims pass safely.",
      minTeam: 1,
      maxTeam: 2,
      difficulty: 4,
      reward: { gold: 7 },
      xp: 3,
      durationMs: 58 * 1000,
      tone: "watch",
    },
  ];

  return [0, 1, 2].map((offset) => {
    const quest = quests[(dayIndex + offset) % quests.length];

    return {
      ...quest,
      id: `${dayIndex}-${offset}-${quest.key}`,
    };
  });
}

function formatHeroEffect(hero) {
  return [
    `<strong class="build-effect-var build-effect-${hero.tone}">Lv 1 ${escapeHtml(hero.className)}</strong>`,
    " - ",
    escapeHtml(hero.pitch),
  ].join("");
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

function getQuestTeamPower(heroes) {
  return heroes.reduce((total, hero) => total + getHeroQuestPower(hero), 0);
}

function getHeroQuestPower(hero) {
  return Math.max(1, (hero.heroLevel || 1) + Math.max(0, (hero.attackDamage || 1) - 1));
}

function formatDuration(ms) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));

  return `${seconds}s`;
}

function seededQuestRoll(seed) {
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }

  return (hash % 1000) / 1000;
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

function getResourceIcon(resource) {
  const icons = {
    gold: "./assets/gold.png",
    herbs: "./assets/herbs.svg",
    fish: "./assets/fish.png",
    meat: "./assets/meat.svg",
    berries: "./assets/berries.png",
    wood: "./assets/wood.png",
    rock: "./assets/rock.png",
  };

  return icons[resource] || null;
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
