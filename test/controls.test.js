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

// The 2011 screenshot is the acceptance target for the whole rebuild, and DEFAULT_STATE is derived
// from PRESETS[0], so reordering or renaming that entry silently changes what the app opens with.
test("the default state reproduces the 2011 screenshot exactly", () => {
  assert.equal(PRESETS[0].name, "Screenshot (2011)");
  assert.deepEqual(DEFAULT_STATE.a, { m: 3, n1: 40, n2: 7, n3: 40 });
  assert.deepEqual(DEFAULT_STATE.b, { m: 3.5, n1: 13, n2: 11, n3: 19 });
  assert.equal(DEFAULT_STATE.rows, 18);
  assert.equal(DEFAULT_STATE.cols, 30);
  // Exact, not approximate: writeUrl omits any value still identical to its default, so a value
  // that has been rounded even slightly would start appearing in the URL of an untouched page.
  assert.equal(DEFAULT_STATE.sMin, Math.PI / 6);
  assert.equal(DEFAULT_STATE.sMax, (6 / 7) * Math.PI);
  assert.equal(DEFAULT_STATE.revolution, 2 * Math.PI);
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
