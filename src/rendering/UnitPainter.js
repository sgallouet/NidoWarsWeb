export class UnitPainter {
  constructor({ tileWidth, tileHeight }) {
    this.tileWidth = tileWidth;
    this.tileHeight = tileHeight;
  }

  paint(ctx, { unit, x, y, elapsed }) {
    const strain = unit.carryingTreasureId ? Math.sin(elapsed * 0.014) * 2.4 : 0;
    const bob = Math.sin(elapsed * 0.006 + unit.column * 0.4) * (unit.carryingTreasureId ? 2.1 : 1.4);
    const drawY = y + bob;

    this.paintGroundShadow(ctx, x, y, unit);

    if (unit.definition === "duneVanguard") {
      this.paintWarrior(ctx, x + strain, drawY, unit);
    } else if (unit.definition === "glassStalker") {
      this.paintGlassStalker(ctx, x, drawY, unit, elapsed);
    } else if (unit.definition === "thornback") {
      this.paintThornback(ctx, x, drawY, unit);
    } else {
      this.paintEmberMaw(ctx, x, drawY, unit);
    }

    if (unit.carryingTreasureId) {
      this.paintCarriedTreasure(ctx, x - 19 + strain, drawY - 17);
    }

    if (unit.orderIcon) {
      this.paintOrderIcon(ctx, unit.orderIcon, x + 18, y - 50);
    }

    if (unit.speech) {
      this.paintSpeech(ctx, unit.speech.text, x, y - 70);
    }
  }

  paintGroundShadow(ctx, x, y, unit) {
    ctx.save();
    ctx.fillStyle = "rgba(25, 18, 13, 0.34)";
    ctx.beginPath();
    ctx.ellipse(x + 2, y + 9, unit.faction === "player" ? 18 : 22, 8, 0, 0, Math.PI * 2);
    ctx.fill();

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

  paintCarriedTreasure(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.08);
    ctx.fillStyle = "#7b4828";
    ctx.beginPath();
    ctx.roundRect(-9, -6, 18, 13, 3);
    ctx.fill();
    ctx.fillStyle = "#f1c85b";
    ctx.fillRect(-1, -7, 3, 15);
    ctx.fillRect(-9, -1, 18, 3);
    ctx.restore();
  }

  paintOrderIcon(ctx, icon, x, y) {
    ctx.save();
    ctx.fillStyle = "rgba(24, 21, 16, 0.82)";
    ctx.strokeStyle = "rgba(255, 244, 214, 0.74)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(x, y, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#fff3bd";
    ctx.strokeStyle = "#fff3bd";
    ctx.lineWidth = 1.8;

    if (icon === "eye") {
      ctx.beginPath();
      ctx.ellipse(x, y, 7, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#173e42";
      ctx.beginPath();
      ctx.arc(x, y, 2.3, 0, Math.PI * 2);
      ctx.fill();
    } else if (icon === "muscle") {
      ctx.beginPath();
      ctx.arc(x - 2, y + 1, 5, 0.2, Math.PI * 1.6);
      ctx.stroke();
      ctx.fillRect(x + 2, y - 3, 5, 5);
    } else if (icon === "shield") {
      ctx.beginPath();
      ctx.moveTo(x, y - 7);
      ctx.lineTo(x + 7, y - 3);
      ctx.lineTo(x + 4, y + 7);
      ctx.lineTo(x, y + 9);
      ctx.lineTo(x - 4, y + 7);
      ctx.lineTo(x - 7, y - 3);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x - 2.5, y - 1.5, 1, 0, Math.PI * 2);
      ctx.arc(x + 2.5, y - 1.5, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y + 1, 3.8, 0.1, Math.PI - 0.1);
      ctx.stroke();
    }

    ctx.restore();
  }

  paintSpeech(ctx, text, x, y) {
    ctx.save();
    ctx.font = "700 11px Inter, system-ui, sans-serif";
    const width = Math.ceil(ctx.measureText(text).width) + 16;

    ctx.fillStyle = "rgba(24, 21, 16, 0.9)";
    ctx.strokeStyle = "rgba(255, 244, 214, 0.62)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x - width / 2, y - 15, width, 21, 7);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#fff3bd";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x, y - 4);
    ctx.restore();
  }
}
