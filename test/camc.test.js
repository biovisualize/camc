import { test } from "node:test";
import assert from "node:assert/strict";

import { hSurface, fSurface, integrate, profileCurve, superRadius, validate } from "../src/camc.js";

const A = { m: 3, n1: 40, n2: 7, n3: 40 };
const B = { m: 3.5, n1: 13, n2: 11, n3: 19 };
const SWEEP = { rows: 18, cols: 30, sMin: Math.PI / 6, sMax: (6 / 7) * Math.PI, revolution: 2 * Math.PI };

test("quadrature reproduces analytic integrals", () => {
  assert.ok(Math.abs(integrate((x) => x * x, 0, 1) - 1 / 3) < 1e-12);
  assert.ok(Math.abs(integrate(Math.sin, 0, Math.PI) - 2) < 1e-12);
});

test("the superformula collapses to the unit circle at m = 0, n = 2", () => {
  // cos term is 1 and sin term is 0 for every t, so r = (1 + 0)^(-1/2) = 1.
  for (let i = 0; i < 360; i++) {
    const r = superRadius((i * Math.PI) / 180, { m: 0, n1: 2, n2: 2, n3: 2 });
    assert.ok(Math.abs(r - 1) < 1e-15, `r = ${r} at i = ${i}`);
  }
});

test("the profile curve returns one sample per step around a full turn", () => {
  const curve = profileCurve(B, 360);
  assert.equal(curve.x.length, 360);
  assert.equal(curve.y.length, 360);
  // t = 0 gives (r, 0) on the positive x axis.
  assert.ok(Math.abs(curve.y[0]) < 1e-12);
  assert.ok(curve.x[0] > 0);
});

test("the H surface at the 2011 screenshot parameters is finite and closed", () => {
  const grid = hSurface(A, B, SWEEP);
  assert.equal(grid.nonFinite, 0);
  assert.equal(grid.closed, true);
  assert.equal(grid.position.length, 18 * 30 * 3);
  assert.equal(grid.finite.length, 18 * 30);

  let zMin = Infinity;
  let zMax = -Infinity;
  for (let i = 2; i < grid.position.length; i += 3) {
    zMin = Math.min(zMin, grid.position[i]);
    zMax = Math.max(zMax, grid.position[i]);
  }
  assert.ok(Math.abs(zMin - 0.882) < 1e-3, `zMin = ${zMin}`);
  assert.ok(Math.abs(zMax - 3.691) < 1e-3, `zMax = ${zMax}`);
});

test("the seam closes only on whole turns", () => {
  const closedAt = (revolution) => hSurface(A, B, { ...SWEEP, revolution }).closed;
  assert.equal(closedAt(2 * Math.PI), true);
  assert.equal(closedAt(4 * Math.PI), true);
  assert.equal(closedAt(3 * Math.PI), false);
  assert.equal(closedAt(1.5), false);
});

test("the F surface is always closed and needs no integration", () => {
  const grid = fSurface(A, B, 12, 18);
  assert.equal(grid.closed, true);
  assert.equal(grid.nonFinite, 0);
  assert.equal(grid.position.length, 12 * 18 * 3);
});

test("validate accepts the default state and names each bad parameter", () => {
  assert.deepEqual(validate({ a: A, b: B, ...SWEEP }), []);

  // y_A(s) vanishes at s = 0, so f = 1/y_A diverges; n1 = 0 breaks the -1/n1 exponent.
  const problems = validate({ a: { ...A, n1: 0 }, b: B, ...SWEEP, sMin: 0 });
  assert.equal(problems.length, 2);
  assert.ok(problems.some((p) => p.includes("n1")));
  assert.ok(problems.some((p) => p.includes("s from")));
});

test("a full-resolution surface builds fast enough to stay synchronous", () => {
  const started = performance.now();
  hSurface(A, B, { ...SWEEP, rows: 200, cols: 200 });
  const elapsed = performance.now() - started;
  // Measured at 10 ms warm and 45 ms on a cold JIT. The per-vertex version of this same build
  // measures 484 ms, so this bound catches the height integral drifting back into the inner loop.
  assert.ok(elapsed < 200, `200x200 took ${elapsed.toFixed(1)} ms`);
});
