const RESOURCE_KEYS = ["gold", "herbs", "fish", "meat", "berries", "wood", "rock"];
const RESOURCE_ROLL_MS = 780;

export class Hud {
  constructor(root) {
    this.nodes = {
      gold: root.querySelector('[data-ui="gold"]'),
      herbs: root.querySelector('[data-ui="herbs"]'),
      fish: root.querySelector('[data-ui="fish"]'),
      berries: root.querySelector('[data-ui="berries"]'),
      wood: root.querySelector('[data-ui="wood"]'),
      rock: root.querySelector('[data-ui="rock"]'),
      cycle: root.querySelector('[data-ui="cycle"]'),
      cycleHand: root.querySelector('[data-ui="cycle-hand"]'),
    };
    this.resourceState = new Map();
    this.hasRenderedResources = false;

    for (const key of RESOURCE_KEYS) {
      const node = this.nodes[key];

      this.resourceState.set(key, {
        value: Number(node.textContent) || 0,
        targetValue: Number(node.textContent) || 0,
        frameId: null,
        container: node.closest(".resource-value"),
      });
    }
  }

  setResources({ gold, herbs, fish, meat, berries, wood, rock }) {
    const resources = { gold, herbs, fish, meat, berries, wood, rock };

    for (const key of RESOURCE_KEYS) {
      this.setResourceValue(key, resources[key]);
    }

    this.hasRenderedResources = true;
  }

  setResourceValue(key, rawValue) {
    const nextValue = Number(rawValue) || 0;
    const node = this.nodes[key];
    const state = this.resourceState.get(key);

    if (!this.hasRenderedResources) {
      state.value = nextValue;
      state.targetValue = nextValue;
      node.textContent = String(nextValue);
      return;
    }

    if (state.targetValue === nextValue) {
      return;
    }

    if (state.frameId) {
      cancelAnimationFrame(state.frameId);
    }

    const fromValue = Number(node.textContent) || state.value;
    const direction = nextValue > fromValue ? "increasing" : "decreasing";
    const startedAt = performance.now();
    const container = state.container;
    const deltaText = `${nextValue > fromValue ? "+" : ""}${nextValue - fromValue}`;

    state.targetValue = nextValue;
    container.dataset.delta = deltaText;
    container.classList.remove("is-increasing", "is-decreasing", "is-rolling", "show-delta");
    void container.offsetWidth;
    container.classList.add("is-rolling", `is-${direction}`, "show-delta");

    const roll = (now) => {
      const progress = Math.min(1, (now - startedAt) / RESOURCE_ROLL_MS);

      if (progress >= 1) {
        state.value = nextValue;
        state.targetValue = nextValue;
        state.frameId = null;
        node.textContent = String(nextValue);
        container.classList.remove("is-rolling");
        window.setTimeout(() => {
          container.classList.remove("show-delta", `is-${direction}`);
        }, 280);
        return;
      }

      const eased = easeOutCubic(progress);
      const drift = Math.round(lerp(fromValue, nextValue, eased));
      const span = Math.max(1, Math.ceil(Math.abs(nextValue - fromValue) * (1 - progress) * 0.4));
      const flicker = Math.floor(Math.random() * (span * 2 + 1)) - span;
      const rolledValue = Math.max(0, drift + flicker);

      node.textContent = String(rolledValue);
      state.frameId = requestAnimationFrame(roll);
    };

    state.frameId = requestAnimationFrame(roll);
  }

  setCycle(dayNight) {
    const cycleProgress = Number.isFinite(dayNight.cycleProgress) ? dayNight.cycleProgress : 0;
    const dayShare = Number.isFinite(dayNight.dayShare) ? dayNight.dayShare : 0.5;

    this.nodes.cycle.dataset.phase = dayNight.phase;
    this.nodes.cycle.setAttribute("aria-label", `${dayNight.label} cycle`);
    this.nodes.cycle.style.setProperty("--day-share", `${dayShare}turn`);
    this.nodes.cycleHand.style.setProperty("--cycle-turn", `${cycleProgress}turn`);
  }

  setTile(tile) {
    void tile;
  }

  setUnitSummary(units) {
    void units;
  }
}

function easeOutCubic(value) {
  return 1 - Math.pow(1 - value, 3);
}

function lerp(from, to, amount) {
  return from + (to - from) * amount;
}
