export class TreasurePainter {
  paint(ctx, { x, y, elapsed }) {
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
}
