import { patterns as strPatterns } from "./templatePatterns";
import {
  GridType,
  charToType,
  grid,
  size,
  offset,
  keeperPos,
  getPath,
  angleOffsets,
  removeCrate,
  setCrate
} from "./level";
import { terminalSize } from "./main";
import { range } from "../util/math";
import { Vector } from "../util/vector";
import { Random } from "../util/random";

const random = new Random();
let patterns: GridType[][][][];

export function init() {
  patterns = strPatterns.map(sp => {
    const pl = sp.split("\n");
    return range(4).map(angle =>
      range(5).map(x => range(5).map(y => getGridType(pl, x, y, angle)))
    );
  });
}

export function generate(count: number) {
  const ps = new Vector(3, 3);
  size.set(ps.x * 3 + 4, ps.y * 3 + 4);
  offset
    .set((terminalSize.x - size.x) / 2, (terminalSize.y - size.y) / 2)
    .floor();
  const floors: Vector[] = [];
  const walls: Vector[] = [];
  for (let px = 0; px < ps.x; px++) {
    for (let py = 0; py < ps.y; py++) {
      const pt = patterns[random.getInt(patterns.length)][random.getInt(4)];
      for (let x = 0; x < 5; x++) {
        for (let y = 0; y < 5; y++) {
          const c = pt[x][y];
          if (c !== "empty") {
            grid[offset.x + 1 + px * 3 + x][offset.y + 1 + py * 3 + y] = c;
          }
        }
      }
    }
  }
  for (let x = 0; x < terminalSize.x; x++) {
    for (let y = 0; y < terminalSize.y; y++) {
      const g = grid[x][y];
      if (g === "floor") {
        floors.push(new Vector(x, y));
      } else if (g === "wall") {
        walls.push(new Vector(x, y));
      }
    }
  }
  keeperPos.set(random.select(floors));
  grid[keeperPos.x][keeperPos.y] = "floor reachable";
  for (let i = 0; i < 99; i++) {
    floors.forEach(f => {
      [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1]
      ].forEach(o => {
        if (grid[f.x + o[0]][f.y + o[1]] === "floor reachable") {
          grid[f.x][f.y] = "floor reachable";
        }
      });
    });
  }
  const reachableFloors = floors.filter(
    f => grid[f.x][f.y] === "floor reachable"
  );
  reachableFloors.forEach(f => {
    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        const p = new Vector(f).add(ox, oy);
        if (grid[p.x][p.y] === "empty" || grid[p.x][p.y] === "floor") {
          grid[p.x][p.y] = "wall";
          walls.push(p);
        }
      }
    }
  });
  for (let i = 0; i < 9; i++) {
    walls.forEach(w => {
      let isRemovable = true;
      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          if (grid[w.x + ox][w.y + oy] === "floor reachable") {
            isRemovable = false;
          }
        }
      }
      if (isRemovable) {
        grid[w.x][w.y] = "empty";
      }
    });
  }
  floors.forEach(f => {
    grid[f.x][f.y] = "empty";
  });
  let crateCandidates = reachableFloors.filter(
    f => f.x !== keeperPos.x || f.y !== keeperPos.y
  );
  let cn = Math.floor(crateCandidates.length * random.get(0.05, 0.15)) + 1;
  let lastCrate: Vector;
  const crates: { pos: Vector; isMoved: boolean }[] = [];
  while (cn > 0) {
    if (random.get() < 0.01) {
      lastCrate = undefined;
    }
    const ci = random.getInt(crateCandidates.length);
    const cc = crateCandidates[ci];
    if (
      lastCrate == null ||
      Math.abs(lastCrate.x - cc.x) + Math.abs(lastCrate.y - cc.y) === 1
    ) {
      grid[cc.x][cc.y] = "crate on dot";
      crates.push({ pos: cc, isMoved: false });
      lastCrate = cc;
      crateCandidates.splice(ci, 1);
      cn--;
    }
  }
  for (let i = 0; i < 99; i++) {
    const c = random.select(crates);
    const dp = random.select(reachableFloors);
    if (c.pos.x === dp.x && c.pos.y == dp.y) {
      continue;
    }
    const p = getPath(c.pos, dp, "pull");
    if (p != null) {
      removeCrate(c.pos);
      c.pos.set(dp);
      c.isMoved = true;
      const la = angleOffsets[p[p.length - 1]];
      keeperPos.set(c.pos.x + la.x, c.pos.y + la.y);
      setCrate(c.pos);
    }
  }
  crates.forEach(c => {
    if (!c.isMoved) {
      grid[c.pos.x][c.pos.y] = "empty";
    }
  });
}

function getGridType(
  pl: string[],
  _x: number,
  _y: number,
  angle: number
): GridType {
  let x: number;
  let y: number;
  switch (angle) {
    case 0:
      x = _x;
      y = _y;
      break;
    case 1:
      x = _y;
      y = 4 - _x;
      break;
    case 2:
      x = 4 - _x;
      y = 4 - _y;
      break;
    case 3:
      x = 4 - _y;
      y = _x;
      break;
  }
  if (y > pl.length) {
    return "empty";
  }
  const l = pl[y + 1];
  if (x >= l.length) {
    return "empty";
  }
  return charToType[l.charAt(x)];
}
