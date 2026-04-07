type User = {
  id: string;
  email: string;
  name: string | null;
};

export function demoPage(user: User | null): string {
  const actorLabel = user ? `User:${user.id} (${user.email})` : 'User:anonymous';
  const signedIn = !!user;

  return `
  <div class="w-full max-w-5xl px-4 py-8">

    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-3 mb-6">
      <div>
        <h1 class="text-2xl font-bold">Permissions + Filesystem demo</h1>
        <p class="text-base-content/60 text-sm">
          ReBAC via <a href="https://github.com/GonzaloJeria/zanzojs" class="link" target="_blank">zanzojs</a>
          · Identity via <a href="https://better-auth.com" class="link" target="_blank">better-auth</a>
        </p>
      </div>
      <div class="flex gap-2 items-center">
        <span id="health-badge" class="badge badge-ghost text-xs">checking worker…</span>
        ${signedIn
          ? `<a href="/auth/api/sign-out" class="btn btn-xs btn-outline">Sign out</a>`
          : `<a href="/auth/sign-in" class="btn btn-xs btn-outline">Sign in</a>`
        }
      </div>
    </div>

    <!-- Session info -->
    <div class="alert alert-info text-sm py-2 mb-6">
      <span>Signed in as: <strong id="session-actor" class="font-mono">${actorLabel}</strong></span>
      <span class="text-base-content/60 ml-2">(<code>?actor=</code> override works in dev)</span>
    </div>

    <!-- Actor override (dev only) -->
    <div class="card bg-base-100 shadow mb-6">
      <div class="card-body py-3">
        <h2 class="card-title text-sm">Actor override <span class="badge badge-warning badge-xs">dev only</span></h2>
        <p class="text-xs text-base-content/50">In production, actor comes from the Better Auth session. Here you can override for testing.</p>
        <div class="flex flex-wrap gap-2" id="actor-btns">
          <button class="btn btn-xs btn-primary" data-actor="">Session (default)</button>
          <button class="btn btn-xs btn-outline" data-actor="User:alice">User:alice</button>
          <button class="btn btn-xs btn-outline" data-actor="User:bob">User:bob</button>
          <button class="btn btn-xs btn-outline" data-actor="User:carol">User:carol</button>
          <button class="btn btn-xs btn-outline" data-actor="Agent:claude-mcp">Agent:claude-mcp</button>
        </div>
        <p class="text-xs text-base-content/40">Active override: <span id="actor-label" class="font-mono font-bold">none</span></p>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

      <!-- Check permission -->
      <div class="card bg-base-100 shadow">
        <div class="card-body space-y-3">
          <h2 class="card-title text-sm">Check permission</h2>
          <label class="label label-text text-xs">Action</label>
          <input id="check-action" class="input input-bordered input-xs" value="read" />
          <label class="label label-text text-xs">Resource type</label>
          <input id="check-type" class="input input-bordered input-xs" value="Project" />
          <label class="label label-text text-xs">Resource id</label>
          <input id="check-id" class="input input-bordered input-xs" value="demo" />
          <button id="check-btn" class="btn btn-xs btn-primary">Check</button>
          <pre id="check-result" class="bg-base-200 rounded p-2 text-xs min-h-8"></pre>
        </div>
      </div>

      <!-- Grant / Revoke -->
      <div class="card bg-base-100 shadow">
        <div class="card-body space-y-3">
          <h2 class="card-title text-sm">Grant / Revoke</h2>
          <label class="label label-text text-xs">Subject</label>
          <input id="gr-subject" class="input input-bordered input-xs" value="User:alice" />
          <label class="label label-text text-xs">Relation</label>
          <input id="gr-relation" class="input input-bordered input-xs" value="owner" />
          <label class="label label-text text-xs">Resource type</label>
          <input id="gr-type" class="input input-bordered input-xs" value="Project" />
          <label class="label label-text text-xs">Resource id</label>
          <input id="gr-id" class="input input-bordered input-xs" value="demo" />
          <div class="flex gap-2">
            <button id="grant-btn" class="btn btn-xs btn-success flex-1">Grant</button>
            <button id="revoke-btn" class="btn btn-xs btn-error flex-1">Revoke</button>
          </div>
          <pre id="gr-result" class="bg-base-200 rounded p-2 text-xs min-h-8"></pre>
        </div>
      </div>

      <!-- Snapshot -->
      <div class="card bg-base-100 shadow">
        <div class="card-body space-y-3">
          <div class="flex items-center justify-between">
            <h2 class="card-title text-sm">Snapshot</h2>
            <button id="snapshot-btn" class="btn btn-xs">Refresh</button>
          </div>
          <pre id="snapshot-result" class="bg-base-200 rounded p-2 text-xs min-h-16 max-h-48 overflow-auto"></pre>
        </div>
      </div>

      <!-- All tuples -->
      <div class="card bg-base-100 shadow">
        <div class="card-body space-y-3">
          <div class="flex items-center justify-between">
            <h2 class="card-title text-sm">All tuples <span class="badge badge-ghost badge-xs">debug</span></h2>
            <button id="tuples-btn" class="btn btn-xs">Refresh</button>
          </div>
          <pre id="tuples-result" class="bg-base-200 rounded p-2 text-xs min-h-16 max-h-48 overflow-auto"></pre>
        </div>
      </div>

      <!-- Write file -->
      <div class="card bg-base-100 shadow">
        <div class="card-body space-y-3">
          <h2 class="card-title text-sm">Write file</h2>
          <label class="label label-text text-xs">Path</label>
          <input id="write-path" class="input input-bordered input-xs font-mono" value="/projects/demo/notes.txt" />
          <label class="label label-text text-xs">Content</label>
          <textarea id="write-content" class="textarea textarea-bordered textarea-xs font-mono text-xs" rows="3">hello from auth demo</textarea>
          <button id="write-btn" class="btn btn-xs btn-primary">Write</button>
          <pre id="write-result" class="bg-base-200 rounded p-2 text-xs min-h-8"></pre>
        </div>
      </div>

      <!-- Read / List -->
      <div class="card bg-base-100 shadow">
        <div class="card-body space-y-3">
          <h2 class="card-title text-sm">Read file / List dir</h2>
          <label class="label label-text text-xs">Path</label>
          <input id="read-path" class="input input-bordered input-xs font-mono" value="/projects/demo/notes.txt" />
          <div class="flex gap-2">
            <button id="read-btn" class="btn btn-xs btn-primary flex-1">Read</button>
            <button id="ls-btn" class="btn btn-xs btn-outline flex-1">List dir</button>
          </div>
          <pre id="read-result" class="bg-base-200 rounded p-2 text-xs min-h-8 max-h-48 overflow-auto"></pre>
        </div>
      </div>

    </div>
  </div>

  <script>
    let actorOverride = ''

    function buildUrl(path) {
      const base = '/zano' + path
      if (!actorOverride) return base
      return base + (path.includes('?') ? '&' : '?') + 'actor=' + encodeURIComponent(actorOverride)
    }

    async function api(method, path, body) {
      const isText = typeof body === 'string'
      const res = await fetch(buildUrl(path), {
        method,
        credentials: 'include',
        headers: body !== undefined ? { 'content-type': isText ? 'text/plain' : 'application/json' } : {},
        body: body !== undefined ? (isText ? body : JSON.stringify(body)) : undefined,
      })
      const text = await res.text()
      try { return { status: res.status, data: JSON.parse(text) } }
      catch { return { status: res.status, data: text } }
    }

    function show(id, result) {
      const el = document.getElementById(id)
      el.textContent = result.status + ' ' + JSON.stringify(result.data, null, 2)
      el.className = el.className.replace(/text-(success|error)/, '')
      el.classList.add(result.status < 300 ? 'text-success' : 'text-error')
    }

    function val(id) { return document.getElementById(id).value.trim() }

    // Actor override
    document.getElementById('actor-btns').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-actor]')
      if (!btn) return
      actorOverride = btn.dataset.actor || ''
      document.getElementById('actor-label').textContent = actorOverride || 'none (using session)'
      document.getElementById('actor-btns').querySelectorAll('button').forEach((b) => {
        b.className = b.dataset.actor === actorOverride ? 'btn btn-xs btn-primary' : 'btn btn-xs btn-outline'
      })
    })

    // Health check
    async function checkHealth() {
      const badge = document.getElementById('health-badge')
      try {
        const { status } = await api('GET', '/health')
        badge.textContent = status === 200 ? 'worker online' : 'worker ' + status
        badge.className = 'badge text-xs ' + (status === 200 ? 'badge-success' : 'badge-error')
      } catch {
        badge.textContent = 'worker offline'
        badge.className = 'badge badge-error text-xs'
      }
    }

    // Permissions
    document.getElementById('check-btn').addEventListener('click', async () => {
      show('check-result', await api('GET',
        '/check?action=' + val('check-action') + '&type=' + val('check-type') + '&id=' + encodeURIComponent(val('check-id'))))
    })

    document.getElementById('grant-btn').addEventListener('click', async () => {
      show('gr-result', await api('PUT', '/grant', {
        subject: val('gr-subject'), relation: val('gr-relation'),
        type: val('gr-type'), id: val('gr-id'),
      }))
    })

    document.getElementById('revoke-btn').addEventListener('click', async () => {
      show('gr-result', await api('DELETE', '/revoke', {
        subject: val('gr-subject'), relation: val('gr-relation'),
        type: val('gr-type'), id: val('gr-id'),
      }))
    })

    document.getElementById('snapshot-btn').addEventListener('click', async () => {
      show('snapshot-result', await api('GET', '/snapshot'))
    })

    document.getElementById('tuples-btn').addEventListener('click', async () => {
      show('tuples-result', await api('GET', '/tuples'))
    })

    // Filesystem
    document.getElementById('write-btn').addEventListener('click', async () => {
      show('write-result', await api('PUT',
        '/files' + val('write-path'),
        document.getElementById('write-content').value))
    })

    document.getElementById('read-btn').addEventListener('click', async () => {
      show('read-result', await api('GET', '/files' + val('read-path')))
    })

    document.getElementById('ls-btn').addEventListener('click', async () => {
      show('read-result', await api('GET', '/ls' + val('read-path')))
    })

    // Load on boot
    checkHealth()
    api('GET', '/snapshot').then(r => show('snapshot-result', r))
    api('GET', '/tuples').then(r => show('tuples-result', r))
  </script>`
}
