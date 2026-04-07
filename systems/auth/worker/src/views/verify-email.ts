export function verifyEmailPage(): string {
  return `
  <div class="card w-full max-w-sm bg-base-100 shadow-xl">
    <div class="card-body gap-4 items-center text-center">

      <svg xmlns="http://www.w3.org/2000/svg" class="size-10 opacity-80" viewBox="0 0 100 100">
        <polygon points="50,10 90,30 90,70 50,90 10,70 10,30" fill="#444" stroke="#fff" stroke-width="3"/>
        <line x1="50" y1="10" x2="50" y2="90" stroke="#fff" stroke-width="2"/>
        <line x1="10" y1="30" x2="90" y2="30" stroke="#fff" stroke-width="2"/>
      </svg>

      <h1 class="text-xl font-bold">Verifying email…</h1>

      <div id="status" class="w-full">
        <div class="flex justify-center">
          <span class="loading loading-spinner loading-md opacity-50"></span>
        </div>
      </div>

      <p class="text-sm opacity-50">
        No token? <a href="/auth/sign-in" class="link link-primary">Return to sign in</a>
      </p>

    </div>
  </div>

  <script>
    const token = new URLSearchParams(location.search).get('token')
    const statusEl = document.getElementById('status')

    if (token) {
      fetch('/auth/api/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token }),
      })
        .then(r => r.json())
        .then(data => {
          if (data?.error) {
            statusEl.innerHTML = '<div class="alert alert-error">Verification failed: ' + (data.error.message || 'Invalid or expired link.') + '</div>'
          } else {
            statusEl.innerHTML = '<div class="alert alert-success">Email verified! <a href="/auth/sign-in" class="link ml-1">Sign in</a></div>'
          }
        })
        .catch(() => {
          statusEl.innerHTML = '<div class="alert alert-error">Network error. Please try again.</div>'
        })
    } else {
      statusEl.innerHTML = '<div class="alert alert-warning">No verification token found in the URL.</div>'
    }
  </script>`
}
