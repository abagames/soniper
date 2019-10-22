import * as level from "./level";
import * as charPatterns from "./charPatterns";
import * as main from "../util/main";
import * as view from "../util/view";
import * as text from "../util/text";
import { Terminal } from "../util/terminal";
import * as pointer from "../util/pointer";
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
let cursorPos = new Vector();
let prevCursorPos = new Vector();
let isCrateClicked: boolean;
let crateClickedPos = new Vector();
let isValidPos: boolean;
let cratePath: number[];

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
  level.terminal.draw();
  updateFunc[state]();
  actor.update();
  terminal.draw();
  ticks++;
}

function initInGame() {
  //sound.playJingle("l");
  state = "inGame";
  actor.reset();
  ticks = 0;
  isCrateClicked = false;
  isValidPos = false;
  prevCursorPos.set(-1);
  level.start(0);
  //actor.spawn(player);
}

function updateInGame() {
  cursorPos
    .set(pointer.pos)
    .div(6)
    .floor();
  if (cursorPos.isInRect(0, 0, terminalSize.x, terminalSize.y)) {
    const g = level.grid[cursorPos.x][cursorPos.y];
    if (isCrateClicked) {
      if (!prevCursorPos.equals(cursorPos)) {
        cratePath = level.getPath(crateClickedPos, cursorPos);
        isValidPos = cratePath != null;
        prevCursorPos.set(cursorPos);
      }
      const cc = isValidPos ? "H" : "I";
      text.print(cc, cursorPos.x * 6, cursorPos.y * 6, { symbol: "s" });
      if (pointer.isJustReleased) {
        console.log(cratePath);
        isCrateClicked = false;
      }
    } else {
      if (!prevCursorPos.equals(cursorPos)) {
        isValidPos =
          (g === "crate" || g === "crate on dot") &&
          level.getMovableAngles(cursorPos).length > 0;
        prevCursorPos.set(cursorPos);
      }
      const cc = isValidPos ? "H" : "I";
      text.print(cc, cursorPos.x * 6, cursorPos.y * 6, { symbol: "s" });
      if (isValidPos && pointer.isJustPressed) {
        crateClickedPos.set(cursorPos);
        isCrateClicked = true;
      }
    }
  }
  if (isCrateClicked) {
    text.print("G", crateClickedPos.x * 6, crateClickedPos.y * 6, {
      symbol: "s"
    });
  }
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
  if (pointer.isJustPressed) {
    initInGame();
  }
}

function initGameOver() {
  sound.stopBgm();
  state = "gameOver";
  pointer.clearJustPressed();
  ticks = 0;
}

function updateGameOver() {
  terminal.print(" GAME OVER ", 4, 3, { color: "l", backgroundColor: "w" });
  if (ticks > 20 && pointer.isJustPressed) {
    initInGame();
  } else if (ticks > 300) {
    initTitle();
  }
}
