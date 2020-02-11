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
type State = "inGame" | "solved";
let state: State;
let updateFunc = {
  inGame: updateInGame,
  solved: updateSolved
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
type UndoHistory = {
  crateSourcePos: Vector;
  crateDestinationPos: Vector;
  keeperPos: Vector;
  keeperAngle: number;
};
let undoHistories: UndoHistory[];
const baseSeed = 14;
const clearLevelCount = 30;
const localStorageKey = "soniper-100";

main.init(init, update, {
  viewSize: { x: 25 * 6, y: 18 * 6 },
  isUsingVirtualPad: false
});

function init() {
  sound.init(205);
  terminal = new Terminal(terminalSize);
  charPatterns.init();
  level.init();
  resetButton = button.get({
    pos: new Vector(118, 1),
    text: "RESET",
    onClick: reset
  });
  undoButton = button.get({
    pos: new Vector(118, 100),
    text: "UNDO",
    onClick: undo
  });
  initInGame();
}

function update() {
  view.clear();
  level.terminal.draw();
  updateFunc[state]();
  terminal.draw();
  ticks++;
}

function initInGame() {
  levelCount = loadLevelCount();
  if (levelCount == null) {
    levelCount = 1;
  }
  initLevel();
}

function initLevel() {
  //sound.playJingle("l");
  state = "inGame";
  ticks = 0;
  saveLevelCount(levelCount);
  isCrateClicked = false;
  isValidPos = false;
  prevCursorPos.set(-1);
  moveAnimations = [];
  levelGeneratingCount = 0;
  levelGeneratingMaxCrateCount = -1;
  random.setSeed(levelCount + baseSeed);
  levelPartsSize.set(
    clamp(Math.floor(random.get(Math.sqrt(levelCount * 2))), 2, 6),
    clamp(Math.floor(random.get(Math.sqrt(levelCount * 1.5))), 2, 4)
  );
  undoHistories = [];
  terminal.clear();
  level.terminal.clear();
  ticks = 0;
}

function updateInGame() {
  if (levelGeneratingCount >= 0) {
    if (levelGeneratingCount === 16) {
      if (levelGeneratingMaxCrateCount <= 0) {
        level.setFromPatterns(0);
      } else {
        generator.generate(
          levelCount * 179 + levelGeneratingMaxCrateIndex * 1087 + baseSeed,
          levelPartsSize
        );
      }
      levelGeneratingCount = -1;
      level.draw();
      terminal.clear();
      return;
    }
    const cc = generator.generate(
      levelCount * 179 + levelGeneratingCount * 1087 + baseSeed,
      levelPartsSize
    );
    if (cc > levelGeneratingMaxCrateCount) {
      levelGeneratingMaxCrateCount = cc;
      levelGeneratingMaxCrateIndex = levelGeneratingCount;
    }
    levelGeneratingCount++;
    terminal.print(`GENERATING ${levelGeneratingCount} / 16`, 1, 0);
    return;
  }
  if (ticks < 60) {
    terminal.print(`LEVEL ${levelCount}`, 1, 0);
  } else if (ticks === 60) {
    terminal.clear();
  }
  if (moveAnimations.length > 0) {
    animateMove();
  } else {
    updateCursor();
    if (undoHistories.length > 0) {
      button.update(resetButton);
      button.update(undoButton);
    }
  }
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
          undoHistories.push({
            crateSourcePos: new Vector(crateClickedPos),
            crateDestinationPos: new Vector(cursorPos),
            keeperPos: new Vector(level.keeperPos),
            keeperAngle: level.keeperAngle
          });
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
    if (level.checkSolved()) {
      initSolved();
    }
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

function reset() {
  if (undoHistories.length === 0 || moveAnimations.length > 0) {
    return;
  }
  while (undoHistories.length > 0) {
    undoOnce();
  }
  level.draw();
}

function undo() {
  if (undoHistories.length === 0 || moveAnimations.length > 0) {
    return;
  }
  undoOnce();
  level.draw();
}

function undoOnce() {
  const h = undoHistories.pop();
  level.removeCrate(h.crateDestinationPos);
  level.setCrate(h.crateSourcePos);
  level.setKeeper(h.keeperPos, h.keeperAngle);
}

function initSolved() {
  state = "solved";
  ticks = 0;
  if (levelCount === clearLevelCount) {
    terminal.print(`${levelCount} LEVELS ARE SOLVED!`, 1, 0);
    terminal.print("CONGRATULATIONS!", 1, 1);
  } else {
    terminal.print("SOLVED", 1, 0);
  }
}

function updateSolved() {
  if (ticks > (levelCount === clearLevelCount ? 300 : 60)) {
    levelCount++;
    initLevel();
  }
}

function loadLevelCount() {
  let count = loadFromUrl();
  if (count == null) {
    try {
      const data = JSON.parse(localStorage.getItem(localStorageKey));
      count = data.levelCount;
    } catch {}
  }
  if (count == null) {
    return undefined;
  }
  count = Math.floor(count);
  if (count < 1) {
    count = 1;
  }
  return count;
}

function loadFromUrl() {
  const query = window.location.search.substring(1);
  if (query == null) {
    return undefined;
  }
  let params = query.split("&");
  let levelCountStr: string;
  for (let i = 0; i < params.length; i++) {
    const param = params[i];
    const pair = param.split("=");
    if (pair[0] === "l") {
      levelCountStr = pair[1];
    }
  }
  if (levelCountStr == null) {
    return undefined;
  }
  return Number(levelCountStr);
}

function saveLevelCount(count: number) {
  saveAsUrl(count);
  try {
    localStorage.setItem(
      localStorageKey,
      JSON.stringify({ levelCount: count })
    );
  } catch {}
}

function saveAsUrl(count: number) {
  const baseUrl = window.location.href.split("?")[0];
  let url = `${baseUrl}?l=${count}`;
  try {
    window.history.replaceState({}, "", url);
  } catch (e) {}
}
