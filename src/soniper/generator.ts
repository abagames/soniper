import { patterns as strPatterns } from "./templatePatterns";
import { GridType, charToType, grid, size, offset } from "./level";
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
  for (let px = 0; px < ps.x; px++) {
    for (let py = 0; py < ps.y; py++) {
      const p = patterns[random.getInt(patterns.length)][random.getInt(4)];
      for (let x = 0; x < 5; x++) {
        for (let y = 0; y < 5; y++) {
          const c = p[x][y];
          if (c !== "empty") {
            grid[offset.x + 1 + px * 3 + x][offset.y + 1 + py * 3 + y] = c;
          }
        }
      }
    }
  }
  for (let x = 0; x < terminalSize.x; x++) {
    for (let y = 0; y < terminalSize.y; y++) {
      if (grid[x][y] === "floor") {
        for (let ox = -1; ox <= 1; ox++) {
          for (let oy = -1; oy <= 1; oy++) {
            if (grid[x + ox][y + oy] === "empty") {
              grid[x + ox][y + oy] = "wall";
            }
          }
        }
      }
    }
  }
  for (let x = 0; x < terminalSize.x; x++) {
    for (let y = 0; y < terminalSize.y; y++) {
      if (grid[x][y] === "floor") {
        grid[x][y] = "empty";
      }
    }
  }
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
