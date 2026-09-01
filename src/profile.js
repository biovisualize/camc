// The 2D superformula profile, drawn to a plain 2D canvas. This is a rectangle, two axes and a
// polyline, so it needs no WebGL.

// Without a build step the palette cannot be shared with the stylesheet, so these mirror
// src/style.css, which is the source of truth. AXIS sits between --line and --muted and has no
// counterpart there; it exists only to keep the axes from competing with the curve.
const BORDER = "#262e39";
const AXIS = "#2f3a47";
const CURVE = "#e4ecf5";

export function drawProfile(canvas, curve) {
  const cssSize = canvas.clientWidth;
  if (cssSize === 0) return;
  const dpr = Math.min(window.devicePixelRatio, 2);

  // Only resize the backing store when it actually changed; assigning width clears the canvas.
  if (canvas.width !== Math.round(cssSize * dpr)) {
    canvas.width = Math.round(cssSize * dpr);
    canvas.height = Math.round(cssSize * dpr);
  }

  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssSize, cssSize);

  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, cssSize - 1, cssSize - 1);

  const mid = cssSize / 2;
  ctx.strokeStyle = AXIS;
  ctx.beginPath();
  ctx.moveTo(mid, 0);
  ctx.lineTo(mid, cssSize);
  ctx.moveTo(0, mid);
  ctx.lineTo(cssSize, mid);
  ctx.stroke();

  // One scale for both axes, as the original did, so the curve keeps its true proportions.
  let extent = 0;
  for (let i = 0; i < curve.x.length; i++) {
    if (Number.isFinite(curve.x[i])) extent = Math.max(extent, Math.abs(curve.x[i]));
    if (Number.isFinite(curve.y[i])) extent = Math.max(extent, Math.abs(curve.y[i]));
  }
  if (!(extent > 0)) return;

  const scale = (cssSize / 2 - 6) / extent;
  ctx.strokeStyle = CURVE;
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  let started = false;
  for (let i = 0; i <= curve.x.length; i++) {
    const k = i % curve.x.length; // close the loop back to the first sample
    const px = curve.x[k];
    const py = curve.y[k];
    if (!Number.isFinite(px) || !Number.isFinite(py)) {
      started = false;
      continue;
    }
    const sx = mid + px * scale;
    const sy = mid - py * scale; // screen y grows downward
    if (started) ctx.lineTo(sx, sy);
    else ctx.moveTo(sx, sy);
    started = true;
  }
  ctx.stroke();
}
