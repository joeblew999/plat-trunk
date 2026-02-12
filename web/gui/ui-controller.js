// Responsive UI controller — manages mobile dock/sheet and desktop panel collapse.

window.cadUI = {
    activeTab: null,

    setTab(name) {
        const panel = document.getElementById('ui-panel');
        // Toggle: tapping active tab closes the sheet
        if (this.activeTab === name && panel.classList.contains('sheet-open')) {
            panel.classList.remove('sheet-open');
            this.activeTab = null;
            this._updateDock(null);
            return;
        }
        this.activeTab = name;
        panel.querySelectorAll('.tool-section').forEach(s => {
            s.classList.toggle('active', s.dataset.section === name);
        });
        panel.classList.add('sheet-open');
        this._updateDock(name);
    },

    _updateDock(name) {
        document.querySelectorAll('#mobile-dock button[data-tab]').forEach(btn => {
            btn.classList.toggle('dock-active', btn.dataset.tab === name);
        });
    },

    init() {
        // Close sheet when tapping canvas on mobile
        const canvas = document.getElementById('cad-canvas');
        if (canvas) {
            canvas.addEventListener('pointerdown', () => {
                if (window.innerWidth < 1024) {
                    const panel = document.getElementById('ui-panel');
                    if (panel.classList.contains('sheet-open')) {
                        panel.classList.remove('sheet-open');
                        this.activeTab = null;
                        this._updateDock(null);
                    }
                }
            });
        }
        // Reset state when crossing lg breakpoint
        window.matchMedia('(min-width: 1024px)').addEventListener('change', (e) => {
            if (e.matches) {
                const panel = document.getElementById('ui-panel');
                panel.classList.remove('sheet-open');
                panel.querySelectorAll('.tool-section').forEach(s => s.classList.remove('active'));
                this.activeTab = null;
            }
        });
    }
};

document.addEventListener('DOMContentLoaded', () => cadUI.init());
