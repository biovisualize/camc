// One WebGL context: scene, orthographic camera, orbit, and a render-on-demand loop.
//
// The camera is orthographic to keep the technical-drawing character of the original's ortho()
// call, and because perspective foreshortening on a self-intersecting surface reads as curvature
// that is not there.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { surfaceGeometry, wireGeometry } from "./geometry.js";

const BACKGROUND = 0x11151c;
const SURFACE = 0x7f9fc4;
const WIRE = 0xe4ecf5;
const BOX = 0x3a4653;
const INSET_BG = 0x0d1117; // used by the inset in Task 5; matches the profile canvases

export class ShapeViewer {
  constructor(canvas) {
    this.canvas = canvas;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    // The inset in Task 5 draws a second scene into a corner, so clearing is done by hand.
    this.renderer.autoClear = false;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(BACKGROUND);

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 1000);
    // z is the surface's height axis, as in the original, so z is the orbit axis. This must be
    // set before OrbitControls is constructed: it reads object.up once, when it builds its
    // update() closure, and never looks at it again.
    this.camera.up.set(0, 0, 1);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;

    this.scene.add(new THREE.HemisphereLight(0xcbd9ee, 0x20242b, 1.05));
    this.keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
    this.scene.add(this.keyLight);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.45));

    this.surfaceMaterial = new THREE.MeshStandardMaterial({
      color: SURFACE,
      roughness: 0.85,
      metalness: 0.0,
      // The CAMC surface is an open sheet that folds through itself, so both faces are visible.
      side: THREE.DoubleSide,
      // Push the fill back in depth so the wireframe drawn at the true surface depth wins the
      // depth test instead of z-fighting with it.
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    this.wireMaterial = new THREE.LineBasicMaterial({
      color: WIRE,
      transparent: true,
      opacity: 0.45,
    });

    this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), this.surfaceMaterial);
    this.wire = new THREE.LineSegments(new THREE.BufferGeometry(), this.wireMaterial);
    this.scene.add(this.mesh, this.wire);

    this.boxHelper = new THREE.Box3Helper(new THREE.Box3(), new THREE.Color(BOX));
    this.boxHelper.visible = true;
    this.scene.add(this.boxHelper);

    this._radius = 1;
    this._dirty = true;
    this._onResize = () => this._resize();
    window.addEventListener("resize", this._onResize);

    this._resize();
    this._animate();
  }

  setSurface(grid) {
    this.mesh.geometry.dispose();
    this.wire.geometry.dispose();
    this.mesh.geometry = surfaceGeometry(grid);
    this.wire.geometry = wireGeometry(grid);
    this.boxHelper.box.copy(this.mesh.geometry.boundingBox ?? new THREE.Box3());
    this.invalidate();
  }

  // Overridden in Task 5. Declared here so main.js can call it from the start.
  setInset() {}

  setOptions({ wireframe, box, inset } = {}) {
    if (wireframe !== undefined) this.wire.visible = wireframe;
    if (box !== undefined) this.boxHelper.visible = box;
    if (inset !== undefined) this._insetVisible = inset;
    this.invalidate();
  }

  // Refit the camera to the current surface. Called on load, on presets and on reset — not on
  // every slider tick, because re-framing mid-drag makes the shape appear to jump.
  frame() {
    const box = this.mesh.geometry.boundingBox;
    if (!box || box.isEmpty()) return;
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    this._radius = Math.max(sphere.radius, 1e-6);

    this.controls.target.copy(sphere.center);
    const direction = new THREE.Vector3(0.55, 0.35, 1).normalize();
    this.camera.position.copy(sphere.center).addScaledVector(direction, this._radius * 6);
    this.camera.near = 0.01 * this._radius;
    this.camera.far = this._radius * 24;
    this.camera.zoom = 1;
    this._applyFrustum();
    this.controls.update();
    this.invalidate();
  }

  _applyFrustum() {
    const w = this.canvas.clientWidth || 1;
    const h = this.canvas.clientHeight || 1;
    const extent = this._radius * 1.3;
    const aspect = w / h;
    this.camera.left = -extent * aspect;
    this.camera.right = extent * aspect;
    this.camera.top = extent;
    this.camera.bottom = -extent;
    this.camera.updateProjectionMatrix();
  }

  _resize() {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (w === 0 || h === 0) return;
    this.renderer.setSize(w, h, false);
    this._applyFrustum();
    this.invalidate();
  }

  // Mark the view as needing one more frame. The loop is otherwise idle, so a surface nobody is
  // touching costs no GPU work.
  invalidate() {
    this._dirty = true;
  }

  _animate() {
    requestAnimationFrame(() => this._animate());
    const moving = this.controls.update();
    if (!moving && !this._dirty) return;
    this._dirty = false;
    this._render();
  }

  _render() {
    this.keyLight.position.copy(this.camera.position);
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.renderer.setScissorTest(false);
    this.renderer.setViewport(0, 0, w, h);
    // autoClear is off so the inset can clear only its own corner, but scene.background is a
    // Color, and three.js forces a full-frame clear for that at the start of render() regardless.
    this.renderer.render(this.scene, this.camera);
  }
}
