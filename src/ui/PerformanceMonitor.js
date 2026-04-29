const HISTORY_SIZE = 1800;
const SAMPLE_RANGE_MS = 32;
const DRAW_SAMPLE_INTERVAL = 2;
const FRAME_BUDGET_MS = 16;
const HEAVY_SPIKE_MS = 30;

export class PerformanceMonitor {
  constructor({ canvas, valueNode }) {
    this.canvas = canvas;
    this.context = canvas?.getContext("2d", { alpha: true }) || null;
    this.valueNode = valueNode;
    this.samples = new Float32Array(HISTORY_SIZE);
    this.cursor = 0;
    this.count = 0;
    this.pendingSamples = 0;
    this.viewport = { width: 1, height: 1, dpr: 1 };
  }

  resize() {
    if (!this.canvas) {
      return;
    }

    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.viewport = {
      width: Math.max(1, rect.width),
      height: Math.max(1, rect.height),
      dpr,
    };

    this.canvas.width = Math.floor(this.viewport.width * dpr);
    this.canvas.height = Math.floor(this.viewport.height * dpr);
    this.draw();
  }

  record(frameMs) {
    if (!this.context) {
      return;
    }

    this.samples[this.cursor] = frameMs;
    this.cursor = (this.cursor + 1) % this.samples.length;
    this.count = Math.min(this.count + 1, this.samples.length);
    this.pendingSamples += 1;

    if (this.valueNode) {
      this.valueNode.textContent = frameMs.toFixed(2);
    }

    if (this.pendingSamples >= DRAW_SAMPLE_INTERVAL) {
      this.pendingSamples = 0;
      this.draw();
    }
  }

  draw() {
    if (!this.context) {
      return;
    }

    const { width, height, dpr } = this.viewport;
    const ctx = this.context;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    this.paintGrid(ctx, width, height);

    if (this.count < 2) {
      return;
    }

    ctx.save();
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.shadowBlur = 8;

    let previousPoint = null;

    for (let i = 0; i < this.count; i += 1) {
      const point = this.getSamplePoint(i, width, height);

      if (previousPoint) {
        const color = getSampleColor(Math.max(previousPoint.sample, point.sample));

        ctx.strokeStyle = color.stroke;
        ctx.shadowColor = color.glow;
        ctx.beginPath();
        ctx.moveTo(previousPoint.x, previousPoint.y);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
      }

      previousPoint = point;
    }

    ctx.restore();
  }

  getSamplePoint(index, width, height) {
    const sampleIndex = (this.cursor - this.count + index + this.samples.length) % this.samples.length;
    const sample = this.samples[sampleIndex];

    return {
      sample,
      x: (index / (this.samples.length - 1)) * width,
      y: height - Math.min(1, sample / SAMPLE_RANGE_MS) * (height - 8) - 4,
    };
  }

  paintGrid(ctx, width, height) {
    ctx.save();
    ctx.strokeStyle = "rgba(255, 244, 214, 0.1)";
    ctx.lineWidth = 1;

    for (const ms of [8, 16, 24, 32]) {
      const y = height - Math.min(1, ms / SAMPLE_RANGE_MS) * (height - 8) - 4;

      ctx.strokeStyle =
        ms === 32 ? "rgba(255, 91, 64, 0.22)" : ms === 16 ? "rgba(255, 170, 65, 0.22)" : "rgba(255, 244, 214, 0.1)";
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.restore();
  }
}

function getSampleColor(sample) {
  if (sample > HEAVY_SPIKE_MS) {
    return {
      stroke: "#ff5b40",
      glow: "rgba(255, 91, 64, 0.46)",
    };
  }

  if (sample > FRAME_BUDGET_MS) {
    return {
      stroke: "#ffaa41",
      glow: "rgba(255, 170, 65, 0.42)",
    };
  }

  return {
    stroke: "#74ffe1",
    glow: "rgba(73, 215, 194, 0.34)",
  };
}
