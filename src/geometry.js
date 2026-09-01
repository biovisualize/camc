// Wraps the pure topology in three.js buffers. Nothing here decides anything.
import * as THREE from "three";

import { surfaceIndices, wireSegments } from "./topology.js";

export function surfaceGeometry(grid) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(grid.position, 3));
  geometry.setIndex(surfaceIndices(grid));
  geometry.computeVertexNormals();
  setBounds(geometry, grid);
  return geometry;
}

export function wireGeometry(grid) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(wireSegments(grid), 3));
  return geometry;
}

// A dropped vertex is stored as the origin, and three.js's own computeBoundingBox would fold those
// origins into the bounds, pulling the box — and with it the camera framing — toward a point the
// surface need not pass through at all. Only the vertices the grid vouches for are counted. The
// fallback keeps a fully degenerate grid from handing the camera an empty box to frame.
function setBounds(geometry, grid) {
  const box = new THREE.Box3();
  const point = new THREE.Vector3();
  for (let k = 0; k < grid.finite.length; k++) {
    if (grid.finite[k] !== 1) continue;
    box.expandByPoint(point.fromArray(grid.position, k * 3));
  }
  if (box.isEmpty()) box.setFromCenterAndSize(new THREE.Vector3(), new THREE.Vector3(1, 1, 1));
  geometry.boundingBox = box;
  geometry.boundingSphere = box.getBoundingSphere(new THREE.Sphere());
}
