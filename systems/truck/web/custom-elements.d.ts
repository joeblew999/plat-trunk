// custom-elements.d.ts — Ambient type declarations for custom elements.
// No imports — this is a pure ambient file so augmentations apply globally.
// Referenced by tsconfig include pattern.

interface CadGalleryElement extends HTMLElement {
  refresh(): void;
}

interface CadViewportElement extends HTMLElement {
  camera: import('three').PerspectiveCamera | null;
  zoomTo(objectId: string): void;
}

declare global {
  interface HTMLElementTagNameMap {
    'cad-gallery': CadGalleryElement;
    'cad-viewport': CadViewportElement;
  }
}
