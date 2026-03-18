/**
 * <cad-viewport> — Lit Web Component: the "Conductor" of the 3D engine (ADR-0013).
 *
 * Architecture (Passive WASM):
 *   JS owns the camera (Three.js OrbitControls) → pushes matrix to WASM each frame
 *   WASM just renders with the camera it receives — no event loop in Rust
 *
 * Datastar → Lit bridge (data-attr pattern from datastar-lit-examples):
 *   Datastar signal mutation
 *     → data-attr:selected-id="$selectedId" calls JSON.stringify()
 *     → sets HTML attribute on <cad-viewport>
 *     → Lit @property({ type: String }) auto-parses
 *     → updated() lifecycle reacts
 *
 * Gizmo traffic controller:
 *   On gizmo drag start → controls.enabled = false (lock orbit)
 *   On gizmo drag end   → controls.enabled = true  (unlock orbit)
 */
import { LitElement, html } from 'lit';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { startTierManager, touchObject } from './tier-manager';
import { cadDocManager } from './history-ui';
import { MODEL_ID } from './app-config';
import { setSceneController, getSceneController } from './scene-controller';

export class CadViewport extends LitElement {
  /**
   * Reactive properties — fed by Datastar via data-attr:
   *   <cad-viewport data-attr:selected-id="$selectedId"
   *                 data-attr:object-count="$objectCount"
   *                 data-attr:scene-empty="$sceneEmpty">
   *
   * Datastar's data-attr calls JSON.stringify() internally, which runs inside
   * the reactive effect and tracks all nested dependencies. Lit's type converters
   * then parse the JSON back (String, Number, Boolean).
   */
  static properties = {
    selectedId:  { type: String, attribute: 'selected-id' },
    objectCount: { type: Number, attribute: 'object-count' },
    sceneEmpty:  { type: Boolean, attribute: 'scene-empty' },
  };

  /* No static styles — Light DOM means styles come from the page stylesheet.
   * WebGPU requires <canvas> in main document for requestAdapter()/getContext('webgpu').
   * Shadow DOM would break WASM rendering. */
  createRenderRoot() {
    return this;
  }

  // TypeScript property declarations (Lit reactive props declared via static properties above)
  declare selectedId: string;
  declare objectCount: number;
  declare sceneEmpty: boolean;
  // Three.js engine state
  declare camera: THREE.PerspectiveCamera;
  declare controls: OrbitControls | null;
  declare rafId: number | null;
  declare _resizeObserver: ResizeObserver;
  // Gizmo interaction state
  declare _isDraggingGizmo: boolean;
  declare _prevNdc: [number, number];
  // Camera dirty check
  declare _lastMatrix: number[] | null;
  // Camera animation
  declare _targetCamPos: THREE.Vector3;
  declare _targetLookAt: THREE.Vector3;
  declare _isAnimating: boolean;

  constructor() {
    super();
    // Datastar-driven properties (defaults)
    this.selectedId = '';
    this.objectCount = 0;
    this.sceneEmpty = true;

    // Three.js camera — JS owns this, pushes to WASM each frame
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.01, 100);
    this.camera.position.set(1.5, 1.5, 1.5);
    this.camera.lookAt(0, 0, 0);
    this.controls = null;
    this.rafId = null;

    // Gizmo traffic controller state
    this._isDraggingGizmo = false;
    this._prevNdc = [0, 0];

    // Camera dirty check — skip cadCommand if unchanged
    this._lastMatrix = null;

