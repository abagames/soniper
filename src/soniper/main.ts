import * as level from "./level";
import * as generator from "./generator";
import * as charPatterns from "./charPatterns";
import * as button from "./button";
import { Button } from "./button";
import * as main from "../util/main";
import * as view from "../util/view";
import * as text from "../util/text";
import { Terminal } from "../util/terminal";
import * as pointer from "../util/pointer";
import { Vector, VectorLike } from "../util/vector";
import { Random } from "../util/random";
import { clamp } from "../util/math";
import * as sound from "sounds-some-sounds";

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
let moveAnimations: {
  type: "appear" | "disappear";
  char: "keeper" | "crate";
  pos: VectorLike;
  angle?: number;
}[][];
let moveAnimationTicks: number;
let levelCount: number;
let levelPartsSize = new Vector();
let levelGeneratingCount: number;
let levelGeneratingMaxCrateCount: number;
let levelGeneratingMaxCrateIndex: number;
const random = new Random();
let resetButton: Button;
let undoButton: Button;

main.init(init, update, {
  viewSize: { x: 25 * 6, y: 18 * 6 },
  isUsingVirtualPad: false
});

function init() {
  sound.init(205);
  terminal = new Terminal(terminalSize);
  charPatterns.init();
  level.init();
  initInGame();
  //initTitle();
}

function update() {
  view.clear();
  level.terminal.draw();
  updateFunc[state]();
  terminal.draw();
  ticks++;
}

function initInGame() {
  //sound.playJingle("l");
  state = "inGame";
  ticks = 0;
  isCrateClicked = false;
  isValidPos = false;
  prevCursorPos.set(-1);
  moveAnimations = [];
  levelCount = 10;
  resetButton = button.get({
    pos: new Vector(118, 1),
    text: "RESET",
    onClick: () => {}
  });
  undoButton = button.get({
    pos: new Vector(118, 100),
    text: "UNDO",
    onClick: () => {}
  });
  initLevel();
}

function initLevel() {
  levelGeneratingCount = 0;
  levelGeneratingMaxCrateCount = -1;
  random.setSeed(levelCount);
  levelPartsSize.set(
    clamp(Math.floor(Math.sqrt(levelCount * 1.2)), 2, 6),
    clamp(Math.floor(Math.sqrt(levelCount * 0.7)), 2, 4)
  );
}

function updateInGame() {
  if (levelGeneratingCount >= 0) {
    if (levelGeneratingCount === 16) {
      if (levelGeneratingMaxCrateCount <= 0) {
        level.setFromPatterns(0);
      } else {
        generator.generate(
          levelCount * 179 + levelGeneratingMaxCrateIndex * 1087,
          levelPartsSize
        );
      }
      levelGeneratingCount = -1;
      level.draw();
      return;
    }
    const cc = generator.generate(
      levelCount * 179 + levelGeneratingCount * 1087,
      levelPartsSize
    );
    if (cc > levelGeneratingMaxCrateCount) {
      levelGeneratingMaxCrateCount = cc;
      levelGeneratingMaxCrateIndex = levelGeneratingCount;
    }
    levelGeneratingCount++;
    return;
  }
  if (moveAnimations.length > 0) {
    animateMove();
  } else {
    updateCursor();
  }
  button.update(resetButton);
  button.update(undoButton);
  /*if (ticks === 150) {
    sound.playBgm();
  }*/
}

function updateCursor() {
  cursorPos
    .set(pointer.pos)
    .div(6)
    .floor();
  if (cursorPos.isInRect(0, 0, terminalSize.x, terminalSize.y)) {
    const g = level.grid[cursorPos.x][cursorPos.y];
    if (isCrateClicked) {
      if (!prevCursorPos.equals(cursorPos)) {
        cratePath = level.getPath(crateClickedPos, cursorPos, "push");
        isValidPos = cratePath != null;
        prevCursorPos.set(cursorPos);
      }
      const cc = isValidPos ? "H" : "I";
      text.print(cc, cursorPos.x * 6, cursorPos.y * 6, { symbol: "s" });
      if (pointer.isJustReleased) {
        if (cratePath != null) {
          setMoveAnimation(cratePath, crateClickedPos);
        }
        isCrateClicked = false;
      }
    } else {
      if (!prevCursorPos.equals(cursorPos)) {
        isValidPos =
          (g === "crate" || g === "crate on dot") &&
          level.getMovableAngles(cursorPos, "push").length > 0;
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
}

function animateMove() {
  moveAnimationTicks -= 1;
  if (moveAnimationTicks <= 0) {
    moveAnimations[0].forEach(a => {
      if (a.char === "crate" && a.type === "disappear") {
        level.removeCrate(a.pos);
      }
    });
    moveAnimations.shift();
    if (moveAnimations.length > 0) {
      moveAnimations[0].forEach(a => {
        if (a.type === "appear") {
          if (a.char === "crate") {
            level.setCrate(a.pos);
          } else {
            level.setKeeper(a.pos, a.angle);
          }
        }
      });
    }
    moveAnimationTicks = 4;
  }
  level.draw();
  if (moveAnimations.length === 0) {
    return;
  }
  moveAnimations[0].forEach(a => {
    const i = a.type === "appear" ? moveAnimationTicks : 4 - moveAnimationTicks;
    text.print(
      String.fromCharCode("J".charCodeAt(0) + i),
      a.pos.x * 6,
      a.pos.y * 6,
      {
        symbol: "s"
      }
    );
  });
}

function setMoveAnimation(angles: number[], cratePos: Vector) {
  let pa = angles[0];
  moveAnimations = [];
  addKeeperAnimation(level.keeperPos, pa);
  addAnimation(cratePos, pa, "disappear");
  angles.forEach((a, i) => {
    if (i === angles.length - 1 || a !== pa) {
      if (a !== pa) {
        addAnimation(cratePos, pa, "appear");
        const ao = level.angleOffsets[pa];
        addKeeperAnimation({ x: cratePos.x - ao.x, y: cratePos.y - ao.y }, a);
        addAnimation(cratePos, a, "disappear");
        pa = a;
      }
      if (i === angles.length - 1) {
        cratePos.add(level.angleOffsets[a]);
        addAnimation(cratePos, a, "appear");
      }
    }
    cratePos.add(level.angleOffsets[a]);
  });
  moveAnimationTicks = 5;
  function addAnimation(
    pos: VectorLike,
    angle: number,
    type: "appear" | "disappear"
  ) {
    const ao = level.angleOffsets[angle];
    moveAnimations.push([
      {
        type,
        char: "crate",
        pos: { x: pos.x, y: pos.y }
      },
      {
        type,
        char: "keeper",
        pos: { x: pos.x - ao.x, y: pos.y - ao.y },
        angle
      }
    ]);
  }
  function addKeeperAnimation(pos: VectorLike, angle: number) {
    const ao = level.angleOffsets[angle];
    moveAnimations.push([{ type: "disappear", char: "keeper", pos }]);
    moveAnimations.push([
      {
        type: "appear",
        char: "keeper",
        pos: { x: cratePos.x - ao.x, y: cratePos.y - ao.y },
        angle
      }
    ]);
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
