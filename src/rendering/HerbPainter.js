import { getLoadedImage } from "../engine/assets/AssetLoader.js";
import { RESOURCE_NODE_ART } from "../content/resources/definitions.js";

export class HerbPainter {
  constructor() {
    this.herbImage = null;
  }

  setImageCache(imageCache) {
    this.herbImage = getLoadedImage(imageCache, RESOURCE_NODE_ART.herbs);
  }

  paint(ctx, { x, y, loadsRemaining }) {
    if (this.herbImage) {
      this.paintHerbImage(ctx, x, y, loadsRemaining);
      return;
    }

    ctx.save();
    ctx.fillStyle = "rgba(33, 23, 12, 0.2)";
    ctx.beginPath();
    ctx.ellipse(x, y + 8, 16, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#4e8a4f";
    ctx.lineWidth = 2.3;
    ctx.lineCap = "round";

    for (let i = 0; i < 7; i += 1) {
      const angle = -Math.PI / 2 + (i - 3) * 0.23;
      const length = 11 + (i % 3) * 3;

      ctx.beginPath();
      ctx.moveTo(x, y + 6);
      ctx.lineTo(x + Math.cos(angle) * length, y + 6 + Math.sin(angle) * length);
      ctx.stroke();
    }

    ctx.fillStyle = "#cce68a";
    ctx.beginPath();
    ctx.arc(x + 5, y - 8, 3, 0, Math.PI * 2);
    ctx.arc(x - 5, y - 5, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 244, 214, 0.84)";
    ctx.font = "700 9px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(loadsRemaining), x, y + 12);
    ctx.restore();
  }

  paintHerbImage(ctx, x, y, loadsRemaining) {
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.herbImage, x - 27, y - 41, 54, 54);

    ctx.fillStyle = "rgba(255, 244, 214, 0.9)";
    ctx.font = "700 9px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(loadsRemaining), x, y + 12);
    ctx.restore();
  }
}
