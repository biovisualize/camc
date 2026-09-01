// Constant Anisotropic Mean Curvature surfaces.
//
// Transcribed from the 2011 Processing sketch in camc-archive (CAMC_5avril11/src/Main.java) and
// the Maple-style source formulas in camc-archive/CAMC/formules.txt. Pure functions only: this
// module imports nothing and knows nothing about rendering.

const QUAD_ORDER = 32; // matches the Flanagan gaussQuad(32) the original used
const DERIV_STEP = 1e-4; // the original's forward-difference step for v'
const INTEGRAL_BASE = 0.2; // the original's lower limit for g

// Gauss-Legendre nodes and weights on [-1, 1], found by Newton-Raphson on the Legendre
// polynomial. Computing them beats shipping a 64-number table and generalises to any order.
function legendreRule(n) {
  const nodes = new Float64Array(n);
  const weights = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let z = Math.cos((Math.PI * (i + 0.75)) / (n + 0.5));
    let dp = 0;
    for (let iter = 0; iter < 100; iter++) {
      let p0 = 1;
      let p1 = 0;
      for (let k = 1; k <= n; k++) {
        const p2 = p1;
        p1 = p0;
        p0 = ((2 * k - 1) * z * p1 - (k - 1) * p2) / k;
      }
      dp = (n * (z * p0 - p1)) / (z * z - 1);
      const step = p0 / dp;
      z -= step;
      if (Math.abs(step) < 1e-15) break;
    }
    nodes[i] = z;
    weights[i] = 2 / ((1 - z * z) * dp * dp);
  }
  return { nodes, weights };
}

const RULE = legendreRule(QUAD_ORDER);

export function integrate(f, a, b) {
  const half = (b - a) / 2;
  const mid = (a + b) / 2;
  let sum = 0;
  for (let i = 0; i < RULE.nodes.length; i++) {
    sum += RULE.weights[i] * f(mid + half * RULE.nodes[i]);
  }
  return sum * half;
}

// The Gielis superformula: r(t) = (|cos(m t/4)|^n2 + |sin(m t/4)|^n3)^(-1/n1)
export function superRadius(t, p) {
  const a = Math.pow(Math.abs(Math.cos((p.m * t) / 4)), p.n2);
  const b = Math.pow(Math.abs(Math.sin((p.m * t) / 4)), p.n3);
  return Math.pow(a + b, -1 / p.n1);
}

export function superX(t, p) {
  return superRadius(t, p) * Math.cos(t);
}

export function superY(t, p) {
  return superRadius(t, p) * Math.sin(t);
}

export function profileCurve(p, samples = 360) {
  const x = new Float64Array(samples);
  const y = new Float64Array(samples);
  for (let i = 0; i < samples; i++) {
    const t = (2 * Math.PI * i) / samples;
    x[i] = superX(t, p);
    y[i] = superY(t, p);
  }
  return { x, y };
}

// f(s) = 1 / y_A(s), the anisotropic radius profile.
function radiusProfile(s, p) {
  return 1 / superY(s, p);
}

// f'(s) = -1 / y_A(s)^2
function radiusProfileDerivative(s, p) {
  const y = superY(s, p);
  return -1 / (y * y);
}

// v'(s), kept as the original's forward difference rather than an analytic derivative: this is
// what produced the 2011 shapes, and x_A' in closed form is unpleasant.
function sweepDerivative(s, p) {
  return (superX(s + DERIV_STEP, p) - superX(s, p)) / DERIV_STEP;
}

// g(s) = integral from 0.2 to s of v'(w) f'(w) dw — the height coordinate of the H surface.
function heightIntegral(s, p) {
  return integrate((w) => sweepDerivative(w, p) * radiusProfileDerivative(w, p), INTEGRAL_BASE, s);
}

function emptyGrid(rows, cols, closed) {
  return {
    rows,
    cols,
    position: new Float32Array(rows * cols * 3),
    finite: new Uint8Array(rows * cols),
    closed,
    nonFinite: 0,
  };
}

function writeVertex(grid, index, x, y, z) {
  const ok = Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z);
  grid.position[index * 3] = ok ? x : 0;
  grid.position[index * 3 + 1] = ok ? y : 0;
  grid.position[index * 3 + 2] = ok ? z : 0;
  grid.finite[index] = ok ? 1 : 0;
  if (!ok) grid.nonFinite++;
}

// The product surface: (y_A(s) x_B(t), y_A(s) y_B(t), x_A(s)) over s in [0, pi], t in [0, 2pi].
// No integration, so this is cheap enough to rebuild on every keystroke.
export function fSurface(a, b, rows, cols) {
  const grid = emptyGrid(rows, cols, true);
  const sStep = Math.PI / (rows - 1);
  const tStep = (2 * Math.PI) / cols;
  for (let i = 0; i < rows; i++) {
    const s = i * sStep;
    const ring = superY(s, a);
    const height = superX(s, a);
    for (let j = 0; j < cols; j++) {
      const t = j * tStep;
      writeVertex(grid, i * cols + j, ring * superX(t, b), ring * superY(t, b), height);
    }
  }
  return grid;
}

// The CAMC surface: (f(s) x_B(t), f(s) y_B(t), g(s)).
//
// g depends only on s, so it is computed once per row. The original called the integrator inside
// the inner loop, recomputing an identical 32-point quadrature for every column: same values,
// 40000 integrations instead of 200 at maximum resolution.
export function hSurface(a, b, { rows, cols, sMin, sMax, revolution }) {
  // Closing the seam is only correct when the sweep is a whole number of turns. The original
  // stitched the last column back to the first unconditionally, which welds a spurious sheet
  // across the opening at any other revolution.
  const turns = revolution / (2 * Math.PI);
  const closed = Math.abs(turns - Math.round(turns)) < 1e-6 && Math.round(turns) >= 1;

  const grid = emptyGrid(rows, cols, closed);
  const sStep = (sMax - sMin) / (rows - 1);
  const tStep = revolution / cols;

  for (let i = 0; i < rows; i++) {
    const s = sMin + i * sStep;
    const ring = radiusProfile(s, a);
    const height = heightIntegral(s, a);
    for (let j = 0; j < cols; j++) {
      const t = j * tStep;
      writeVertex(grid, i * cols + j, ring * superX(t, b), ring * superY(t, b), height);
    }
  }
  return grid;
}

// Reasons the parameters cannot produce a surface, as sentences fit to show the user.
// y_A(s) vanishes at both ends of [0, pi] and f = 1/y_A diverges there, which is exactly why the
// original hardcoded sMin = pi/6 and integrated from 0.2.
export function validate(state) {
  const problems = [];
  for (const [name, p] of [["A", state.a], ["B", state.b]]) {
    if (!(p.n1 > 0)) problems.push(`Profile ${name}: n1 must be greater than 0.`);
  }
  if (!(state.sMin > 0)) problems.push("s from must be greater than 0.");
  if (!(state.sMax < Math.PI)) problems.push("s to must be less than \u03c0.");
  if (!(state.sMin < state.sMax)) problems.push("s from must be less than s to.");
  if (!(state.rows >= 3)) problems.push("Rows must be at least 3.");
  if (!(state.cols >= 3)) problems.push("Columns must be at least 3.");
  if (!(state.revolution > 0)) problems.push("Revolution must be greater than 0.");
  return problems;
}
