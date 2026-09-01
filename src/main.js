// Entry point: panel state in, surface out.
import { fSurface, hSurface, profileCurve, validate } from "./camc.js";
import { createControls, DEFAULT_STATE, readUrl, writeUrl } from "./controls.js";
import { drawProfile } from "./profile.js";
import { ShapeViewer } from "./viewer.js";

const viewer = new ShapeViewer(document.getElementById("view"));
const profileA = document.getElementById("profile-a");
const profileB = document.getElementById("profile-b");

// A full refit happens on load, on presets and on Fit view — not on every slider tick, because
// re-framing mid-drag makes the shape appear to jump away from the hand moving it. Ordinary
// changes still go through ShapeViewer._rescale, which rescales only when the shape's size
// changes enough to leave the frustum, and preserves the angle and zoom the user chose.
function apply(state, refit) {
  const problems = validate(state);
  if (problems.length > 0) {
    controls.setStatus(problems.join(" "));
    return;
  }

  const grid = hSurface(state.a, state.b, state);
  viewer.setSurface(grid);
  viewer.setInset(fSurface(state.a, state.b, 24, 36));
  viewer.setOptions(state);
  if (refit) viewer.frame();

  drawProfile(profileA, profileCurve(state.a));
  drawProfile(profileB, profileCurve(state.b));

  controls.setStatus(
    grid.nonFinite > 0
      ? `${grid.nonFinite} of ${grid.rows * grid.cols} points were not finite and were dropped.`
      : "",
  );
  writeUrl(state);
}

const controls = createControls({
  onChange: (state) => apply(state, false),
  onFrame: (state) => apply(state, true),
});

const initial = readUrl(DEFAULT_STATE);
controls.setState(initial);
apply(controls.getState(), true);

// The profile canvases are sized in CSS, so they need redrawing when the panel width changes.
window.addEventListener("resize", () => {
  const state = controls.getState();
  drawProfile(profileA, profileCurve(state.a));
  drawProfile(profileB, profileCurve(state.b));
});
