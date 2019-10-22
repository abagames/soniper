import { terminalSize } from "./main";
import { Terminal } from "../util/terminal";
import { patterns } from "./levelsPattern";
import { Vector } from "../util/vector";
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
}

export function draw() {
  terminal.clear();
  for (let y = offset.y; y < offset.x + size.x; y++) {
    for (let x = offset.x; x < offset.x + size.x; x++) {
      terminal.print(typeToSymbol[grid[x][y]], x, y, { symbol: "s" });
    }
  }
  const pc = playerAngle % 2 == 0 ? "A" : "B";
  const rc = ["k", "k", "n", "o"][playerAngle];
  terminal.print(pc, playerPos.x, playerPos.y, { symbol: "s", rotation: rc });
}
