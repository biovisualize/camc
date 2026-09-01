import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { validate } from "../src/camc.js";
import { DEFAULT_STATE, PRESETS } from "../src/controls.js";

// controls.js only reaches for the DOM inside functions, so importing it under Node is safe. That
// makes the preset table testable, which matters: it is plain data with no other guard on it.

// The slider bounds live in index.html, and a preset outside them is silently clamped by the
// browser on its way into the panel — which can collapse the s interval and leave the canvas
// blank. Reading the real markup keeps this test honest if a bound is ever edited.
function sliderBounds() {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const bounds = {};
  for (const tag of html.matchAll(/<input id="([^"]+)" type="range"([^>]*)>/g)) {
    const [, id, attrs] = tag;
    const min = attrs.match(/min="([^"]+)"/);
    const max = attrs.match(/max="([^"]+)"/);
    if (min && max) bounds[id] = { min: Number(min[1]), max: Number(max[1]) };
  }
  return bounds;
}

// Which preset comes first, and what it is called, is an editorial choice — this asserts nothing
// about that. What it does protect is the mechanism that depends on the default: writeUrl leaves out
// any value still identical to its default, and stateToDom/stateFromDom carry values through the
// DOM as strings. So every default must survive a String -> Number round-trip bit-for-bit, or an
// untouched page starts growing a query string for parameters nobody touched. Irrational defaults
// like Math.PI / 6 do survive; a value quantised by a fixed slider `step` would not.
test("every default survives the round-trip through the DOM unchanged", () => {
  const scalars = {
    rows: DEFAULT_STATE.rows,
    cols: DEFAULT_STATE.cols,
    sMin: DEFAULT_STATE.sMin,
    sMax: DEFAULT_STATE.sMax,
    revolution: DEFAULT_STATE.revolution,
    ...Object.fromEntries(Object.entries(DEFAULT_STATE.a).map(([k, v]) => [`a.${k}`, v])),
    ...Object.fromEntries(Object.entries(DEFAULT_STATE.b).map(([k, v]) => [`b.${k}`, v])),
  };
  for (const [name, value] of Object.entries(scalars)) {
    assert.equal(typeof value, "number", `${name} is not a number`);
    assert.ok(Number.isFinite(value), `${name} is not finite`);
    assert.equal(Number(String(value)), value, `${name} does not survive String -> Number`);
  }
});

test("the default state is one the application will accept", () => {
  assert.deepEqual(validate(DEFAULT_STATE), []);
  assert.ok(PRESETS.length > 0, "DEFAULT_STATE is derived from PRESETS[0]");
});

test("every preset is accepted by validate", () => {
  for (const preset of PRESETS) {
    const state = {
      a: { m: preset.a[0], n1: preset.a[1], n2: preset.a[2], n3: preset.a[3] },
      b: { m: preset.b[0], n1: preset.b[1], n2: preset.b[2], n3: preset.b[3] },
      rows: preset.rows ?? 40,
      cols: preset.cols ?? 60,
      sMin: preset.sMin,
      sMax: preset.sMax,
      revolution: 2 * Math.PI,
    };
    assert.deepEqual(validate(state), [], `preset "${preset.name}" was rejected`);
  }
});

test("every preset fits inside the slider bounds it will be loaded into", () => {
  const bounds = sliderBounds();
  const fields = [
    ["smin", (p) => p.sMin],
    ["smax", (p) => p.sMax],
    ["rows", (p) => p.rows ?? 40],
    ["cols", (p) => p.cols ?? 60],
    ["a-m", (p) => p.a[0]],
    ["a-n1", (p) => p.a[1]],
    ["a-n2", (p) => p.a[2]],
    ["a-n3", (p) => p.a[3]],
    ["b-m", (p) => p.b[0]],
    ["b-n1", (p) => p.b[1]],
    ["b-n2", (p) => p.b[2]],
    ["b-n3", (p) => p.b[3]],
  ];
  for (const preset of PRESETS) {
    for (const [id, read] of fields) {
      const bound = bounds[id];
      assert.ok(bound, `index.html has no range input #${id}`);
      const value = read(preset);
      assert.ok(
        value >= bound.min && value <= bound.max,
        `preset "${preset.name}" has ${id} = ${value}, outside [${bound.min}, ${bound.max}]`,
      );
    }
  }
});

// Two plain sliders stand in for a two-thumb control, and clampRange keeps them S_GAP apart. A
// preset that starts closer than that would be clamped on load and then rejected by validate.
test("every preset leaves at least the clamp gap between s from and s to", () => {
  for (const preset of PRESETS) {
    assert.ok(
      preset.sMax - preset.sMin >= 0.01,
      `preset "${preset.name}" spans only ${preset.sMax - preset.sMin}`,
    );
  }
});
