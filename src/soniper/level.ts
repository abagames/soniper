import { terminalSize } from "./main";
import { Terminal } from "../util/terminal";
import { patterns } from "./levelsPattern";
import * as generator from "./generator";
import { Vector, VectorLike } from "../util/vector";
import { range } from "../util/math";

export let terminal: Terminal;
export type GridType =
  | "empty"
  | "wall"
  | "dot"
  | "crate"
  | "crate on dot"
  | "floor"
  | "floor reachable";
export let grid: GridType[][];
export const angleOffsets: VectorLike[] = [
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 0, y: -1 }
];
export const keeperPos = new Vector();
export let keeperAngle = 0;
export let size = new Vector();
export let offset = new Vector();
export const charToType: { [s: string]: GridType } = {
  " ": "empty",
  k: "empty",
  f: "floor",
  w: "wall",
  d: "dot",
  K: "dot",
  c: "crate",
  C: "crate on dot"
};
export type MoveType = "push" | "pull";
const keeperPrefPos = new Vector();
const typeToSymbol: { [g: string]: string } = {
  empty: " ",
  wall: "E",
  dot: "F",
  crate: "C",
  "crate on dot": "D"
};
let keeperMovableGrid: boolean[][];
let crateMovableStatuses: {
  path: number[];
  pos: VectorLike;
  angles: number[];
}[];
let crateMovableStatusHashes: { [h: number]: boolean };

export function init() {
  terminal = new Terminal(terminalSize);
  generator.init();
}

export function start(count: number) {
  grid = range(terminalSize.x).map(() =>
    range(terminalSize.y).map(() => "empty")
  );
  generator.generate(count);
  /*const p = patterns[count].split("\n").slice(1, -1);
  size.set(0, p.length);
  p.forEach(l => {
    size.x = Math.max(l.length, size.x);
  });
  offset
    .set((terminalSize.x - size.x) / 2, (terminalSize.y - size.y) / 2)
    .floor();
  p.forEach((l, y) => {
    l.split("").map((c, x) => {
      if (c === "k" || c === "K") {
        keeperPos.set(x + offset.x, y + offset.y);
      }
      grid[x + offset.x][y + offset.y] = charToType[c];
    });
  });*/
  draw();
  keeperMovableGrid = range(terminalSize.x).map(() =>
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
  const kc = keeperAngle % 2 == 0 ? "A" : "B";
  const rc = ["k", "k", "n", "o"][keeperAngle];
  terminal.print(kc, keeperPos.x, keeperPos.y, { symbol: "s", rotation: rc });
}

export function getPath(sp: Vector, dp: Vector, mt: MoveType) {
  if (!dp.isInRect(offset.x + 1, offset.y + 1, size.x - 2, size.y - 2)) {
    return;
  }
  keeperPrefPos.set(keeperPos);
  const fa = getMovableAngles(sp, mt);
  removeCrate(sp);
  crateMovableStatuses = [{ path: [], pos: sp, angles: fa }];
  crateMovableStatusHashes = {};
  crateMovableStatusHashes[objToHash({ pos: sp, angles: fa })] = true;
  let result;
  for (let i = 0; i < 99; i++) {
    const s = crateMovableStatuses.shift();
    s.angles.forEach(a => {
      const ao = angleOffsets[a];
      const pos = { x: s.pos.x + ao.x, y: s.pos.y + ao.y };
      const np = s.path.concat([a]);
      if (pos.x === dp.x && pos.y === dp.y) {
        result = np;
        return;
      }
      setCrate(pos);
      if (mt === "push") {
        keeperPos.set(s.pos);
      } else {
        keeperPos.set(pos.x + ao.x, pos.y + ao.y);
      }
      const na = getMovableAngles(pos, mt);
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
      keeperPos.set(keeperPrefPos);
      return result;
    }
  }
  setCrate(sp);
  keeperPos.set(keeperPrefPos);
  return;
}

export function getMovableAngles(p: VectorLike, mt: MoveType) {
  let angles: number[];
  if (mt === "push") {
    const xw = checkWall(p.x - 1, p.y) || checkWall(p.x + 1, p.y);
    const yw = checkWall(p.x, p.y - 1) || checkWall(p.x, p.y + 1);
    angles = xw ? (yw ? [] : [1, 3]) : yw ? [0, 2] : [0, 1, 2, 3];
    if (angles.length === 0) {
      return angles;
    }
  } else {
    angles = [0, 1, 2, 3];
  }
  for (let y = offset.y + 1; y < offset.y + size.y - 1; y++) {
    for (let x = offset.x + 1; x < offset.x + size.x - 1; x++) {
      keeperMovableGrid[x][y] = false;
    }
  }
  keeperMovableGrid[keeperPos.x][keeperPos.y] = true;
  for (let i = 0; i < 9; i++) {
    const fc = fillKeeperMovableForward() + fillKeeperMovableBackward();
    if (fc === 0) {
      break;
    }
  }
  angles = angles.filter(a => {
    const ao = angleOffsets[a];
    if (mt === "push") {
      return keeperMovableGrid[p.x - ao.x][p.y - ao.y];
    } else {
      return (
        keeperMovableGrid[p.x + ao.x][p.y + ao.y] &&
        keeperMovableGrid[p.x + ao.x * 2][p.y + ao.y * 2]
      );
    }
  });
  return angles;
}

function fillKeeperMovableForward() {
  let c = 0;
  for (let y = offset.y + 1; y < offset.y + size.y - 1; y++) {
    for (let x = offset.x + 1; x < offset.x + size.x - 1; x++) {
      if (
        !keeperMovableGrid[x][y] &&
        !checkWall(x, y) &&
        (checkMovable(x, y - 1) || checkMovable(x - 1, y))
      ) {
        keeperMovableGrid[x][y] = true;
        c++;
      }
    }
  }
  return c;
}

function fillKeeperMovableBackward() {
  let c = 0;
  for (let y = offset.y + size.y - 2; y > offset.y; y--) {
    for (let x = offset.x + size.x - 2; x > offset.x; x--) {
      if (
        !keeperMovableGrid[x][y] &&
        !checkWall(x, y) &&
        (checkMovable(x + 1, y) || checkMovable(x, y + 1))
      ) {
        keeperMovableGrid[x][y] = true;
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
    (grid[x][y] === "empty" || grid[x][y] === "dot") && keeperMovableGrid[x][y]
  );
}

export function removeCrate(p) {
  const g = grid[p.x][p.y];
  grid[p.x][p.y] = g === "crate on dot" ? "dot" : "empty";
}

export function setCrate(p) {
  const g = grid[p.x][p.y];
  grid[p.x][p.y] = g === "dot" ? "crate on dot" : "crate";
}

export function setKeeper(p, a) {
  keeperPos.set(p);
  keeperAngle = a;
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
