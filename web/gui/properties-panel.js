// Properties panel — reads/writes object style via WASM SceneController.
// Desktop: right-side panel (#props-panel).
// Mobile: inline controls inside Scene section (#mobile-style-section).

(function () {
    'use strict';

    // Desktop control IDs
    const DESKTOP = {
        color: 'propColor',
        opacity: 'propOpacity',
        opacityVal: 'propOpacityVal',
        roughness: 'propRoughness',
        roughnessVal: 'propRoughnessVal',
        reflectance: 'propReflectance',
        reflectanceVal: 'propReflectanceVal',
        objectId: 'props-object-id',
        empty: 'props-empty',
        content: 'props-content',
    };

    // Mobile control IDs
    const MOBILE = {
        color: 'mobilePropColor',
        opacity: 'mobilePropOpacity',
        opacityVal: 'mobilePropOpacityVal',
        roughness: 'mobilePropRoughness',
        roughnessVal: 'mobilePropRoughnessVal',
        reflectance: 'mobilePropReflectance',
        reflectanceVal: 'mobilePropReflectanceVal',
        objectId: 'mobile-props-id',
        section: 'mobile-style-section',
    };

    function el(id) { return document.getElementById(id); }
    function ctrl() { return window.sceneController; }

    function rgbToHex(r, g, b) {
        const toHex = v => Math.round(v * 255).toString(16).padStart(2, '0');
        return '#' + toHex(r) + toHex(g) + toHex(b);
    }

    function hexToRgb(hex) {
        return [
            parseInt(hex.slice(1, 3), 16) / 255,
            parseInt(hex.slice(3, 5), 16) / 255,
            parseInt(hex.slice(5, 7), 16) / 255,
        ];
    }

    window.propsPanel = {
        _currentObjectId: null,

        /** Called when selection changes. objectId may be null. */
        onSelectionChanged(objectId) {
            this._currentObjectId = objectId;

            // Desktop panel
            const panel = el('props-panel');
            const empty = el(DESKTOP.empty);
            const content = el(DESKTOP.content);

            // Mobile section
            const mobileSection = el(MOBILE.section);

            if (!objectId) {
                // No selection — hide everything
                if (empty) empty.style.display = '';
                if (content) content.style.display = 'none';
                if (panel) panel.classList.add('props-hidden');
                if (mobileSection) mobileSection.style.display = 'none';
                return;
            }

            // Show panels
            if (panel) panel.classList.remove('props-hidden');
            if (empty) empty.style.display = 'none';
            if (content) content.style.display = '';
            if (mobileSection) mobileSection.style.display = '';

            // Populate controls from WASM
            this._populateFromObject(objectId);
        },

        _populateFromObject(objectId) {
            if (!ctrl()) return;
            const json = ctrl().get_object_style(objectId);
            if (!json) return;

            let style;
            try { style = JSON.parse(json); } catch { return; }

            const shortId = objectId.slice(0, 8) + '...';
            const hex = rgbToHex(style.albedo[0], style.albedo[1], style.albedo[2]);
            const alpha = style.albedo[3];

            // Update desktop controls
            this._setControlValues(DESKTOP, hex, alpha, style.roughness, style.reflectance, shortId);
            // Update mobile controls
            this._setControlValues(MOBILE, hex, alpha, style.roughness, style.reflectance, shortId);
        },

        _setControlValues(ids, hex, alpha, roughness, reflectance, label) {
            const color = el(ids.color);
            if (color) color.value = hex;

            const opacity = el(ids.opacity);
            if (opacity) opacity.value = alpha;
            const opacityVal = el(ids.opacityVal);
            if (opacityVal) opacityVal.textContent = alpha.toFixed(2);

            const rough = el(ids.roughness);
            if (rough) rough.value = roughness;
            const roughVal = el(ids.roughnessVal);
            if (roughVal) roughVal.textContent = roughness.toFixed(2);

            const refl = el(ids.reflectance);
            if (refl) refl.value = reflectance;
            const reflVal = el(ids.reflectanceVal);
            if (reflVal) reflVal.textContent = reflectance.toFixed(2);

            const idEl = el(ids.objectId);
            if (idEl) idEl.textContent = 'Object: ' + label;
        },

        /** Build style object from a set of control IDs */
        _readStyle(ids) {
            const hex = el(ids.color)?.value || '#3399ff';
            const [r, g, b] = hexToRgb(hex);
            const a = parseFloat(el(ids.opacity)?.value ?? 1);
            const roughness = parseFloat(el(ids.roughness)?.value ?? 0.3);
            const reflectance = parseFloat(el(ids.reflectance)?.value ?? 0.5);
            return {
                albedo: [r, g, b, a],
                roughness,
                reflectance,
                ambient_ratio: 0.05,
            };
        },

        /** Apply style from a set of controls to the selected object */
        _applyFromControls(sourceIds, commit) {
            if (!this._currentObjectId || !ctrl()) return;

            const style = this._readStyle(sourceIds);

            // Apply live to WASM
            ctrl().set_object_style(this._currentObjectId, JSON.stringify(style));

            // Sync the other set of controls
            const hex = el(sourceIds.color)?.value || '#3399ff';
            const targetIds = sourceIds === DESKTOP ? MOBILE : DESKTOP;
            this._setControlValues(targetIds, hex, style.albedo[3], style.roughness, style.reflectance,
                (this._currentObjectId || '').slice(0, 8) + '...');

            // Update value labels on source controls too
            const opVal = el(sourceIds.opacityVal);
            if (opVal) opVal.textContent = style.albedo[3].toFixed(2);
            const rVal = el(sourceIds.roughnessVal);
            if (rVal) rVal.textContent = style.roughness.toFixed(2);
            const rfVal = el(sourceIds.reflectanceVal);
            if (rfVal) rfVal.textContent = style.reflectance.toFixed(2);

            if (commit) {
                this._commitToAutomerge(style);
            }
        },

        _commitToAutomerge(style) {
            // Record in Automerge op log (WASM already applied during live preview)
            const mgr = window.cadDocManager?.handle ? window.cadDocManager : null;
            if (mgr) {
                mgr.record('set_style', {
                    objectId: this._currentObjectId,
                    style: style,
                });
            }
        },

        _bindControls(ids) {
            const colorEl = el(ids.color);
            if (colorEl) {
                colorEl.addEventListener('input', () => this._applyFromControls(ids, false));
                colorEl.addEventListener('change', () => this._applyFromControls(ids, true));
            }
            [ids.opacity, ids.roughness, ids.reflectance].forEach(id => {
                const slider = el(id);
                if (slider) {
                    slider.addEventListener('input', () => this._applyFromControls(ids, false));
                    slider.addEventListener('change', () => this._applyFromControls(ids, true));
                }
            });
        },

        init() {
            this._bindControls(DESKTOP);
            this._bindControls(MOBILE);
        },
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => window.propsPanel.init());
    } else {
        window.propsPanel.init();
    }
})();