    // Camera animation (zoom-to-fit)
    this._targetCamPos = new THREE.Vector3();
    this._targetLookAt = new THREE.Vector3();
    this._isAnimating = false;
  }

  /**
   * Lit updated() lifecycle — reacts to Datastar signal changes.
   * This is the Datastar → Lit → WASM bridge: when a Datastar signal mutates,
   * data-attr sets the attribute, Lit parses it, and updated() fires.
   */
  updated(changedProperties: Map<PropertyKey, unknown>) {
    if (changedProperties.has('selectedId')) {
      // Tell WASM which object is selected (for highlight rendering)
      if (getSceneController()) {
        try {
          getSceneController().select(this.selectedId || '');
        } catch (_) { /* select may not exist yet */ }
      }
    }
  }

  async firstUpdated() {
    const canvas = this.querySelector('#cad-canvas');
    if (!canvas) return;

    // Check WebGPU support
    if (!(navigator as any).gpu) {
      const msg = 'WebGPU not supported. Use Chrome, Edge, or Safari 17+.';
      console.error(msg);
      if (window.showFeedbackSignal) window.showFeedbackSignal(msg, true);
      return;
    }

    // Initialize WASM — __wasmInit and __SceneController set by index.html <script>
    if (window.__wasmInit) {
      try {
        await window.__wasmInit();
        const controller = await new window.__SceneController('cad-canvas');
        controller.run();
        setSceneController(controller); // notifies all waiters + sets window.sceneController
        // Register with Module Router (ADR-0019) — the single WASM gate
        if (window.moduleRouter) {
          window.moduleRouter.register('core', controller);
        }
        console.log('[cad-viewport] WASM SceneController ready');
        // Start tier manager (ADR-0025 Phase 2)
        startTierManager(MODEL_ID);
        if (window.reconcile) window.reconcile({});
      } catch (err) {
        console.error('[cad-viewport] WASM init failed:', err);
      }
    }

    // Setup OrbitControls on the canvas
    this.controls = new OrbitControls(this.camera, canvas as HTMLElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;

    // Gizmo + pick interaction
    this._setupInteraction(canvas as HTMLElement);

    // Resize observer — update camera aspect ratio
    this._resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width === 0 || height === 0) continue;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
      }
    });
    this._resizeObserver.observe(this);

    // Sync initial camera from WASM (if Rust has a default camera)
    this._syncFromWasm();

    // Start the render loop
    this._startLoop();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._resizeObserver) this._resizeObserver.disconnect();
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  // ── Helpers ──────────────────────────────────────────────────────

  /** Convert mouse event to NDC [-1,1] coordinates */
  _toNdc(e: MouseEvent, canvas: HTMLElement): [number, number] {
    const rect = canvas.getBoundingClientRect();
    const x = (2 * (e.clientX - rect.left) / rect.width) - 1;
    const y = 1 - (2 * (e.clientY - rect.top) / rect.height);
    return [x, y];
  }

  // ── Gizmo Traffic Controller ─────────────────────────────────────

  _setupInteraction(canvas: HTMLElement): void {
    canvas.addEventListener('pointerdown', (e: PointerEvent) => {
      if (e.button !== 0 || !getSceneController()) return;
      const [ndcX, ndcY] = this._toNdc(e, canvas);

      // Boolean pick-B mode: skip gizmo
      const r = window._ds?.root;
      const pickingB = r?.boolSelA && !r?.boolSelB;

      // Try gizmo hit first (only if something is selected and not picking B)
      if (!pickingB && getSceneController().get_interaction_mode() === 'selected') {
        const axis = getSceneController().begin_gizmo_drag(ndcX, ndcY);
        if (axis) {
          this._isDraggingGizmo = true;
          this.controls!.enabled = false; // LOCK orbit during gizmo drag
          this._prevNdc = [ndcX, ndcY];
          canvas.style.cursor = 'grabbing';
          canvas.setPointerCapture(e.pointerId);
          e.stopPropagation();
          return;
        }
      }

      // Standard pick + select (cadQuery is sync — cadCommand returns a Promise)
      const result = window.cadQuery('pick_at', { ndcX, ndcY });
      const pickedId = (result && result.pickedId) || '';
      if (pickedId) touchObject(pickedId);
      window.cadQuery('select', { id: pickedId });
    });

    canvas.addEventListener('pointermove', (e: PointerEvent) => {
      if (!this._isDraggingGizmo || !getSceneController()) return;
      const [ndcX, ndcY] = this._toNdc(e, canvas);

      // Push latest camera to WASM before gizmo calc (ray parity)
      this._syncCameraToWasm();

      getSceneController().update_gizmo_drag(ndcX, ndcY, this._prevNdc[0], this._prevNdc[1]);
      this._prevNdc = [ndcX, ndcY];
      e.stopPropagation();
    });

    canvas.addEventListener('pointerup', (e: PointerEvent) => {
      if (!this._isDraggingGizmo || !getSceneController()) return;
      this._isDraggingGizmo = false;
      this.controls!.enabled = true; // UNLOCK orbit
      canvas.style.cursor = '';
      canvas.releasePointerCapture(e.pointerId);

      const result = getSceneController().end_gizmo_drag();
      if (result && result.objectId && cadDocManager?._sync?.modelId) {
        cadDocManager.record('translate', {
          objectId: result.objectId,
          dx: result.dx, dy: result.dy, dz: result.dz,
        });
      }
      if (window.reconcile) window.reconcile({});
      e.stopPropagation();
    });

    // Escape: cancel gizmo or deselect
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this._isDraggingGizmo && getSceneController()) {
          this._isDraggingGizmo = false;
          this.controls!.enabled = true;
          canvas.style.cursor = '';
          getSceneController().cancel_gizmo_drag();
        } else if (getSceneController()) {
          window.cadQuery('deselect', {});
        }
        e.preventDefault();
      }
    });
  }

  // ── Camera Sync ──────────────────────────────────────────────────

  /** Read initial camera from WASM's get_state (one-time bootstrap) */
  _syncFromWasm() {
    if (!window.cadQuery || !getSceneController()) {
      setTimeout(() => this._syncFromWasm(), 100);
      return;
    }
    const state = window.cadQuery('get_state', {});
    if (state && state.camera) {
      const c = state.camera;
      this.camera.matrixWorld.fromArray(c.matrixWorld);
      this.camera.matrixWorld.decompose(this.camera.position, this.camera.quaternion, this.camera.scale);
      this.camera.fov = c.fovDeg;
      this.camera.near = c.near;
      this.camera.far = c.far;
      this.camera.updateProjectionMatrix();
      if (this.controls) {
        // Set OrbitControls target to the origin (default look-at)
        this.controls.target.set(0, 0, 0);
        this.controls.update();
      }
    }
  }

  /** Push Three.js camera to WASM — skips if unchanged (dirty check) */
  _syncCameraToWasm() {
    if (!window.cadQuery) return;
    this.camera.updateMatrixWorld();
    const matrix = this.camera.matrixWorld.elements; // column-major Float32Array

    // Dirty check: skip if matrix hasn't changed
    if (this._lastMatrix) {
      let changed = false;
      for (let i = 0; i < 16; i++) {
        if (Math.abs(this._lastMatrix[i] - matrix[i]) > 1e-6) {
          changed = true;
          break;
        }
      }
      if (!changed) return;
    }
    this._lastMatrix = Array.from(matrix);

    window.cadQuery('set_camera', {
      matrixWorld: this._lastMatrix,
      fovDeg: this.camera.fov,
      near: this.camera.near,
      far: this.camera.far,
    });
  }

  // ── Render Loop ──────────────────────────────────────────────────

  _startLoop() {
    const loop = () => {
      // Camera animation (zoom-to-fit)
      if (this._isAnimating) {
        const t = 0.1;
        this.camera.position.lerp(this._targetCamPos, t);
        this.controls!.target.lerp(this._targetLookAt, t);
        if (this.camera.position.distanceTo(this._targetCamPos) < 0.01 &&
            this.controls!.target.distanceTo(this._targetLookAt) < 0.01) {
          this._isAnimating = false;
        }
      }

      // Update OrbitControls (damping) when not gizmo-dragging
      if (this.controls && this.controls.enabled) {
        this.controls.update();
      }

      // Push camera to WASM
      this._syncCameraToWasm();

      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  // ── Public API ───────────────────────────────────────────────────

  /**
   * Zoom camera to focus on an object or the entire scene.
   * @param {string|null} objectId - Object to focus, or null for extents
   */
  zoomTo(objectId = null) {
    if (!window.cadQuery) return;
    const res = window.cadQuery('get_state', {});
    if (!res) return;

    // For now, zoom to scene center with a reasonable distance
    const targetLookAt = new THREE.Vector3(0, 0, 0);
    const currentDir = new THREE.Vector3()
      .subVectors(this.camera.position, this.controls!.target)
      .normalize();
    if (currentDir.lengthSq() < 0.01) currentDir.set(1, 1, 1).normalize();

    const dist = 3.0; // Default distance
    const targetCamPos = new THREE.Vector3()
      .copy(targetLookAt)
      .add(currentDir.multiplyScalar(dist));

    this._targetCamPos.copy(targetCamPos);
    this._targetLookAt.copy(targetLookAt);
    this._isAnimating = true;
  }

  // ── Template ─────────────────────────────────────────────────────

  render() {
    // Light DOM render — Datastar data-attr feeds selectedId/objectCount/sceneEmpty
    // Lit re-renders the HUD overlay reactively (same pattern as scene-viewer in datastar-lit-examples)
    return html`
      <canvas id="cad-canvas" data-testid="cad-canvas"></canvas>
      <div class="viewport-hud" data-testid="viewport-hud">
        ${this.selectedId
          ? html`<span class="hud-selected">${this.selectedId.slice(0, 8)}</span>`
          : ''}
        <span class="hud-count">${this.objectCount} obj</span>
      </div>
    `;
  }
}

customElements.define('cad-viewport', CadViewport);
