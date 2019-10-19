import * as main from "../util/main";
import * as view from "../util/view";
import * as text from "../util/text";
import { Terminal } from "../util/terminal";
import * as input from "../util/input";
import * as actor from "../util/actor";
import { Vector } from "../util/vector";
import * as sound from "sounds-some-sounds";

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
  terminal = new Terminal({ x: 25, y: 18 });
  actor.setActorClass(Actor);
  text.defineSymbols(charPatterns, "A");
  initInGame();
  //initTitle();
}

function update() {
  view.clear();
  terminal.clear();
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
  //actor.spawn(player);
}

function updateInGame() {
  /*if (ticks === 150) {
    sound.playBgm();
  }*/
}

const angleOffsets = [[1, 0], [0, 1], [-1, 0], [0, -1]];

function player(a: Actor) {}

class Actor extends actor.Actor {
  pos = new Vector();
  char = "A";
  rotation = "k";
  color = "w";
  animInterval = 30;
  animCount = 1;
  moveInterval = 20;
  moveTicks = 0;
  animIndex = 0;
  animIndexVel = 1;

  update() {
    super.update();
    terminal.print(" ", this.pos.x, this.pos.y);
    if (this.animCount >= 2 && this.ticks % this.animInterval === 0) {
      this.animIndex += this.animIndexVel;
      if (this.animIndex < 0 || this.animIndex >= this.animCount) {
        this.animIndexVel *= -1;
        this.animIndex += this.animIndexVel * 2;
      }
    }
    terminal.print(
      String.fromCharCode(this.char.charCodeAt(0) + this.animIndex),
      this.pos.x,
      this.pos.y,
      {
        color: this.color,
        symbol: "s",
        rotation: this.rotation
      }
    );
  }

  testCollision(aa: Actor) {
    return this.pos.x === aa.pos.x && this.pos.y === aa.pos.y;
  }
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

const charPatterns = [];
