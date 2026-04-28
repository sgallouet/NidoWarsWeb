export class Hud {
  constructor(root) {
    this.nodes = {
      gold: root.querySelector('[data-ui="gold"]'),
      herbs: root.querySelector('[data-ui="herbs"]'),
      fish: root.querySelector('[data-ui="fish"]'),
      berries: root.querySelector('[data-ui="berries"]'),
      wood: root.querySelector('[data-ui="wood"]'),
      cycle: root.querySelector('[data-ui="cycle"]'),
      cycleHand: root.querySelector('[data-ui="cycle-hand"]'),
      fps: root.querySelector('[data-ui="fps"]'),
    };
  }

  setResources({ gold, herbs, fish, berries, wood }) {
    this.nodes.gold.textContent = String(gold);
    this.nodes.herbs.textContent = String(herbs);
    this.nodes.fish.textContent = String(fish);
    this.nodes.berries.textContent = String(berries);
    this.nodes.wood.textContent = String(wood);
  }

  setFps(fps) {
    this.nodes.fps.textContent = String(fps);
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
