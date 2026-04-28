import { Game } from "./core/Game.js";
import { GAME_CONFIG } from "./config/gameConfig.js";

const canvas = document.querySelector("#game-canvas");
const root = document.querySelector("[data-app-root]");

const game = new Game({
  canvas,
  root,
  config: GAME_CONFIG,
});

game.start();
