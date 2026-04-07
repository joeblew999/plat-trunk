export function consentPage(): string {
  return `
  <div class="card w-full max-w-sm bg-base-100 shadow-xl">
    <div class="card-body gap-4">

      <div class="flex flex-col items-center gap-2 mb-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="size-10 opacity-80" viewBox="0 0 100 100">
          <polygon points="50,10 90,30 90,70 50,90 10,70 10,30" fill="#444" stroke="#fff" stroke-width="3"/>
        </svg>
        <h1 class="text-xl font-bold">Authorize Access</h1>
        <p class="text-xs opacity-50 text-center" id="clientLabel"></p>
        <p class="text-xs opacity-50 text-center hidden" id="scopeLabel"></p>
      </div>

      <div class="alert alert-error text-sm hidden" id="error"></div>

      <button id="allowBtn" class="btn btn-primary w-full">Allow</button>
      <button id="denyBtn" class="btn btn-ghost w-full">Deny</button>

    </div>
  </div>

  <script>
    const p = new URLSearchParams(location.search)
    const params = {
      clientId:    p.get('client_id') || '',
      redirectUri: p.get('redirect_uri') || '',
      scope:       p.get('scope') || '',
      state:       p.get('state') || '',
    }

    const clientLabel = document.getElementById('clientLabel')
    const scopeLabel = document.getElementById('scopeLabel')
    const errorEl = document.getElementById('error')
    const allowBtn = document.getElementById('allowBtn')
    const denyBtn = document.getElementById('denyBtn')

    if (params.clientId) clientLabel.textContent = 'Client: ' + params.clientId
    if (params.scope) {
      scopeLabel.textContent = 'Requesting: ' + params.scope
      scopeLabel.classList.remove('hidden')
    }

    async function consent(allow) {
      allowBtn.disabled = true
      denyBtn.disabled = true
      errorEl.classList.add('hidden')
      try {
        const res = await fetch('/auth/api/oauth/consent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ allow, ...params }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          errorEl.textContent = data?.error?.message || data?.message || 'Something went wrong.'
          errorEl.classList.remove('hidden')
          allowBtn.disabled = false
          denyBtn.disabled = false
        }
      } catch {
        errorEl.textContent = 'Network error — please try again.'
        errorEl.classList.remove('hidden')
        allowBtn.disabled = false
        denyBtn.disabled = false
      }
    }

    allowBtn.addEventListener('click', () => consent(true))
    denyBtn.addEventListener('click', () => consent(false))
  </script>`
}
