const HISTORY_SIZE = 1800;
const SAMPLE_RANGE_MS = 32;
const DRAW_INTERVAL_MS = 250;
const VALUE_UPDATE_INTERVAL_MS = 250;
const GRAPH_PIXEL_STEP = 3;
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
    this.lastDrawAt = 0;
    this.lastValueAt = 0;
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

    const now = performance.now();

    this.samples[this.cursor] = frameMs;
    this.cursor = (this.cursor + 1) % this.samples.length;
    this.count = Math.min(this.count + 1, this.samples.length);

    if (this.valueNode && now - this.lastValueAt >= VALUE_UPDATE_INTERVAL_MS) {
      this.valueNode.textContent = frameMs.toFixed(2);
      this.lastValueAt = now;
    }

    if (now - this.lastDrawAt >= DRAW_INTERVAL_MS) {
      this.lastDrawAt = now;
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

    const pointCount = Math.max(2, Math.min(this.count, Math.ceil(width / GRAPH_PIXEL_STEP)));
    let previousPoint = this.getSamplePoint(0, pointCount, width, height);

    for (let i = 1; i < pointCount; i += 1) {
      const point = this.getSamplePoint(i, pointCount, width, height);
      const color = getSampleColor(Math.max(previousPoint.sample, point.sample));

      ctx.strokeStyle = color.stroke;
      ctx.shadowColor = color.glow;
      ctx.beginPath();
      ctx.moveTo(previousPoint.x, previousPoint.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
      previousPoint = point;
    }

    ctx.restore();
  }

  getSamplePoint(index, pointCount, width, height) {
    const start = Math.floor((index / pointCount) * this.count);
    const end = Math.max(start + 1, Math.floor(((index + 1) / pointCount) * this.count));
    let sample = 0;

    for (let i = start; i < end; i += 1) {
      const sampleIndex = (this.cursor - this.count + i + this.samples.length) % this.samples.length;

      sample = Math.max(sample, this.samples[sampleIndex]);
    }

    return {
      sample,
      x: (index / (pointCount - 1)) * width,
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
