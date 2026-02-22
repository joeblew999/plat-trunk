import { LitElement, html, css } from './vendor/lit.js';
import * as THREE from './vendor/three.js';
import { OrbitControls } from './vendor/three.js';

/**
 * CadViewport — The "Conductor" of the 3D engine.
 * Owns the Three.js camera and OrbitControls, and pushes matrices to WASM.
 * Also handles Gizmo traffic control (Orbit vs Drag).
 */
export class CadViewport extends LitElement {
  static properties = {
    litState: { type: Object }
  };

  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      position: relative;
      overflow: hidden;
    }
    canvas {
      display: block;
      width: 100%;
      height: 100%;
      touch-action: none;
    }
  `;

  constructor() {
    super();
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 20000);
    this.camera.position.set(5, 5, 5);
    this.camera.lookAt(0, 0, 0);
    this.controls = null;
    this.rafId = null;
    
    // Gizmo state
    this._isDraggingGizmo = false;
    this._prevNdc = [0, 0];
    this._lastMatrix = null;

    // Camera animation
    this._targetCamPos = new THREE.Vector3();
    this._targetLookAt = new THREE.Vector3();
    this._isAnimating = false;
  }

  createRenderRoot() {
    return this;
  }

  updated(changedProperties) {
    if (changedProperties.has('litState')) {
      // console.log('[Viewport] litState changed:', this.litState);
    }
  }

  /**
   * Zoom camera to focus on a specific object or the entire scene.
   * @param {string|null} objectId - ID of object to focus on, or null for extents.
   */
  async zoomTo(objectId = null) {
    if (!window.cadCommand) return;
    const res = window.cadCommand('get_bounding_sphere', { objectId }, { ephemeral: true, skipAutomerge: true });
    if (!res || !res.sphere) return;

    const { center, radius } = res.sphere;
    const targetLookAt = new THREE.Vector3(...center);
    
    // Calculate optimal camera distance based on radius and FOV
    // dist = radius / sin(fov/2)
    const fovRad = (this.camera.fov * Math.PI) / 180;
    let dist = (radius || 1) / Math.sin(fovRad / 2);
    dist *= 1.2; // Add some padding

    // Maintain current relative direction from target
    const currentDir = new THREE.Vector3().subVectors(this.camera.position, this.controls.target).normalize();
    if (currentDir.lengthSq() < 0.1) currentDir.set(1, 1, 1).normalize();
    
    const targetCamPos = new THREE.Vector3().copy(targetLookAt).add(currentDir.multiplyScalar(dist));

    // Start animation
    this._targetCamPos.copy(targetCamPos);
    this._targetLookAt.copy(targetLookAt);
    this._isAnimating = true;
    console.log(`[Viewport] Animating to focus ${objectId || 'extents'}`, { targetCamPos, targetLookAt });
  }

  zoomToExtents() {
    return this.zoomTo(null);
  }

  async firstUpdated() {
    const canvas = this.querySelector('#cad-canvas');
    if (!canvas) return;

    // 0. Check for WebGPU support
    if (!navigator.gpu) {
      const msg = "WebGPU not supported. Use Chrome, Edge, or Safari 17+.";
      console.error(msg);
      showFeedbackSignal(msg, true);
      return;
    }

    // 1. Initialize WASM
    if (window.__wasmInit) {
      try {
        await window.__wasmInit();
        const controller = await new window.__SceneController("cad-canvas");
        controller.run();
        window.sceneController = controller;
        console.log("WASM SceneController ready (Managed by Lit)");
        if (window.reconcile) window.reconcile({});
      } catch (err) {
        console.error("WASM Init failed:", err);
      }
    }

    // 2. Setup Camera Controls
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    
    // 3. Setup Interaction (Traffic Controller)
    this._setupInteraction(canvas);

    // 4. Robust Resize handling
    this._resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        if (width === 0 || height === 0) continue;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        console.log(`[Viewport] Resized to ${width}x${height}`);
      }
    });
    this._resizeObserver.observe(this);

    this.syncFromWasm();
    this.startLoop();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._resizeObserver) this._resizeObserver.disconnect();
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  _toNdc(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    const x = (2 * (e.clientX - rect.left) / rect.width) - 1;
    const y = 1 - (2 * (e.clientY - rect.top) / rect.height);
    return [x, y];
  }

  _setupInteraction(canvas) {
    canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || !window.sceneController) return;
      const [ndcX, ndcY] = this._toNdc(e, canvas);

      // Check if we should pick B for boolean
      const r = window._ds?.root;
      const pickingB = r?.boolSelA && !r?.boolSelB;

      // Try to hit gizmo if an object is selected
      if (!pickingB && window.sceneController.get_interaction_mode() === 'selected') {
        const axis = window.sceneController.begin_gizmo_drag(ndcX, ndcY);
        if (axis) {
          console.log(`[Viewport] Gizmo drag start: ${axis}`);
          this._isDraggingGizmo = true;
          this.controls.enabled = false; // LOCK ORBIT
          this._prevNdc = [ndcX, ndcY];
          canvas.style.cursor = 'grabbing';
          canvas.setPointerCapture(e.pointerId);
          e.stopPropagation();
          return;
        }
      }

      // If not gizmo, perform standard pick+select
      const { pickedId } = window.cadCommand('pick_at', { ndcX, ndcY }, { ephemeral: true });
      window.cadCommand('select', { id: pickedId || '' }, { ephemeral: true });
    });

    canvas.addEventListener('pointermove', (e) => {
      if (!this._isDraggingGizmo || !window.sceneController) return;
      const [ndcX, ndcY] = this._toNdc(e, canvas);
      
      // Update camera in WASM before gizmo calculation to ensure ray parity
      this.syncCamera();
      
      window.sceneController.update_gizmo_drag(ndcX, ndcY, this._prevNdc[0], this._prevNdc[1]);
      this._prevNdc = [ndcX, ndcY];
      e.stopPropagation();
    });

    canvas.addEventListener('pointerup', (e) => {
      if (!this._isDraggingGizmo || !window.sceneController) return;
      this._isDraggingGizmo = false;
      this.controls.enabled = true; // UNLOCK ORBIT
      canvas.style.cursor = '';
      canvas.releasePointerCapture(e.pointerId);

      const result = window.sceneController.end_gizmo_drag();
      if (result && result.objectId) {
        if (window.cadDocManager?.handle) {
          window.cadDocManager.record('translate', {
            objectId: result.objectId,
            dx: result.dx, dy: result.dy, dz: result.dz,
          });
        }
      }
      if (window.reconcile) window.reconcile({});
      e.stopPropagation();
    });

    // Keyboard helpers
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this._isDraggingGizmo && window.sceneController) {
          this._isDraggingGizmo = false;
          this.controls.enabled = true;
          canvas.style.cursor = '';
          window.sceneController.cancel_gizmo_drag();
        } else if (window.sceneController) {
          window.cadCommand('deselect', {}, { ephemeral: true });
        }
        e.preventDefault();
      }
    });
  }

  async syncFromWasm() {
    if (!window.cadCommand || !window.sceneController) {
      setTimeout(() => this.syncFromWasm(), 100);
      return;
    }
    const state = window.cadCommand('get_state', {}, { ephemeral: true, skipAutomerge: true });
    if (state && state.camera) {
      const c = state.camera;
      this.camera.matrixWorld.fromArray(c.matrix_world);
      this.camera.matrixWorld.decompose(this.camera.position, this.camera.quaternion, this.camera.scale);
      this.camera.fov = c.fov_deg;
      this.camera.near = c.near;
      this.camera.far = c.far;
      this.camera.updateProjectionMatrix();
      if (this.controls) this.controls.update();
    }
  }

  startLoop() {
    const loop = () => {
      if (this._isAnimating) {
        const lerpFactor = 0.1;
        this.camera.position.lerp(this._targetCamPos, lerpFactor);
        this.controls.target.lerp(this._targetLookAt, lerpFactor);
        
        if (this.camera.position.distanceTo(this._targetCamPos) < 0.01 && 
            this.controls.target.distanceTo(this._targetLookAt) < 0.01) {
          this._isAnimating = false;
          console.log("[Viewport] Camera animation complete");
        }
      }

      if (this.controls && this.controls.enabled) {
        this.controls.update();
      }
      this.syncCamera();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  syncCamera() {
    if (!window.cadCommand) return;
    this.camera.updateMatrixWorld();
    const matrix = this.camera.matrixWorld.elements;

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
    
    window.cadCommand('set_camera', {
      matrix_world: this._lastMatrix,
      fov_deg: this.camera.fov,
      near: this.camera.near,
      far: this.camera.far
    }, { ephemeral: true, skipAutomerge: true });
  }

  render() {
    return html`<canvas id="cad-canvas" data-testid="cad-canvas"></canvas>`;
  }
}

customElements.define('cad-viewport', CadViewport);
