import { terminalSize } from "./main";
import { Terminal } from "../util/terminal";
import { patterns } from "./levelsPattern";
import { Vector, VectorLike } from "../util/vector";
import { range } from "../util/math";

export let terminal: Terminal;
export type GridType = "empty" | "wall" | "dot" | "crate" | "crate on dot";
export let grid: GridType[][];
let size = new Vector();
let offset = new Vector();
let playerPos = new Vector();
let playerAngle = 0;
const charToType: { [s: string]: GridType } = {
  " ": "empty",
  k: "empty",
  w: "wall",
  d: "dot",
  K: "dot",
  c: "crate",
  C: "crate on dot"
};
const typeToSymbol: { [g: string]: string } = {
  empty: " ",
  wall: "E",
  dot: "F",
  crate: "C",
  "crate on dot": "D"
};
const angleOffsets = [[1, 0], [0, 1], [-1, 0], [0, -1]];
let playerMovableGrid: boolean[][];
let crateMovableStatuses: {
  path: number[];
  pos: VectorLike;
  angles: number[];
}[];
let crateMovableStatusHashes: { [h: number]: boolean };
const playerPrevPos = new Vector();

export function init() {
  terminal = new Terminal(terminalSize);
}

export function start(count: number) {
  const p = patterns[count].split("\n").slice(1, -1);
  size.set(0, p.length);
  p.forEach(l => {
    size.x = Math.max(l.length, size.x);
  });
  offset
    .set((terminalSize.x - size.x) / 2, (terminalSize.y - size.y) / 2)
    .floor();
  grid = range(terminalSize.x).map(() =>
    range(terminalSize.y).map(() => "empty")
  );
  p.forEach((l, y) => {
    l.split("").map((c, x) => {
      if (c === "k" || c === "K") {
        playerPos.set(x + offset.x, y + offset.y);
      }
      grid[x + offset.x][y + offset.y] = charToType[c];
    });
  });
  draw();
  playerMovableGrid = range(terminalSize.x).map(() =>
    range(terminalSize.y).map(() => false)
  );
}

export function draw() {
  terminal.clear();
  for (let y = offset.y; y < offset.y + size.y; y++) {
    for (let x = offset.x; x < offset.x + size.x; x++) {
      terminal.print(typeToSymbol[grid[x][y]], x, y, { symbol: "s" });
    }
  }
  const pc = playerAngle % 2 == 0 ? "A" : "B";
  const rc = ["k", "k", "n", "o"][playerAngle];
  terminal.print(pc, playerPos.x, playerPos.y, { symbol: "s", rotation: rc });
}

export function getPath(sp: VectorLike, dp: VectorLike) {
  playerPrevPos.set(playerPos);
  removeCrate(sp);
  const fa = getMovableAngles(sp);
  crateMovableStatuses = [{ path: [], pos: sp, angles: fa }];
  crateMovableStatusHashes = {};
  crateMovableStatusHashes[objToHash({ pos: sp, angles: fa })] = true;
  let result;
  for (let i = 0; i < 99; i++) {
    const s = crateMovableStatuses.shift();
    s.angles.forEach(a => {
      const ao = angleOffsets[a];
      const pos = { x: s.pos.x + ao[0], y: s.pos.y + ao[1] };
      const np = s.path.concat([a]);
      if (pos.x === dp.x && pos.y === dp.y) {
        result = np;
        return;
      }
      setCrate(pos);
      playerPos.set(s.pos);
      const na = getMovableAngles(pos);
      removeCrate(pos);
      const nsh = objToHash({ pos, angles: na });
      if (na.length > 0 && !crateMovableStatusHashes[nsh]) {
        crateMovableStatuses.push({
          path: np,
          pos,
          angles: na
        });
        crateMovableStatusHashes[nsh] = true;
      }
    });
    if (result != null || crateMovableStatuses.length === 0) {
      setCrate(sp);
      playerPos.set(playerPrevPos);
      return result;
    }
  }
}

export function getMovableAngles(p: VectorLike) {
  const xw = checkWall(p.x - 1, p.y) || checkWall(p.x + 1, p.y);
  const yw = checkWall(p.x, p.y - 1) || checkWall(p.x, p.y + 1);
  let angles = xw ? (yw ? [] : [1, 3]) : yw ? [0, 2] : [0, 1, 2, 3];
  if (angles.length === 0) {
    return angles;
  }
  for (let y = offset.y + 1; y < offset.y + size.y - 1; y++) {
    for (let x = offset.x + 1; x < offset.x + size.x - 1; x++) {
      playerMovableGrid[x][y] = false;
    }
  }
  playerMovableGrid[playerPos.x][playerPos.y] = true;
  for (let i = 0; i < 9; i++) {
    const fc = fillPlayerMovableForward() + fillPlayerMovableBackward();
    if (fc === 0) {
      break;
    }
  }
  angles = angles.filter(a => {
    const ao = angleOffsets[a];
    return playerMovableGrid[p.x - ao[0]][p.y - ao[1]];
  });
  return angles;
}

function fillPlayerMovableForward() {
  let c = 0;
  for (let y = offset.y + 1; y < offset.y + size.y - 1; y++) {
    for (let x = offset.x + 1; x < offset.x + size.x - 1; x++) {
      if (
        !playerMovableGrid[x][y] &&
        !checkWall(x, y) &&
        (checkMovable(x, y - 1) || checkMovable(x - 1, y))
      ) {
        playerMovableGrid[x][y] = true;
        c++;
      }
    }
  }
  return c;
}

function fillPlayerMovableBackward() {
  let c = 0;
  for (let y = offset.y + size.y - 2; y > offset.y; y--) {
    for (let x = offset.x + size.x - 2; x > offset.x; x--) {
      if (
        !playerMovableGrid[x][y] &&
        !checkWall(x, y) &&
        (checkMovable(x + 1, y) || checkMovable(x, y + 1))
      ) {
        playerMovableGrid[x][y] = true;
        c++;
      }
    }
  }
  return c;
}

function checkWall(x, y) {
  return (
    grid[x][y] === "wall" ||
    grid[x][y] === "crate" ||
    grid[x][y] === "crate on dot"
  );
}

function checkMovable(x, y) {
  return (
    (grid[x][y] === "empty" || grid[x][y] === "dot") && playerMovableGrid[x][y]
  );
}

function removeCrate(p) {
  const g = grid[p.x][p.y];
  grid[p.x][p.y] = g === "crate on dot" ? "dot" : "empty";
}

function setCrate(p) {
  const g = grid[p.x][p.y];
  grid[p.x][p.y] = g === "dot" ? "crate on dot" : "crate";
}

function objToHash(o) {
  const s = JSON.stringify(o);
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    const chr = s.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return hash;
}
