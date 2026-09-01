import { test } from "node:test";
import assert from "node:assert/strict";

import { hSurface } from "../src/camc.js";
import { nextColumn, surfaceIndices, wireSegments } from "../src/topology.js";

// A grid of the right shape with every vertex finite except those listed in `holes`.
function makeGrid(rows, cols, closed, holes = []) {
  const finite = new Uint8Array(rows * cols).fill(1);
  for (const index of holes) finite[index] = 0;
  return {
    rows,
    cols,
    closed,
    finite,
    position: new Float32Array(rows * cols * 3),
    nonFinite: holes.length,
  };
}

const triangles = (grid) => surfaceIndices(grid).length / 3;
const segments = (grid) => wireSegments(grid).length / 6; // 2 endpoints x 3 floats

test("nextColumn wraps only when the grid is closed", () => {
  assert.equal(nextColumn(makeGrid(2, 5, true), 3), 4);
  assert.equal(nextColumn(makeGrid(2, 5, true), 4), 0);
  assert.equal(nextColumn(makeGrid(2, 5, false), 4), -1);
});

test("a closed grid wraps the last column back to the first", () => {
  const grid = makeGrid(4, 5, true);
  // 3 rows of quads x 5 columns (the fifth wraps) x 2 triangles.
  assert.equal(triangles(grid), 30);
  // 4x5 row edges (every vertex has one, because the seam closes) + 3x5 column edges.
  assert.equal(segments(grid), 35);
});

test("an open grid leaves the seam unstitched", () => {
  const grid = makeGrid(4, 5, false);
  // 3 rows of quads x 4 columns x 2 triangles: the fifth column has nothing to its right.
  assert.equal(triangles(grid), 24);
  // 4x4 row edges + 3x5 column edges.
  assert.equal(segments(grid), 31);
});

test("one non-finite vertex removes every quad and edge touching it", () => {
  const full = makeGrid(5, 6, true);
  const holed = makeGrid(5, 6, true, [2 * 6 + 3]); // an interior vertex

  // An interior vertex is a corner of 4 quads, so 8 triangles go with it.
  assert.equal(triangles(full) - triangles(holed), 8);
  // It is an endpoint of 4 lattice edges: left, right, up, down.
  assert.equal(segments(full) - segments(holed), 4);
});

test("the screenshot surface produces the counts its dimensions imply", () => {
  const a = { m: 3, n1: 40, n2: 7, n3: 40 };
  const b = { m: 3.5, n1: 13, n2: 11, n3: 19 };
  const sweep = { rows: 18, cols: 30, sMin: Math.PI / 6, sMax: (6 / 7) * Math.PI };

  const closed = hSurface(a, b, { ...sweep, revolution: 2 * Math.PI });
  assert.equal(closed.closed, true);
  assert.equal(triangles(closed), 17 * 30 * 2);
  assert.equal(segments(closed), 18 * 30 + 17 * 30);

  const open = hSurface(a, b, { ...sweep, revolution: Math.PI });
  assert.equal(open.closed, false);
  assert.equal(triangles(open), 17 * 29 * 2);
  assert.equal(segments(open), 18 * 29 + 17 * 30);
});
