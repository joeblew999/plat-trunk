// thumbnail.js — Canvas capture + upload for gallery thumbnails.
// Captures the WebGPU canvas via a 2D canvas intermediary (drawImage),
// which reliably reads the composited frame. Debounced to avoid flooding
// on rapid edits.

const THUMB_W = 320;
const THUMB_H = 180;
let latestThumbnail = null;
let debounceTimer = null;

/** Capture the WebGPU canvas as a small PNG Blob (320×180). */
export async function captureCanvasThumbnail(canvasId = 'cad-canvas') {
    const src = document.getElementById(canvasId);
    if (!src || !src.width || !src.height) return null;
    const tmp = document.createElement('canvas');
    tmp.width = THUMB_W;
    tmp.height = THUMB_H;
    const ctx = tmp.getContext('2d');
    ctx.drawImage(src, 0, 0, THUMB_W, THUMB_H);
    return new Promise(resolve => tmp.toBlob(resolve, 'image/png'));
}

/** Upload a PNG Blob to the thumbnail API (raw fetch, not hono client). */
export async function uploadThumbnail(modelId, blob) {
    const res = await fetch(`/api/models/${modelId}/thumbnail`, {
        method: 'PUT',
        body: blob,
        headers: { 'Content-Type': 'image/png' },
    });
    return res.ok;
}

/** Get the latest debounced thumbnail Blob (may be null). */
export function getLatestThumbnail() {
    return latestThumbnail;
}

/** Schedule a debounced thumbnail capture (1s). Call after scene mutations. */
export function scheduleThumbnailCapture() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
        const blob = await captureCanvasThumbnail();
        if (blob && blob.size > 0) latestThumbnail = blob;
    }, 1000);
}
