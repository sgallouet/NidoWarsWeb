export class UnitPainter {
  constructor({ tileWidth, tileHeight }) {
    this.tileWidth = tileWidth;
    this.tileHeight = tileHeight;
  }

  paint(ctx, { unit, x, y, elapsed, isSelected }) {
    const bob = Math.sin(elapsed * 0.006 + unit.column * 0.4) * 1.4;
    const drawY = y + bob;

    this.paintGroundShadow(ctx, x, y, unit, isSelected);

    if (unit.definition === "duneVanguard") {
      this.paintWarrior(ctx, x, drawY, unit);
      return;
    }

    if (unit.definition === "glassStalker") {
      this.paintGlassStalker(ctx, x, drawY, unit, elapsed);
      return;
    }

    if (unit.definition === "thornback") {
      this.paintThornback(ctx, x, drawY, unit);
      return;
    }

    this.paintEmberMaw(ctx, x, drawY, unit);
  }

  paintGroundShadow(ctx, x, y, unit, isSelected) {
    ctx.save();
    ctx.fillStyle = "rgba(25, 18, 13, 0.34)";
    ctx.beginPath();
    ctx.ellipse(x + 2, y + 9, unit.faction === "player" ? 18 : 22, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    if (isSelected) {
      ctx.strokeStyle = "rgba(130, 255, 236, 0.95)";
      ctx.lineWidth = 2.25;
      ctx.shadowColor = "rgba(73, 215, 194, 0.7)";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.ellipse(x, y + 8, 24, 11, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  paintWarrior(ctx, x, y, unit) {
    const { colors } = unit;

    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    ctx.strokeStyle = "#e9f4de";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(x + 10, y - 14);
    ctx.lineTo(x + 24, y - 32);
    ctx.stroke();

    ctx.fillStyle = colors.secondary;
    ctx.beginPath();
    ctx.moveTo(x + 20, y - 35);
    ctx.lineTo(x + 27, y - 34);
    ctx.lineTo(x + 23, y - 29);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = colors.shadow;
    ctx.beginPath();
    ctx.moveTo(x - 14, y - 12);
    ctx.lineTo(x - 2, y + 7);
    ctx.lineTo(x + 13, y - 9);
    ctx.lineTo(x + 1, y - 24);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = colors.primary;
    ctx.beginPath();
    ctx.roundRect(x - 9, y - 28, 18, 23, 8);
    ctx.fill();

    ctx.fillStyle = colors.secondary;
    ctx.beginPath();
    ctx.moveTo(x - 8, y - 25);
    ctx.lineTo(x + 9, y - 24);
    ctx.lineTo(x + 5, y - 17);
    ctx.lineTo(x - 6, y - 16);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#f0b875";
    ctx.beginPath();
    ctx.arc(x, y - 35, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = colors.accent;
    ctx.beginPath();
    ctx.moveTo(x - 8, y - 39);
    ctx.lineTo(x + 5, y - 45);
    ctx.lineTo(x + 10, y - 36);
    ctx.lineTo(x - 2, y - 31);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#182624";
    ctx.fillRect(x + 2, y - 36, 2, 2);

    ctx.fillStyle = "#173331";
    ctx.beginPath();
    ctx.ellipse(x - 12, y - 18, 8, 11, -0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#2a1c12";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 5, y - 7);
    ctx.lineTo(x - 11, y + 6);
    ctx.moveTo(x + 5, y - 7);
    ctx.lineTo(x + 13, y + 5);
    ctx.stroke();
    ctx.restore();
  }

  paintEmberMaw(ctx, x, y, unit) {
    const { colors } = unit;

    ctx.save();
    ctx.lineJoin = "round";

    ctx.fillStyle = colors.shadow;
    ctx.beginPath();
    ctx.ellipse(x + 1, y - 14, 22, 15, -0.08, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = colors.primary;
    ctx.beginPath();
    ctx.moveTo(x - 24, y - 12);
    ctx.quadraticCurveTo(x - 10, y - 33, x + 19, y - 27);
    ctx.quadraticCurveTo(x + 29, y - 18, x + 16, y - 7);
    ctx.quadraticCurveTo(x - 6, y + 2, x - 24, y - 12);
    ctx.fill();

    ctx.fillStyle = colors.secondary;
    ctx.beginPath();
    ctx.moveTo(x - 8, y - 29);
    ctx.lineTo(x - 2, y - 41);
    ctx.lineTo(x + 5, y - 27);
    ctx.closePath();
    ctx.moveTo(x + 9, y - 27);
    ctx.lineTo(x + 18, y - 38);
    ctx.lineTo(x + 18, y - 22);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = colors.accent;
    ctx.beginPath();
    ctx.arc(x + 11, y - 21, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#3a2019";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 15, y - 4);
    ctx.lineTo(x - 19, y + 5);
    ctx.moveTo(x + 3, y - 3);
    ctx.lineTo(x + 4, y + 7);
    ctx.moveTo(x + 17, y - 9);
    ctx.lineTo(x + 24, y + 1);
    ctx.stroke();
    ctx.restore();
  }

  paintGlassStalker(ctx, x, y, unit, elapsed) {
    const { colors } = unit;
    const glint = Math.sin(elapsed * 0.008) * 0.25 + 0.45;

    ctx.save();
    ctx.lineJoin = "round";

    ctx.fillStyle = colors.shadow;
    ctx.beginPath();
    ctx.ellipse(x, y - 14, 19, 14, 0.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = colors.primary;
    ctx.beginPath();
    ctx.moveTo(x - 19, y - 15);
    ctx.lineTo(x - 4, y - 33);
    ctx.lineTo(x + 18, y - 25);
    ctx.lineTo(x + 12, y - 9);
    ctx.lineTo(x - 11, y - 6);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = `rgba(128, 241, 228, ${glint})`;
    ctx.beginPath();
    ctx.moveTo(x - 4, y - 33);
    ctx.lineTo(x + 18, y - 25);
    ctx.lineTo(x + 2, y - 21);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = colors.secondary;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 18, y - 12);
    ctx.lineTo(x - 28, y - 3);
    ctx.moveTo(x - 2, y - 6);
    ctx.lineTo(x - 7, y + 7);
    ctx.moveTo(x + 12, y - 9);
    ctx.lineTo(x + 21, y + 2);
    ctx.stroke();
    ctx.restore();
  }

  paintThornback(ctx, x, y, unit) {
    const { colors } = unit;

    ctx.save();
    ctx.lineJoin = "round";

    ctx.fillStyle = colors.shadow;
    ctx.beginPath();
    ctx.ellipse(x, y - 11, 24, 13, -0.12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = colors.primary;
    ctx.beginPath();
    ctx.moveTo(x - 26, y - 11);
    ctx.quadraticCurveTo(x - 10, y - 30, x + 18, y - 24);
    ctx.quadraticCurveTo(x + 29, y - 13, x + 12, y - 4);
    ctx.quadraticCurveTo(x - 12, y + 2, x - 26, y - 11);
    ctx.fill();

    ctx.fillStyle = colors.secondary;
    for (let i = 0; i < 4; i += 1) {
      const spikeX = x - 12 + i * 10;

      ctx.beginPath();
      ctx.moveTo(spikeX - 4, y - 24);
      ctx.lineTo(spikeX, y - 38 + (i % 2) * 5);
      ctx.lineTo(spikeX + 5, y - 22);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = colors.accent;
    ctx.beginPath();
    ctx.arc(x + 13, y - 18, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#2d3b22";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 15, y - 2);
    ctx.lineTo(x - 20, y + 7);
    ctx.moveTo(x + 4, y - 2);
    ctx.lineTo(x + 4, y + 8);
    ctx.moveTo(x + 18, y - 7);
    ctx.lineTo(x + 24, y + 2);
    ctx.stroke();
    ctx.restore();
  }
}
