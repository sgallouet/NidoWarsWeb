export class DayNightCycle {
  constructor({ dayMs, nightMs, transitionMs }) {
    this.dayMs = dayMs;
    this.nightMs = nightMs;
    this.transitionMs = Math.min(transitionMs, dayMs * 0.45, nightMs * 0.45);
    this.elapsedMs = 0;
  }

  update(delta) {
    this.elapsedMs = (this.elapsedMs + delta) % this.totalMs;
  }

  getState() {
    const position = this.elapsedMs % this.totalMs;
    const isDay = position < this.dayMs;
    const phaseElapsed = isDay ? position : position - this.dayMs;
    const phaseDuration = isDay ? this.dayMs : this.nightMs;
    const nightAmount = this.getNightAmount(position);

    return {
      phase: isDay ? "day" : "night",
      label: isDay ? "Day" : "Night",
      phaseProgress: phaseElapsed / phaseDuration,
      nightAmount,
      light: 1 - nightAmount * 0.46,
    };
  }

  get totalMs() {
    return this.dayMs + this.nightMs;
  }

  getNightAmount(position) {
    if (position < this.dayMs) {
      const duskStart = this.dayMs - this.transitionMs;

      if (position < duskStart) {
        return 0;
      }

      return smoothstep((position - duskStart) / this.transitionMs);
    }

    const nightPosition = position - this.dayMs;
    const dawnStart = this.nightMs - this.transitionMs;

    if (nightPosition < dawnStart) {
      return 1;
    }

    return 1 - smoothstep((nightPosition - dawnStart) / this.transitionMs);
  }
}

function smoothstep(value) {
  const clamped = Math.max(0, Math.min(1, value));

  return clamped * clamped * (3 - 2 * clamped);
}
