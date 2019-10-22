import * as level from "./level";
import * as charPatterns from "./charPatterns";
import * as main from "../util/main";
import * as view from "../util/view";
import * as text from "../util/text";
import { Terminal } from "../util/terminal";
import * as input from "../util/input";
import * as actor from "../util/actor";
import * as sound from "sounds-some-sounds";
import { Vector } from "../util/vector";

export const terminalSize = new Vector(25, 18);
type State = "title" | "inGame" | "gameOver";
let state: State;
let updateFunc = {
  title: updateTitle,
  inGame: updateInGame,
  gameOver: updateGameOver
};
let ticks = 0;
let terminal: Terminal;

main.init(init, update, {
  viewSize: { x: 25 * 6, y: 18 * 6 },
  isUsingVirtualPad: false
});

function init() {
  sound.init(205);
  terminal = new Terminal(terminalSize);
  //actor.setActorClass(Actor);
  charPatterns.init();
  level.init();
  initInGame();
  //initTitle();
}

function update() {
  view.clear();
  updateFunc[state]();
  actor.update();
  level.terminal.draw();
  terminal.draw();
  ticks++;
}

function initInGame() {
  //sound.playJingle("l");
  state = "inGame";
  actor.reset();
  ticks = 0;
  level.start(0);
  //actor.spawn(player);
}

function updateInGame() {
  /*if (ticks === 150) {
    sound.playBgm();
  }*/
}

function initTitle() {
  state = "title";
  ticks = 0;
}

function updateTitle() {
  terminal.print(" SONIPER ", 5, 3, { color: "l", backgroundColor: "w" });
  if (ticks > 30) {
  }
  if (input.isJustPressed) {
    initInGame();
  }
}

function initGameOver() {
  sound.stopBgm();
  state = "gameOver";
  input.clearJustPressed();
  ticks = 0;
}

function updateGameOver() {
  terminal.print(" GAME OVER ", 4, 3, { color: "l", backgroundColor: "w" });
  if (ticks > 20 && input.isJustPressed) {
    initInGame();
  } else if (ticks > 300) {
    initTitle();
  }
}
