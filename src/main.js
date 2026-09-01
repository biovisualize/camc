// Entry point. Rendering arrives in Task 4; for now this reports what the geometry builder makes.
import { hSurface } from "./camc.js";
import { surfaceGeometry, wireGeometry } from "./geometry.js";

const state = {
  a: { m: 3, n1: 40, n2: 7, n3: 40 },
  b: { m: 3.5, n1: 13, n2: 11, n3: 19 },
  rows: 18,
  cols: 30,
  sMin: Math.PI / 6,
  sMax: (6 / 7) * Math.PI,
  revolution: 2 * Math.PI,
};

const grid = hSurface(state.a, state.b, state);
const surface = surfaceGeometry(grid);
const wire = wireGeometry(grid);

console.log("vertices", grid.rows * grid.cols, "nonFinite", grid.nonFinite, "closed", grid.closed);
console.log("triangles", surface.getIndex().count / 3);
console.log("wire segments", wire.getAttribute("position").count / 2);
