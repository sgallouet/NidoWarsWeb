import { Game } from "./core/Game.js";
import { GAME_CONFIG } from "./config/gameConfig.js";
import { setupFullscreenButton } from "./ui/FullscreenButton.js";

installCanvasRoundRectFallback();

const canvas = document.querySelector("#game-canvas");
const root = document.querySelector("[data-app-root]");
const fullscreenButton = document.querySelector('[data-ui="fullscreen"]');

const game = new Game({
  canvas,
  root,
  config: GAME_CONFIG,
});

setupFullscreenButton({
  button: fullscreenButton,
  target: root,
});

game.start().catch((error) => {
  console.error(error);
});

function installCanvasRoundRectFallback() {
  if (
    typeof CanvasRenderingContext2D === "undefined" ||
    typeof CanvasRenderingContext2D.prototype.roundRect === "function"
  ) {
    return;
  }

  CanvasRenderingContext2D.prototype.roundRect = function roundRect(x, y, width, height, radius = 0) {
    const r = Math.max(0, Math.min(Number(radius) || 0, Math.abs(width) / 2, Math.abs(height) / 2));
    const right = x + width;
    const bottom = y + height;

    this.moveTo(x + r, y);
    this.lineTo(right - r, y);
    this.quadraticCurveTo(right, y, right, y + r);
    this.lineTo(right, bottom - r);
    this.quadraticCurveTo(right, bottom, right - r, bottom);
    this.lineTo(x + r, bottom);
    this.quadraticCurveTo(x, bottom, x, bottom - r);
    this.lineTo(x, y + r);
    this.quadraticCurveTo(x, y, x + r, y);
  };
}
