// Which grid vertices form triangles, and which pairs form wireframe edges.
//
// Deliberately free of three.js imports so it can be unit-tested under `node --test`. Every
// function here takes a Grid from camc.js and returns plain arrays.

// The column to the "right" of j: wraps to 0 when the sweep closes on itself, or -1 at an open
// edge, where there is nothing to join to.
export function nextColumn(grid, j) {
  if (j + 1 < grid.cols) return j + 1;
  return grid.closed ? 0 : -1;
}

// Triangle indices, two per quad. A quad is emitted only when all four of its corners are finite,
// so a singular row punches a hole rather than dragging vertices to the origin.
export function surfaceIndices(grid) {
  const indices = [];
  for (let i = 0; i < grid.rows - 1; i++) {
    for (let j = 0; j < grid.cols; j++) {
      const jNext = nextColumn(grid, j);
      if (jNext < 0) continue;
      const a = i * grid.cols + j;
      const b = i * grid.cols + jNext;
      const c = (i + 1) * grid.cols + jNext;
      const d = (i + 1) * grid.cols + j;
      if (!(grid.finite[a] && grid.finite[b] && grid.finite[c] && grid.finite[d])) continue;
      indices.push(a, b, d, b, c, d);
    }
  }
  return indices;
}

// Quad edges as line-segment endpoints: one along each row, one along each column, no diagonals.
// THREE.WireframeGeometry would add a diagonal across every quad; the original drew quad outlines,
// and the diagonals turn the surface into visual noise.
export function wireSegments(grid) {
  const points = [];
  const push = (index) => {
    points.push(grid.position[index * 3], grid.position[index * 3 + 1], grid.position[index * 3 + 2]);
  };

  for (let i = 0; i < grid.rows; i++) {
    for (let j = 0; j < grid.cols; j++) {
      const here = i * grid.cols + j;
      if (!grid.finite[here]) continue;

      const jNext = nextColumn(grid, j);
      if (jNext >= 0) {
        const across = i * grid.cols + jNext;
        if (grid.finite[across]) {
          push(here);
          push(across);
        }
      }

      if (i + 1 < grid.rows) {
        const below = (i + 1) * grid.cols + j;
        if (grid.finite[below]) {
          push(here);
          push(below);
        }
      }
    }
  }

  return new Float32Array(points);
}
