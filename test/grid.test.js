import { test } from "node:test";
import assert from "node:assert/strict";

import { hSurface, fSurface } from "../src/camc.js";

// Slider bounds, read from the range inputs in index.html:
//   a-m / b-m:         min 0,    max 50
//   a-n1 / b-n1:       min 0.01, max 50
//   a-n2 / b-n2:       min 0,    max 50
//   a-n3 / b-n3:       min 0,    max 50
//   revolution:        min 0.05, max 18.849
//   smin / smax:       min 0.01, max 3.13
//   rows / cols:       min 3,    max 200
//
// The defect: writeVertex validated the doubles it was handed with Number.isFinite before storing
// them into a Float32Array. Number.isFinite(1e40) is true, but Math.fround(1e40) is Infinity, so a
// value that narrows to Infinity on the way into the Float32Array could still be flagged
// grid.finite[k] = 1. Every case below asserts the storage invariant directly against what the
// Float32Array actually holds, which is what would have caught this.
const M_MIN = 0;
const M_MAX = 50;
const N1_MIN = 0.01;
const N23_MAX = 50;
const S_MIN_BOUND = 0.01;
const S_MAX_BOUND = 3.13;

const ROWS = 18;
const COLS = 30;

// Every grid produced below, for both surfaces, must satisfy this: nothing non-finite reaches the
// GPU buffer, and grid.finite tells the truth about what got dropped.
function assertStorageInvariant(grid, label) {
  // 1. Every element of grid.position is finite: this is the thing that actually gets uploaded to
  // three.js's BufferAttribute, so a violation here is exactly the "Infinity sent to the GPU" bug.
  assert.ok(
    Array.from(grid.position).every((v) => Number.isFinite(v)),
    `${label}: grid.position contains a non-finite value`,
  );

  // 2. grid.finite[k] === 1 must imply the stored xyz triple at k is finite. This is the invariant
  // the old writeVertex broke: it could flag a corrupted vertex as good.
  let vouchedButCorrupt = 0;
  for (let k = 0; k < grid.finite.length; k++) {
    if (grid.finite[k] !== 1) continue;
    const base = k * 3;
    const triple = [grid.position[base], grid.position[base + 1], grid.position[base + 2]];
    if (!triple.every((v) => Number.isFinite(v))) vouchedButCorrupt++;
  }
  assert.equal(vouchedButCorrupt, 0, `${label}: ${vouchedButCorrupt} vertices flagged finite but corrupt`);

  // 3. grid.nonFinite must equal the count of dropped vertices, so the status line's count matches
  // reality instead of under-reporting the damage.
  let droppedCount = 0;
  for (let k = 0; k < grid.finite.length; k++) if (grid.finite[k] === 0) droppedCount++;
  assert.equal(grid.nonFinite, droppedCount, `${label}: grid.nonFinite disagrees with the dropped count`);
}

function checkBoth(a, b, sweep, label) {
  assertStorageInvariant(hSurface(a, b, { rows: ROWS, cols: COLS, sMin: S_MIN_BOUND, sMax: S_MAX_BOUND, revolution: 2 * Math.PI, ...sweep }), `${label} (hSurface)`);
  assertStorageInvariant(fSurface(a, b, ROWS, COLS), `${label} (fSurface)`);
}

test("n1 at its minimum with n2/n3 at their maximum, profile B extreme (the reported repro)", () => {
  // This is the exact combination from the reported repro: a is the "Rounded" preset, b has n1 at
  // its 0.01 minimum with n2 and n3 pinned to their 50 maximum. Under the old writeVertex this
  // produced 216 vertices storing Infinity while 216 of those were flagged finite = 1.
  const a = { m: 6, n1: 10, n2: 4, n3: 4 };
  const b = { m: 3, n1: N1_MIN, n2: N23_MAX, n3: N23_MAX };
  checkBoth(a, b, {}, "profile B extreme");
});

test("n1 at its minimum with n2/n3 at their maximum, profile A extreme", () => {
  // Same extreme combination, but on profile A instead of B, since the two profiles enter the
  // surface formulas differently (A drives the ring/height, B drives the sweep).
  const a = { m: 3, n1: N1_MIN, n2: N23_MAX, n3: N23_MAX };
  const b = { m: 6, n1: 10, n2: 4, n3: 4 };
  checkBoth(a, b, {}, "profile A extreme");
});

test("m at its maximum on both profiles", () => {
  const a = { m: M_MAX, n1: 8, n2: 5, n3: 6 };
  const b = { m: M_MAX, n1: 3, n2: 4, n3: 4 };
  checkBoth(a, b, {}, "m at maximum");
});

test("sMin and sMax at the extremes of their range", () => {
  const a = { m: 6, n1: 10, n2: 4, n3: 4 };
  const b = { m: 3, n1: 5, n2: 3, n3: 3 };
  // sMin as low as the slider allows, sMax as high as the slider allows: this is where y_A(s) gets
  // closest to the zeros at s = 0 and s = pi that make f = 1/y_A diverge.
  checkBoth(a, b, { sMin: S_MIN_BOUND, sMax: S_MAX_BOUND }, "sMin/sMax at extremes");
});

test("ordinary in-between parameters, as a control", () => {
  // Two unremarkable mid-range cases: these should already have passed before the fix, and serve
  // as a control against a test file that fails everything indiscriminately.
  const a1 = { m: 3, n1: 40, n2: 7, n3: 40 };
  const b1 = { m: 3.5, n1: 13, n2: 11, n3: 19 };
  checkBoth(a1, b1, { sMin: Math.PI / 6, sMax: (6 / 7) * Math.PI }, "control 1");

  const a2 = { m: 5, n1: 2, n2: 2, n3: 2 };
  const b2 = { m: 4, n1: 3, n2: 3, n3: 3 };
  checkBoth(a2, b2, { sMin: 0.6, sMax: 2.5 }, "control 2");
});

test("a grid whose vertices are all dropped still leaves finite and position in agreement", () => {
  // All parameters below are within slider bounds. This combination breaks every single vertex of
  // an 18x30 hSurface grid, giving grid.finite no 1s at all. geometry.js cannot be imported here
  // (it imports the bare specifier "three"), so this does not test setBounds() directly; instead it
  // checks the precondition setBounds() relies on: grid.position stays fully finite (all dropped
  // vertices land on the zeroed origin) even when grid.finite has no 1s to vouch for any of them,
  // which is what lets geometry.js's box.isEmpty() fallback produce a usable box instead of folding
  // Infinity/NaN into the bounds.
  const a = { m: M_MAX, n1: N1_MIN, n2: N23_MAX, n3: N23_MAX };
  const b = { m: M_MIN, n1: N23_MAX, n2: N23_MAX, n3: N23_MAX };
  const grid = hSurface(a, b, { rows: 6, cols: 6, sMin: S_MIN_BOUND, sMax: S_MAX_BOUND, revolution: 2 * Math.PI });

  const anyFinite = Array.from(grid.finite).some((f) => f === 1);
  assert.equal(anyFinite, false, "expected every vertex in this combination to be dropped");

  assertStorageInvariant(grid, "all-dropped grid");
  assert.equal(grid.nonFinite, grid.finite.length);
});
