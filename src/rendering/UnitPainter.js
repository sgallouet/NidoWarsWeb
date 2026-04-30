export class UnitPainter {
  constructor({ tileWidth, tileHeight }) {
    this.tileWidth = tileWidth;
    this.tileHeight = tileHeight;
  }

  paint(ctx, { unit, x, y, elapsed, dayNight }) {
    if (unit.isAwayOnQuest) {
      return;
    }

    const scale = unit.scale || 1;
    const nightAmount = dayNight?.nightAmount || 0;
    const carryingHeavy = hasCarriedLoad(unit);
    const strain = carryingHeavy ? Math.sin(elapsed * 0.014) * 2.4 : 0;
    const struggleTilt = carryingHeavy ? -0.08 + Math.sin(elapsed * 0.011) * 0.035 : 0;
    const bob = Math.sin(elapsed * 0.006 + unit.column * 0.4) * (carryingHeavy ? 2.1 : 1.4);
    const drawY = y + bob;

    this.paintGroundShadow(ctx, x, y, unit, scale);

    ctx.save();
    ctx.translate(x + strain, drawY);
    ctx.rotate(struggleTilt);
    ctx.scale(scale, scale);
    this.paintUnitBody(ctx, unit, 0, 0, elapsed);
    if (unit.attackStyle === "ranged" && unit.attackFlashMs > 0) {
      this.paintArrowShot(ctx, unit);
    }
    if (unit.waveMs > 0) {
      this.paintGreetingWave(ctx, unit, elapsed);
    }
    if (unit.faction === "player" && nightAmount > 0.08) {
      this.paintTorch(ctx, 18, -31, elapsed, nightAmount);
    }
    ctx.restore();

    if (carryingHeavy) {
      this.paintStruggleMarks(ctx, x + 8 + strain, drawY - 42, elapsed);
    }

    if (unit.hitFlashMs > 0) {
      this.paintHitFlash(ctx, x + strain, drawY, unit, scale);
    }

    if (unit.carryingTreasureId) {
      this.paintCarriedTreasure(ctx, x - 19 + strain, drawY - 17);
    }

    if (unit.carryingHerbId) {
      this.paintCarriedHerbs(ctx, x - 17 + strain, drawY - 17);
    }

    if (unit.carryingResourceNodeId) {
      this.paintCarriedResource(ctx, x - 17 + strain, drawY - 17, unit.carryingResourceType);
    }

    if (unit.carryingMeatCorpseId) {
      this.paintCarriedResource(ctx, x - 17 + strain, drawY - 17, "meat");
    }

    if (unit.orderIcon) {
      this.paintOrderIcon(ctx, unit.orderIcon, x + 18, y - 50);
    }

    if (unit.speech) {
      this.paintSpeech(ctx, unit.speech.text, x, y - 70);
    }

    if (this.shouldPaintHealth(unit)) {
      this.paintHealthBar(ctx, unit, x, y - 58);
    }

    if (unit.combatText) {
      this.paintCombatText(ctx, unit.combatText, x, unit.speech ? y - 92 : y - 76);
    }
  }

  paintUnitBody(ctx, unit, x, y, elapsed) {
    const body = unit.body || unit.definition;

    if (body === "ranger") {
      this.paintRanger(ctx, x, y, unit, elapsed);
    } else if (body === "duneVanguard") {
      this.paintWarrior(ctx, x, y, unit);
    } else if (body === "duneSettler") {
      this.paintSettler(ctx, x, y, unit);
    } else if (body === "glassStalker") {
      this.paintGlassStalker(ctx, x, y, unit, elapsed);
    } else if (body === "thornback") {
      this.paintThornback(ctx, x, y, unit);
    } else if (body === "duneHare") {
      this.paintDuneHare(ctx, x, y, unit);
    } else if (body === "sunBird") {
      this.paintSunBird(ctx, x, y, unit, elapsed);
    } else {
      this.paintEmberMaw(ctx, x, y, unit);
    }
  }

  paintCorpse(ctx, { corpse, x, y, elapsed }) {
    const scale = corpse.scale || 1;
    const settle = Math.sin(elapsed * 0.001 + corpse.column) * 0.6;

    ctx.save();
    ctx.fillStyle = "rgba(18, 12, 10, 0.34)";
    ctx.beginPath();
    ctx.ellipse(x + 2, y + 10, 25 * scale, 9 * scale, -0.08, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.72;
    ctx.translate(x + settle, y + 5);
    ctx.rotate(Math.PI / 2 + 0.12);
    ctx.scale(scale * 0.78, scale * 0.78);
    this.paintUnitBody(ctx, corpse, 0, 0, elapsed);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = "rgba(255, 244, 214, 0.42)";
    ctx.lineWidth = 1.6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x - 10, y + 1);
    ctx.lineTo(x - 3, y + 8);
    ctx.moveTo(x - 3, y + 1);
    ctx.lineTo(x - 10, y + 8);
    ctx.stroke();
    ctx.restore();
  }

  paintGroundShadow(ctx, x, y, unit, scale) {
    ctx.save();
    ctx.fillStyle = "rgba(25, 18, 13, 0.34)";
    ctx.beginPath();
    ctx.ellipse(x + 2, y + 9, (unit.faction === "player" ? 18 : 22) * scale, 8 * scale, 0, 0, Math.PI * 2);
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

  paintRanger(ctx, x, y, unit, elapsed) {
    const { colors } = unit;
    const draw = unit.attackFlashMs > 0 ? Math.min(1, unit.attackFlashMs / 180) : 0;

    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    ctx.strokeStyle = "#5b3925";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x + 14, y - 24, 15 + draw * 3, -1.25, 1.15);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255, 244, 214, 0.82)";
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(x + 19 + draw * 2, y - 38);
    ctx.lineTo(x + 20 + draw * 5, y - 12);
    ctx.stroke();

    ctx.strokeStyle = "#e7c07a";
    ctx.lineWidth = 2.1;
    ctx.beginPath();
    ctx.moveTo(x + 8, y - 20);
    ctx.lineTo(x + 24 + draw * 9, y - 28);
    ctx.stroke();

    ctx.fillStyle = colors.shadow;
    ctx.beginPath();
    ctx.moveTo(x - 13, y - 11);
    ctx.lineTo(x - 2, y + 7);
    ctx.lineTo(x + 13, y - 9);
    ctx.lineTo(x + 2, y - 25);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = colors.primary;
    ctx.beginPath();
    ctx.roundRect(x - 9, y - 28, 18, 23, 7);
    ctx.fill();

    ctx.fillStyle = colors.secondary;
    ctx.beginPath();
    ctx.moveTo(x - 10, y - 24);
    ctx.lineTo(x + 9, y - 25);
    ctx.lineTo(x + 6, y - 17);
    ctx.lineTo(x - 7, y - 16);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#e4a86b";
    ctx.beginPath();
    ctx.arc(x, y - 35, 7.7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = colors.accent;
    ctx.beginPath();
    ctx.moveTo(x - 10, y - 38);
    ctx.lineTo(x + 2, y - 47);
    ctx.lineTo(x + 11, y - 37);
    ctx.lineTo(x, y - 31);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#3c2b1e";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 4, y - 7);
    ctx.lineTo(x - 11, y + 6);
    ctx.moveTo(x + 5, y - 7);
    ctx.lineTo(x + 13, y + 5);
    ctx.moveTo(x - 9, y - 19);
    ctx.lineTo(x - 18, y - 10);
    ctx.moveTo(x + 9, y - 19);
    ctx.lineTo(x + 21 + draw * 4, y - 27);
    ctx.stroke();

    ctx.fillStyle = "#182624";
    ctx.fillRect(x + 2, y - 36, 2, 2);
    ctx.restore();
  }

  paintArrowShot(ctx, unit) {
    const vector = unit.attackVector || { column: 1, row: 0 };
    const isoX = (vector.column - vector.row) * (this.tileWidth / 2);
    const isoY = (vector.column + vector.row) * (this.tileHeight / 2);
    const length = Math.max(1, Math.hypot(isoX, isoY));
    const progress = 1 - Math.max(0, Math.min(1, unit.attackFlashMs / 260));
    const startX = 18;
    const startY = -29;
    const endX = startX + (isoX / length) * (38 + progress * 34);
    const endY = startY + (isoY / length) * (22 + progress * 22);

    ctx.save();
    ctx.globalAlpha = 1 - progress * 0.35;
    ctx.strokeStyle = "rgba(255, 242, 176, 0.92)";
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    ctx.fillStyle = "#fff0a6";
    ctx.beginPath();
    ctx.arc(endX, endY, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  paintTorch(ctx, x, y, elapsed, nightAmount) {
    const flame = 1 + Math.sin(elapsed * 0.022) * 0.12;

    ctx.save();
    ctx.strokeStyle = "#5f3a22";
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x - 5, y + 12);
    ctx.lineTo(x + 4, y - 8);
    ctx.stroke();

    ctx.globalAlpha = Math.min(1, 0.42 + nightAmount * 0.5);
    ctx.fillStyle = "#ffd66e";
    ctx.beginPath();
    ctx.moveTo(x + 5, y - 20 * flame);
    ctx.bezierCurveTo(x - 5, y - 12, x + 1, y - 4, x + 5, y - 5);
    ctx.bezierCurveTo(x + 13, y - 10, x + 10, y - 16, x + 5, y - 20 * flame);
    ctx.fill();

    ctx.fillStyle = "#ff783e";
    ctx.beginPath();
    ctx.moveTo(x + 5, y - 15 * flame);
    ctx.bezierCurveTo(x, y - 10, x + 3, y - 5, x + 6, y - 6);
    ctx.bezierCurveTo(x + 10, y - 9, x + 8, y - 13, x + 5, y - 15 * flame);
    ctx.fill();
    ctx.restore();
  }

  paintGreetingWave(ctx, unit, elapsed) {
    const wave = Math.sin(elapsed * 0.018 + unit.column) * 0.5 + 0.5;
    const side = unit.role === "Warrior" ? -1 : 1;

    ctx.save();
    ctx.strokeStyle = "#f0b875";
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(side * 8, -23);
    ctx.lineTo(side * (17 + wave * 4), -36 - wave * 6);
    ctx.lineTo(side * (22 + wave * 2), -32 - wave * 2);
    ctx.moveTo(side * (18 + wave * 4), -37 - wave * 6);
    ctx.lineTo(side * (21 + wave * 6), -42 - wave * 5);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255, 226, 142, 0.62)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(side * 23, -39, 6 + wave * 2, -0.5, 0.8);
    ctx.stroke();
    ctx.restore();
  }

  paintSettler(ctx, x, y, unit) {
    const { colors } = unit;

    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    ctx.fillStyle = colors.shadow;
    ctx.beginPath();
    ctx.moveTo(x - 12, y - 11);
    ctx.lineTo(x - 3, y + 7);
    ctx.lineTo(x + 12, y - 8);
    ctx.lineTo(x + 2, y - 24);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = colors.primary;
    ctx.beginPath();
    ctx.roundRect(x - 8, y - 27, 16, 22, 7);
    ctx.fill();

    ctx.fillStyle = colors.secondary;
    ctx.beginPath();
    ctx.moveTo(x - 8, y - 22);
    ctx.lineTo(x + 8, y - 21);
    ctx.lineTo(x + 5, y - 14);
    ctx.lineTo(x - 5, y - 14);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#e4a86b";
    ctx.beginPath();
    ctx.arc(x, y - 34, 7.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = colors.accent;
    ctx.beginPath();
    ctx.moveTo(x - 9, y - 37);
    ctx.lineTo(x + 4, y - 43);
    ctx.lineTo(x + 9, y - 34);
    ctx.lineTo(x - 3, y - 30);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#3c2b1e";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 4, y - 7);
    ctx.lineTo(x - 10, y + 6);
    ctx.moveTo(x + 4, y - 7);
    ctx.lineTo(x + 10, y + 5);
    ctx.moveTo(x - 11, y - 18);
    ctx.lineTo(x - 20, y - 9);
    ctx.moveTo(x + 10, y - 17);
    ctx.lineTo(x + 18, y - 9);
    ctx.stroke();

    ctx.fillStyle = "#182624";
    ctx.fillRect(x + 2, y - 35, 2, 2);
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

  paintCarriedHerbs(ctx, x, y) {
    ctx.save();
    ctx.strokeStyle = "#4e8a4f";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    for (let i = 0; i < 5; i += 1) {
      const angle = -Math.PI / 2 + (i - 2) * 0.2;

      ctx.beginPath();
      ctx.moveTo(x, y + 7);
      ctx.lineTo(x + Math.cos(angle) * 8, y + 7 + Math.sin(angle) * 12);
      ctx.stroke();
    }
    ctx.fillStyle = "#cce68a";
    ctx.beginPath();
    ctx.arc(x + 4, y - 5, 2.4, 0, Math.PI * 2);
    ctx.arc(x - 3, y - 4, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  paintCarriedResource(ctx, x, y, type) {
    if (type === "fish") {
      ctx.save();
      ctx.fillStyle = "#8fe8ef";
      ctx.beginPath();
      ctx.ellipse(x, y, 8, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x - 7, y);
      ctx.lineTo(x - 13, y - 5);
      ctx.lineTo(x - 12, y + 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      return;
    }

    if (type === "meat") {
      ctx.save();
      ctx.fillStyle = "#d94e3f";
      ctx.beginPath();
      ctx.ellipse(x - 2, y + 1, 8, 6, -0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff0c6";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x + 4, y - 2);
      ctx.lineTo(x + 12, y - 9);
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (type === "wood") {
      ctx.save();
      ctx.strokeStyle = "#d79a50";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x - 8, y + 3);
      ctx.lineTo(x + 8, y - 5);
      ctx.moveTo(x - 6, y - 4);
      ctx.lineTo(x + 10, y + 3);
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (type === "rock") {
      ctx.save();
      ctx.fillStyle = "#737d83";
      ctx.beginPath();
      ctx.ellipse(x - 4, y + 2, 6, 4.5, -0.25, 0, Math.PI * 2);
      ctx.ellipse(x + 5, y + 1, 6, 4.8, 0.18, 0, Math.PI * 2);
      ctx.ellipse(x, y - 4, 5.5, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#dbe4d7";
      ctx.beginPath();
      ctx.ellipse(x - 2, y - 5, 2.2, 1.2, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.fillStyle = "#4e8a4f";
    ctx.beginPath();
    ctx.roundRect(x - 7, y - 6, 14, 12, 3);
    ctx.fill();
    ctx.fillStyle = "#e0527e";
    ctx.beginPath();
    ctx.arc(x - 3, y - 2, 2, 0, Math.PI * 2);
    ctx.arc(x + 3, y + 1, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  paintStruggleMarks(ctx, x, y, elapsed) {
    const pulse = Math.sin(elapsed * 0.018) * 0.5 + 0.5;

    ctx.save();
    ctx.globalAlpha = 0.48 + pulse * 0.34;
    ctx.strokeStyle = "#8fe8ef";
    ctx.lineWidth = 1.6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 4, y - 5, x + 1, y - 10);
    ctx.moveTo(x + 7, y + 5);
    ctx.quadraticCurveTo(x + 11, y, x + 8, y - 5);
    ctx.stroke();
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
    } else if (icon === "gold") {
      ctx.fillStyle = "#f1c65b";
      ctx.strokeStyle = "#7b4828";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#fff0a6";
      ctx.beginPath();
      ctx.arc(x - 2, y - 2, 2, 0, Math.PI * 2);
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
    } else if (icon === "alert") {
      ctx.font = "900 17px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("!", x, y + 1);
    } else if (icon === "rest") {
      ctx.font = "900 13px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Z", x - 2, y - 2);
      ctx.font = "900 9px Inter, system-ui, sans-serif";
      ctx.fillText("z", x + 5, y + 5);
    } else if (icon === "herb") {
      ctx.strokeStyle = "#cce68a";
      ctx.lineWidth = 1.8;
      for (let i = 0; i < 4; i += 1) {
        const angle = -Math.PI / 2 + (i - 1.5) * 0.28;

        ctx.beginPath();
        ctx.moveTo(x, y + 6);
        ctx.lineTo(x + Math.cos(angle) * 8, y + 6 + Math.sin(angle) * 10);
        ctx.stroke();
      }
    } else if (icon === "fish") {
      ctx.fillStyle = "#8fe8ef";
      ctx.beginPath();
      ctx.ellipse(x, y, 7, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x - 6, y);
      ctx.lineTo(x - 11, y - 4);
      ctx.lineTo(x - 10, y + 4);
      ctx.closePath();
      ctx.fill();
    } else if (icon === "berries") {
      ctx.fillStyle = "#7fb060";
      ctx.beginPath();
      ctx.arc(x - 2, y, 5, 0, Math.PI * 2);
      ctx.arc(x + 4, y - 1, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e0527e";
      ctx.beginPath();
      ctx.arc(x - 3, y - 2, 2, 0, Math.PI * 2);
      ctx.arc(x + 4, y + 1, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (icon === "wood") {
      ctx.strokeStyle = "#d79a50";
      ctx.lineWidth = 2.8;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x - 8, y + 4);
      ctx.lineTo(x + 8, y - 4);
      ctx.moveTo(x - 6, y - 3);
      ctx.lineTo(x + 9, y + 4);
      ctx.stroke();
    } else if (icon === "rock") {
      ctx.fillStyle = "#aebbb5";
      ctx.beginPath();
      ctx.ellipse(x - 3, y + 2, 5, 3.8, -0.18, 0, Math.PI * 2);
      ctx.ellipse(x + 4, y + 1, 5, 4, 0.18, 0, Math.PI * 2);
      ctx.ellipse(x, y - 4, 4.7, 3.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#56606d";
      ctx.beginPath();
      ctx.ellipse(x + 1, y + 4, 5.8, 2.8, 0.1, 0, Math.PI * 2);
      ctx.fill();
    } else if (icon === "meat") {
      ctx.fillStyle = "#d94e3f";
      ctx.beginPath();
      ctx.ellipse(x - 2, y + 2, 7, 5, -0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff0c6";
      ctx.lineWidth = 2.4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x + 4, y - 2);
      ctx.lineTo(x + 10, y - 8);
      ctx.stroke();
    } else if (icon === "build") {
      ctx.strokeStyle = "#f4db9a";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x - 7, y + 6);
      ctx.lineTo(x, y - 6);
      ctx.lineTo(x + 7, y + 6);
      ctx.moveTo(x - 4, y + 6);
      ctx.lineTo(x + 4, y + 6);
      ctx.stroke();
    } else if (icon === "clean") {
      ctx.strokeStyle = "#f4db9a";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x - 6, y + 6);
      ctx.lineTo(x + 5, y - 6);
      ctx.moveTo(x + 2, y - 7);
      ctx.lineTo(x + 8, y - 1);
      ctx.moveTo(x - 8, y + 6);
      ctx.lineTo(x - 3, y + 10);
      ctx.stroke();
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

  paintHitFlash(ctx, x, y, unit, scale) {
    const alpha = Math.min(0.78, (unit.hitFlashMs || 0) / 180);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = unit.faction === "player" ? "#ff705d" : "#fff0a6";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y - 20 * scale, 21 * scale, 18 * scale, -0.08, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  shouldPaintHealth(unit) {
    return (
      !unit.decorative &&
      unit.maxHealth > 1 &&
      (unit.health < unit.maxHealth || unit.order === "attack" || unit.order === "recover")
    );
  }

  paintHealthBar(ctx, unit, x, y) {
    const width = unit.faction === "player" ? 28 : 31;
    const height = 4;
    const ratio = Math.max(0, Math.min(1, unit.health / unit.maxHealth));
    const fillColor = ratio > 0.55 ? "#83e05f" : ratio > 0.28 ? "#f1c65b" : "#ff705d";

    ctx.save();
    ctx.fillStyle = "rgba(15, 14, 12, 0.72)";
    ctx.beginPath();
    ctx.roundRect(x - width / 2, y, width, height, 3);
    ctx.fill();

    ctx.fillStyle = fillColor;
    ctx.beginPath();
    ctx.roundRect(x - width / 2, y, width * ratio, height, 3);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 244, 214, 0.55)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.roundRect(x - width / 2, y, width, height, 3);
    ctx.stroke();
    ctx.restore();
  }

  paintCombatText(ctx, combatText, x, y) {
    const progress = 1 - combatText.remainingMs / combatText.durationMs;
    const alpha = Math.max(0, Math.min(1, combatText.remainingMs / combatText.durationMs));
    const toneColors = {
      damage: "#ff705d",
      heavyDamage: "#ff3f32",
      heal: "#a9f06f",
      resource: "#fff3bd",
    };
    const hasIcon = Boolean(combatText.resourceType);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = "900 12px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(18, 14, 11, 0.82)";
    ctx.fillStyle = toneColors[combatText.tone] || "#fff3bd";
    if (hasIcon) {
      this.paintResourceTextIcon(ctx, combatText.resourceType, x - 16, y - progress * 13);
    }
    ctx.strokeText(combatText.text, hasIcon ? x + 6 : x, y - progress * 13);
    ctx.fillText(combatText.text, hasIcon ? x + 6 : x, y - progress * 13);
    ctx.restore();
  }

  paintResourceTextIcon(ctx, type, x, y) {
    if (type === "gold") {
      ctx.save();
      ctx.fillStyle = "#f1c65b";
      ctx.strokeStyle = "#7b4828";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#fff3bd";
      ctx.beginPath();
      ctx.arc(x - 2, y - 2, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    if (type === "herb") {
      this.paintCarriedHerbs(ctx, x, y + 2);
      return;
    }

    this.paintCarriedResource(ctx, x, y + 1, type);
  }

  paintDuneHare(ctx, x, y, unit) {
    const { colors } = unit;

    ctx.save();
    ctx.fillStyle = colors.shadow;
    ctx.beginPath();
    ctx.ellipse(x, y - 8, 18, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = colors.primary;
    ctx.beginPath();
    ctx.ellipse(x, y - 17, 16, 11, -0.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = colors.secondary;
    ctx.beginPath();
    ctx.ellipse(x - 7, y - 31, 4, 14, -0.22, 0, Math.PI * 2);
    ctx.ellipse(x + 4, y - 32, 4, 15, 0.18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = colors.accent;
    ctx.beginPath();
    ctx.arc(x + 8, y - 19, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  paintSunBird(ctx, x, y, unit, elapsed) {
    const { colors } = unit;
    const flap = Math.sin(elapsed * 0.012) * 4;

    ctx.save();
    ctx.fillStyle = "rgba(25, 18, 13, 0.18)";
    ctx.beginPath();
    ctx.ellipse(x, y + 5, 13, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = colors.secondary;
    ctx.beginPath();
    ctx.moveTo(x - 4, y - 18);
    ctx.lineTo(x - 24, y - 25 - flap);
    ctx.lineTo(x - 9, y - 9);
    ctx.closePath();
    ctx.moveTo(x + 4, y - 18);
    ctx.lineTo(x + 24, y - 25 + flap);
    ctx.lineTo(x + 9, y - 9);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = colors.primary;
    ctx.beginPath();
    ctx.ellipse(x, y - 15, 10, 13, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = colors.accent;
    ctx.beginPath();
    ctx.moveTo(x, y - 29);
    ctx.lineTo(x + 5, y - 21);
    ctx.lineTo(x - 5, y - 21);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function hasCarriedLoad(unit) {
  return Boolean(
    unit.carryingTreasureId || unit.carryingHerbId || unit.carryingResourceNodeId || unit.carryingMeatCorpseId,
  );
}
