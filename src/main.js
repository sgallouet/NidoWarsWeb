import { Game } from "./core/Game.js";
import { GAME_CONFIG } from "./config/gameConfig.js";
import { setupFullscreenButton } from "./ui/FullscreenButton.js";

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

game.start();
