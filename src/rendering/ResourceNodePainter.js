import { pickSprite } from "./SpriteAtlas.js";

export class ResourceNodePainter {
  constructor(spriteAtlas = null) {
    this.spriteAtlas = spriteAtlas;
    this.rockImage = typeof Image === "undefined" ? null : new Image();

    if (this.rockImage) {
      this.rockImage.src = "./assets/rock.png";
    }
  }

  paint(ctx, { node, x, y, elapsed }) {
    if (node.type === "fish") {
      this.paintFishShoal(ctx, x, y, elapsed, node);
      return;
    }

    if (node.type === "wood") {
      this.paintTimberTree(ctx, x, y, node);
      return;
    }

    if (node.type === "rock") {
      this.paintRockDeposit(ctx, x, y, node);
      return;
    }

    this.paintBerryBush(ctx, x, y, node);
  }

  paintFishShoal(ctx, x, y, elapsed, node) {
    const shimmer = Math.sin(elapsed * 0.006 + node.column) * 1.6;

    ctx.save();
    if (this.spriteAtlas?.draw(ctx, "blueSlime", x, y + 15 + shimmer * 0.2, { size: 42, anchorY: 1 })) {
      ctx.restore();
      return;
    }

    ctx.fillStyle = "rgba(7, 54, 73, 0.22)";
    ctx.beginPath();
    ctx.ellipse(x, y + 7, 25, 10, -0.08, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(205, 255, 247, 0.48)";
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 2; i += 1) {
      ctx.beginPath();
      ctx.ellipse(x + i * 4 - 4, y + 5, 18 + i * 5, 6 + i * 2, 0, 0.2, Math.PI * 1.25);
      ctx.stroke();
    }

    this.paintSmallFish(ctx, x - 8, y - 1 + shimmer, 0.82, "#8fe8ef");
    this.paintSmallFish(ctx, x + 9, y + 4 - shimmer * 0.6, -0.7, "#4fc7db");
    this.paintSmallFish(ctx, x + 1, y - 8 + shimmer * 0.35, 0.15, "#b8f6ff");
    ctx.restore();
  }

  paintSmallFish(ctx, x, y, rotation, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-7, 0);
    ctx.lineTo(-13, -4);
    ctx.lineTo(-12, 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#17435a";
    ctx.beginPath();
    ctx.arc(4.2, -1.2, 1.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  paintTimberTree(ctx, x, y, node) {
    const sway = (node.seed || node.column + node.row) % 2 === 0 ? -1 : 1;
    const tree = pickSprite((node.column + 1) * 13 + node.row * 7, ["pineTree", "greenTree", "autumnTree"]);

    ctx.save();
    if (this.spriteAtlas?.draw(ctx, tree, x, y + 22, { size: 62, anchorY: 1 })) {
      ctx.restore();
      return;
    }

    ctx.fillStyle = "rgba(25, 18, 13, 0.24)";
    ctx.beginPath();
    ctx.ellipse(x, y + 12, 22, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#6e3b22";
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, y + 9);
    ctx.quadraticCurveTo(x + sway, y - 8, x - sway * 2, y - 24);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255, 214, 150, 0.28)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 2, y + 6);
    ctx.quadraticCurveTo(x + 5, y - 8, x + 1, y - 21);
    ctx.stroke();

    this.paintCanopy(ctx, x - 10, y - 28, 16, "#345b3f", "#6fa060");
    this.paintCanopy(ctx, x + 8, y - 31, 17, "#2f5339", "#7fb36b");
    this.paintCanopy(ctx, x, y - 42, 16, "#3f7046", "#8bbd70");

    ctx.fillStyle = "rgba(255, 244, 214, 0.86)";
    ctx.beginPath();
    ctx.moveTo(x + 12, y - 11);
    ctx.lineTo(x + 21, y - 15);
    ctx.lineTo(x + 18, y - 8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  paintCanopy(ctx, x, y, radius, shadow, light) {
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.arc(x - radius * 0.22, y - radius * 0.22, radius * 0.62, 0, Math.PI * 2);
    ctx.fill();
  }

  paintRockDeposit(ctx, x, y, node) {
    const rock = pickSprite((node.column + 3) * 17 + node.row * 5, ["stoneBlock", "darkOre", "blueCrystal"]);

    ctx.save();
    ctx.fillStyle = "rgba(25, 18, 13, 0.25)";
    ctx.beginPath();
    ctx.ellipse(x, y + 12, 23, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    if (this.spriteAtlas?.draw(ctx, rock, x, y + 24, { size: 54, anchorY: 1 })) {
      ctx.restore();
      return;
    }

    if (this.rockImage?.complete && this.rockImage.naturalWidth > 0) {
      ctx.drawImage(this.rockImage, x - 26, y - 34, 52, 52);
      ctx.restore();
      return;
    }

    const pulse = 0.9 + Math.sin(node.column * 0.7 + node.row) * 0.08;

    this.paintStone(ctx, x - 12, y + 1, 11 * pulse, "#6c7680", "#dfe9dc");
    this.paintStone(ctx, x + 10, y + 0, 12, "#515765", "#c6d0cc");
    this.paintStone(ctx, x - 2, y - 11, 13, "#758187", "#eef5e6");
    this.paintStone(ctx, x - 1, y + 8, 16, "#747d7c", "#e3ecd5");
    ctx.restore();
  }

  paintStone(ctx, x, y, radius, shadow, light) {
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.ellipse(x, y, radius, radius * 0.72, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.ellipse(x - radius * 0.24, y - radius * 0.2, radius * 0.42, radius * 0.25, -0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  paintBerryBush(ctx, x, y, node) {
    const plant = pickSprite((node.column + 5) * 11 + node.row * 3, ["redFlower", "bush", "purpleFlower"]);

    ctx.save();
    if (this.spriteAtlas?.draw(ctx, plant, x, y + 20, { size: 50, anchorY: 1 })) {
      ctx.restore();
      return;
    }

    ctx.fillStyle = "rgba(25, 18, 13, 0.22)";
    ctx.beginPath();
    ctx.ellipse(x, y + 10, 20, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#365f38";
    ctx.beginPath();
    ctx.ellipse(x - 9, y, 12, 12, -0.35, 0, Math.PI * 2);
    ctx.ellipse(x + 8, y, 13, 13, 0.32, 0, Math.PI * 2);
    ctx.ellipse(x, y - 9, 12, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#78a95e";
    ctx.beginPath();
    ctx.ellipse(x - 4, y - 5, 13, 10, -0.2, 0, Math.PI * 2);
    ctx.ellipse(x + 6, y - 8, 12, 9, 0.25, 0, Math.PI * 2);
    ctx.fill();

    for (let i = 0; i < 10; i += 1) {
      const angle = i * 2.13 + node.column * 0.1;
      const radius = 4 + (i % 4) * 3;
      const berryX = x + Math.cos(angle) * radius;
      const berryY = y - 6 + Math.sin(angle) * radius * 0.72;

      ctx.fillStyle = "#74122f";
      ctx.beginPath();
      ctx.arc(berryX + 1, berryY + 1.5, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e73564";
      ctx.beginPath();
      ctx.arc(berryX, berryY, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 236, 214, 0.7)";
      ctx.beginPath();
      ctx.arc(berryX - 0.9, berryY - 1, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
