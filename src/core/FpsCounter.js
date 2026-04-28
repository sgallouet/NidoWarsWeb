export class FpsCounter {
  constructor({ sampleMs = 500 } = {}) {
    this.sampleMs = sampleMs;
    this.elapsedMs = 0;
    this.frames = 0;
    this.currentFps = 0;
  }

  record(deltaMs) {
    this.elapsedMs += deltaMs;
    this.frames += 1;

    if (this.elapsedMs < this.sampleMs) {
      return null;
    }

    this.currentFps = Math.round((this.frames * 1000) / this.elapsedMs);
    this.elapsedMs = 0;
    this.frames = 0;

    return this.currentFps;
  }
}
