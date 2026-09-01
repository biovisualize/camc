// Wraps the pure topology in three.js buffers. Nothing here decides anything.
import * as THREE from "three";

import { surfaceIndices, wireSegments } from "./topology.js";

export function surfaceGeometry(grid) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(grid.position, 3));
  geometry.setIndex(surfaceIndices(grid));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

export function wireGeometry(grid) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(wireSegments(grid), 3));
  return geometry;
}
