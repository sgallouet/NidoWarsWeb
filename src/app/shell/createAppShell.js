import { RESOURCE_ICONS, RESOURCE_KEYS } from "../../content/resources/definitions.js";

const RESOURCE_LABELS = {
  gold: "Gold",
  herbs: "Herbs",
  fish: "Fish",
  meat: "Meat",
  berries: "Berries",
  wood: "Wood",
  rock: "Rock",
};

const HELP_ACTIONS = [
  { iconClass: "help-icon-eye", title: "Explore", text: "Click hidden fog to send scouts and reveal nearby tiles." },
  { iconClass: "help-icon-gold", title: "Collect Gold", text: "Click a chest to haul it back to camp." },
  { resource: "herbs", title: "Gather Herbs", text: "Click wild herbs to collect healing supplies." },
  { resource: "fish", title: "Catch Fish", text: "Click fish shoals near water to gather food." },
  { resource: "berries", title: "Pick Berries", text: "Click berry bushes in green lands for food." },
  { resource: "wood", title: "Chop Wood", text: "Click timber trees to gather building material." },
  { resource: "rock", title: "Mine Rock", text: "Click stone deposits to gather rock." },
  { iconClass: "help-icon-alert", title: "Fight", text: "Nearby warriors answer danger and protect the camp." },
  { iconClass: "help-icon-rest", title: "Recover", text: "Wounded warriors return to camp and rest." },
];

export function createAppShell(target = document.body) {
  target.innerHTML = `
    <main class="game-shell" data-app-root>
      <canvas id="game-canvas" aria-label="Nido Wars realtime desert island map"></canvas>
      ${renderCycleHud()}
      ${renderResourceHud()}
      ${renderPerformanceMonitor()}
      ${renderChromeButtons()}
      ${renderLoadingOverlay()}
      ${renderHelpOverlay()}
      ${renderBuildOverlay()}
    </main>
  `;

  return target.querySelector("[data-app-root]");
}

function renderCycleHud() {
  return `
    <section class="cycle-hud" aria-label="Day and night cycle">
      <div class="cycle-meter" data-ui="cycle" data-phase="day" aria-label="Day">
        <span class="cycle-clock" aria-hidden="true">
          <span class="cycle-hand" data-ui="cycle-hand"></span>
        </span>
      </div>
    </section>
  `;
}

function renderResourceHud() {
  return `
    <header class="hud hud-top" aria-label="Game status">
      <dl class="resource-strip">
        ${RESOURCE_KEYS.map(renderResourceItem).join("")}
      </dl>
    </header>
  `;
}

function renderResourceItem(resource) {
  return `
    <div class="resource-item">
      <dt class="sr-only">${RESOURCE_LABELS[resource]}</dt>
      <dd class="resource-value">
        <img src="${RESOURCE_ICONS[resource]}" alt="" />
        <span data-ui="${resource}">0</span>
      </dd>
    </div>
  `;
}

function renderPerformanceMonitor() {
  return `
    <section class="perf-monitor" aria-label="Frame generation time">
      <span class="perf-value"><span data-ui="frame-ms">--</span> ms</span>
      <canvas data-ui="perf-graph" aria-hidden="true"></canvas>
    </section>
  `;
}

function renderChromeButtons() {
  return `
    <button
      class="help-button"
      type="button"
      data-ui="help-toggle"
      aria-controls="help-panel"
      aria-expanded="false"
      aria-label="Open action guide"
    >?</button>
    <button class="fullscreen-button" type="button" data-ui="fullscreen" aria-label="Enter fullscreen">
      <span aria-hidden="true"></span>
    </button>
  `;
}

function renderLoadingOverlay() {
  return `
    <section class="loading-overlay" data-ui="loading-panel" aria-label="Preparing map">
      <div class="loading-box">
        <strong>Preparing map</strong>
        <div class="loading-track" aria-hidden="true">
          <span data-ui="loading-fill"></span>
        </div>
        <span data-ui="loading-value">0%</span>
      </div>
    </section>
  `;
}

function renderHelpOverlay() {
  return `
    <section class="help-overlay" id="help-panel" data-ui="help-panel" aria-label="Action guide" hidden>
      <div class="help-sheet" role="dialog" aria-modal="true" aria-labelledby="help-title">
        <div class="help-header">
          <h2 id="help-title">Action Guide</h2>
          <button class="help-close" type="button" data-ui="help-close" aria-label="Close action guide">x</button>
        </div>
        <div class="help-grid">
          ${HELP_ACTIONS.map(renderHelpAction).join("")}
        </div>
      </div>
    </section>
  `;
}

function renderHelpAction(action) {
  const icon = action.resource
    ? `<span class="help-icon" aria-hidden="true"><img src="${RESOURCE_ICONS[action.resource]}" alt="" /></span>`
    : `<span class="help-icon ${action.iconClass}" aria-hidden="true"></span>`;

  return `
    <article class="help-action">
      ${icon}
      <h3>${action.title}</h3>
      <p>${action.text}</p>
    </article>
  `;
}

function renderBuildOverlay() {
  return `
    <section class="build-overlay" data-ui="build-menu" aria-label="Build menu" hidden>
      <div class="build-sheet" role="dialog" aria-modal="true" aria-labelledby="build-title">
        <div class="build-header">
          <div>
            <h2 id="build-title" data-ui="build-title">Build Site</h2>
            <span data-ui="build-caption">Tile <span data-ui="build-tile"></span></span>
          </div>
          <button class="build-close" type="button" data-ui="build-close" aria-label="Close build menu">x</button>
        </div>
        <div class="build-grid" data-ui="build-grid"></div>
      </div>
    </section>
  `;
}
