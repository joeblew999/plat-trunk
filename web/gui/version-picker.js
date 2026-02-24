/**
 * Version picker — self-contained module for the GUI version dropdown.
 *
 * Reads /api/health (current version) and /versions.json (all versions),
 * then populates the #versionBadge and #versionMenu elements.
 *
 * Usage: import in a <script type="module"> or load via <script src="version-picker.js">.
 * Expects two DOM elements: #versionBadge and #versionMenu.
 */

(function initVersionPicker() {
    var badge = document.getElementById('versionBadge');
    var menu = document.getElementById('versionMenu');
    if (!badge && !menu) return;

    var isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

    Promise.all([
        fetch('/api/health').then(function(r) { return r.json(); }).catch(function() { return {}; }),
        fetch('/versions.json').then(function(r) { return r.json(); }).catch(function() { return { versions: [] }; })
    ]).then(function(results) {
        var health = results[0];
        var manifest = results[1];
        var current = health.version || '?';

        // Badge label
        if (badge) {
            badge.textContent = isLocal ? 'local' : 'v' + current;
            badge.title = (isLocal ? 'Local dev' : 'v' + current) + ' — click to switch versions';
        }

        // Dropdown menu
        if (!menu || !manifest.versions || manifest.versions.length === 0) return;

        menu.style.display = '';
        var html = '<li class="menu-title">Releases</li>';

        html += manifest.versions.map(function(v) {
            var isCurrent = v.version === current;
            return '<li>' +
                '<a href="' + v.url + '" ' + (isCurrent ? '' : 'target="_blank"') +
                ' class="' + (isCurrent ? 'active font-bold' : '') + '">' +
                'v' + v.version + (isCurrent ? ' (current)' : '') +
                '</a></li>';
        }).join('');

        if (manifest.previews && manifest.previews.length > 0) {
            html += '<li class="menu-title mt-2 pt-2 border-t border-base-300">PR Previews</li>';
            html += manifest.previews.map(function(p) {
                return '<li><a href="' + p.url + '" target="_blank">' + p.label + '</a></li>';
            }).join('');
        }

        html += '<li class="menu-title mt-2 pt-2 border-t border-base-300">Links</li>' +
            '<li><a href="http://localhost:8788" ' + (isLocal ? 'class="active font-bold"' : '') + '>Local Dev' + (isLocal ? ' (current)' : '') + '</a></li>' +
            '<li><a href="' + (manifest.production || 'https://cad.ubuntusoftware.net') + '" target="_blank">Production</a></li>' +
            '<li><a href="https://github.com/joeblew999/plat-trunk/releases" target="_blank">GitHub Releases</a></li>';

        menu.innerHTML = html;
    });
})();
