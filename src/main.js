import { Game } from "./core/Game.js";
import { GAME_CONFIG } from "./config/gameConfig.js";
import { createAppShell } from "./app/shell/createAppShell.js";
import { installCanvasRoundRectFallback } from "./common/canvas/installCanvasRoundRectFallback.js";
import { setupFullscreenButton } from "./ui/FullscreenButton.js";

installCanvasRoundRectFallback();

const root = createAppShell();
const canvas = root.querySelector("#game-canvas");
const fullscreenButton = root.querySelector('[data-ui="fullscreen"]');

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
