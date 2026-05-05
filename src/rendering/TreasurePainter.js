export class TreasurePainter {
  paint(ctx, { treasure, x, y, elapsed }) {
    if (treasure?.category === "loot") {
      this.paintLootDrop(ctx, { treasure, x, y, elapsed });
      return;
    }

    const glint = Math.sin(elapsed * 0.006 + x * 0.02) * 0.25 + 0.5;

    ctx.save();
    ctx.fillStyle = "rgba(42, 26, 10, 0.28)";
    ctx.beginPath();
    ctx.ellipse(x + 1, y + 7, 15, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#7b4828";
    ctx.beginPath();
    ctx.roundRect(x - 12, y - 10, 24, 18, 4);
    ctx.fill();

    ctx.fillStyle = "#b56d31";
    ctx.fillRect(x - 11, y - 8, 22, 6);

    ctx.fillStyle = "#f1c85b";
    ctx.fillRect(x - 2, y - 10, 4, 18);
    ctx.fillRect(x - 12, y - 2, 24, 4);

    ctx.fillStyle = `rgba(255, 246, 178, ${glint})`;
    ctx.beginPath();
    ctx.moveTo(x + 8, y - 17);
    ctx.lineTo(x + 12, y - 10);
    ctx.lineTo(x + 5, y - 11);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  paintLootDrop(ctx, { treasure, x, y, elapsed }) {
    const age = treasure.ageMs || 0;
    const progress = Math.min(1, age / 520);
    const ease = easeOutBack(progress);
    const sparkle = Math.sin(elapsed * 0.014 + (treasure.burstSeed || 0) * 10) * 0.5 + 0.5;
    const popY = (1 - ease) * -24;
    const shadowScale = 0.55 + ease * 0.45;

    ctx.save();
    ctx.fillStyle = `rgba(30, 18, 9, ${0.14 + 0.22 * ease})`;
    ctx.beginPath();
    ctx.ellipse(x + 1, y + 8, 19 * shadowScale, 7 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(x, y + popY);
    ctx.scale(0.68 + ease * 0.32, 0.68 + ease * 0.32);

    this.paintCoinStack(ctx, -9, 4, elapsed);
    this.paintCoinStack(ctx, 4, 6, elapsed + 190);

    if (treasure.items?.length > 0) {
      const item = treasure.items[0];

      if (item.kind === "weapon") {
        this.paintDroppedWeapon(ctx, 8, -6, item);
      } else {
        this.paintDroppedArtifact(ctx, 8, -8, item, sparkle);
      }
    }

    for (let i = 0; i < 4; i += 1) {
      const phase = (age * 0.0028 + i * 0.22 + (treasure.burstSeed || 0)) % 1;
      const alpha = Math.max(0, 1 - phase) * 0.74;
      const angle = -Math.PI / 2 + i * 0.58;
      const distance = 9 + phase * 22;

      ctx.fillStyle = `rgba(255, 239, 168, ${alpha})`;
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * distance, -8 + Math.sin(angle) * distance * 0.55, 1.9, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  paintCoinStack(ctx, x, y, elapsed) {
    const glint = Math.sin(elapsed * 0.018 + x) * 0.5 + 0.5;

    ctx.save();
    ctx.fillStyle = "#8e5727";
    ctx.beginPath();
    ctx.ellipse(x, y + 5, 8, 3.4, 0, 0, Math.PI * 2);
    ctx.fill();

    for (let i = 0; i < 4; i += 1) {
      ctx.fillStyle = i % 2 === 0 ? "#f1c65b" : "#dca648";
      ctx.strokeStyle = "#7b4828";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.ellipse(x, y + 3 - i * 2.2, 7.2, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.fillStyle = `rgba(255, 248, 180, ${0.35 + glint * 0.45})`;
    ctx.beginPath();
    ctx.arc(x - 2.5, y - 5, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  paintDroppedWeapon(ctx, x, y, item) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.72);
    ctx.strokeStyle = getItemGlow(item);
    ctx.lineWidth = 5;
    ctx.globalAlpha = 0.34;
    ctx.beginPath();
    ctx.moveTo(-13, 0);
    ctx.lineTo(15, 0);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "#dfe8dc";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-12, 0);
    ctx.lineTo(13, 0);
    ctx.stroke();
    ctx.strokeStyle = "#7b4828";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-12, 0);
    ctx.lineTo(-5, 0);
    ctx.stroke();
    ctx.fillStyle = getItemGlow(item);
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(7, -4);
    ctx.lineTo(8, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  paintDroppedArtifact(ctx, x, y, item, sparkle) {
    ctx.save();
    ctx.translate(x, y + Math.sin(sparkle * Math.PI * 2) * 1.5);
    ctx.fillStyle = getItemGlow(item);
    ctx.strokeStyle = "#fff3bd";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(9, -2);
    ctx.lineTo(4, 10);
    ctx.lineTo(-7, 8);
    ctx.lineTo(-10, -3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = 0.42 + sparkle * 0.34;
    ctx.strokeStyle = getItemGlow(item);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 8, -0.2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function getItemGlow(item) {
  if (item?.tone === "frost") {
    return "#8fe8ef";
  }

  if (item?.tone === "wild") {
    return "#a9f06f";
  }

  if (item?.tone === "arcane") {
    return "#b9c2ff";
  }

  if (item?.tone === "gold") {
    return "#fff0a6";
  }

  return "#ffb35c";
}

function easeOutBack(value) {
  const overshoot = 1.55;
  const shifted = value - 1;

  return 1 + (overshoot + 1) * shifted * shifted * shifted + overshoot * shifted * shifted;
}
