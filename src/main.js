// Entry point. The control panel arrives in Task 7; this renders the default shape.
import { hSurface } from "./camc.js";
import { ShapeViewer } from "./viewer.js";

const state = {
  a: { m: 3, n1: 40, n2: 7, n3: 40 },
  b: { m: 3.5, n1: 13, n2: 11, n3: 19 },
  rows: 18,
  cols: 30,
  sMin: Math.PI / 6,
  sMax: (6 / 7) * Math.PI,
  revolution: 2 * Math.PI,
};

const viewer = new ShapeViewer(document.getElementById("view"));
viewer.setSurface(hSurface(state.a, state.b, state));
viewer.frame();
