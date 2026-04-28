export class GameLoop {
  constructor(onTick) {
    this.onTick = onTick;
    this.rafId = 0;
    this.previousTime = 0;
    this.elapsed = 0;
  }

  start() {
    this.previousTime = performance.now();
    this.rafId = requestAnimationFrame((time) => this.tick(time));
  }

  stop() {
    cancelAnimationFrame(this.rafId);
  }

  tick(time) {
    const delta = Math.min(50, time - this.previousTime);

    this.previousTime = time;
    this.elapsed += delta;

    this.onTick({
      delta,
      elapsed: this.elapsed,
    });

    this.rafId = requestAnimationFrame((nextTime) => this.tick(nextTime));
  }
}
