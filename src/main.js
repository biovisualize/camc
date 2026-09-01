// Entry point. The control panel arrives in Task 7; this renders the default shape.
import { fSurface, hSurface, profileCurve } from "./camc.js";
import { ShapeViewer } from "./viewer.js";
import { drawProfile } from "./profile.js";

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
viewer.setInset(fSurface(state.a, state.b, 24, 36));
viewer.frame();
drawProfile(document.getElementById("profile-a"), profileCurve(state.a));
drawProfile(document.getElementById("profile-b"), profileCurve(state.b));
