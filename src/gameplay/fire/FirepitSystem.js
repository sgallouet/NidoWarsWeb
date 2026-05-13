const FIREPIT_LIGHT_MS = 4000;
const FIREPIT_TRIGGER_RADIUS = 1.5;

export class FirepitSystem {
  constructor({ onLightingStarted = () => {}, onLit = () => {} } = {}) {
    this.firepits = new Map();
    this.onLightingStarted = onLightingStarted;
    this.onLit = onLit;
  }

  registerFirepit({ id, tile, isLit = false, revealRadius = 0 }) {
    const existing = this.firepits.get(id);
    const firepit = {
      id,
      tile,
      isLit: existing?.isLit ?? isLit,
      isLighting: existing?.isLighting ?? false,
      lightingMs: existing?.lightingMs ?? 0,
      lightingDurationMs: existing?.lightingDurationMs ?? FIREPIT_LIGHT_MS,
      intentUnitId: existing?.intentUnitId ?? null,
      revealRadius,
    };

    this.firepits.set(id, firepit);
    return firepit;
  }

  getFirepit(id) {
    return this.firepits.get(id) || null;
  }

  requestLight(id, unitId) {
    const firepit = this.getFirepit(id);

    if (!firepit || firepit.isLit) {
      return false;
    }

    firepit.intentUnitId = unitId;
    return true;
  }

  update(delta, units) {
    for (const firepit of this.firepits.values()) {
      if (firepit.isLit) {
        continue;
      }

      if (firepit.isLighting) {
        this.updateLighting(delta, firepit);
        continue;
      }

      const unit = units.find((candidate) => candidate.id === firepit.intentUnitId && !candidate.defeated);

      if (!unit || !isUnitNearFirepit(unit, firepit)) {
        continue;
      }

      firepit.isLighting = true;
      firepit.lightingMs = 0;
      this.onLightingStarted(unit, firepit);
    }
  }

  updateLighting(delta, firepit) {
    firepit.lightingMs = Math.min(firepit.lightingDurationMs, firepit.lightingMs + delta);

    if (firepit.lightingMs < firepit.lightingDurationMs) {
      return;
    }

    firepit.isLit = true;
    firepit.isLighting = false;
    firepit.intentUnitId = null;
    this.onLit(firepit);
  }
}

function isUnitNearFirepit(unit, firepit) {
  return Math.hypot(unit.column - firepit.tile.column, unit.row - firepit.tile.row) <= FIREPIT_TRIGGER_RADIUS;
}
