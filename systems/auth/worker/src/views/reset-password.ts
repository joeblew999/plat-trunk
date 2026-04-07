export function resetPasswordPage(): string {
  return `
  <div class="card w-full max-w-sm bg-base-100 shadow-xl">
    <div class="card-body gap-4">

      <div class="flex flex-col items-center gap-2 mb-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="size-10 opacity-80" viewBox="0 0 100 100">
          <polygon points="50,10 90,30 90,70 50,90 10,70 10,30" fill="#444" stroke="#fff" stroke-width="3"/>
          <line x1="50" y1="10" x2="50" y2="90" stroke="#fff" stroke-width="2"/>
          <line x1="10" y1="30" x2="90" y2="30" stroke="#fff" stroke-width="2"/>
        </svg>
        <h1 class="text-xl font-bold" id="title">Reset password</h1>
        <p class="text-xs opacity-50 text-center" id="subtitle">Enter your email and we'll send a reset link.</p>
      </div>

      <div class="alert alert-success text-sm hidden" id="success"></div>
      <div class="alert alert-error text-sm hidden" id="error"></div>

      <form id="forgotForm">
        <label class="label text-sm" for="email">Email</label>
        <input id="email" type="email" name="email" placeholder="you@example.com" required
          autocomplete="email" class="input input-bordered w-full mb-4" />
        <button type="submit" id="forgotBtn" class="btn btn-primary w-full">Send reset link</button>
      </form>

      <form id="resetForm" class="hidden">
        <label class="label text-sm" for="password">New password</label>
        <input id="password" type="password" name="password" placeholder="Min. 8 characters"
          required minlength="8" autocomplete="new-password" class="input input-bordered w-full mb-4" />
        <button type="submit" id="resetBtn" class="btn btn-primary w-full">Update password</button>
      </form>

      <p class="text-center text-sm opacity-60">
        <a href="/auth/sign-in" class="link link-primary">Back to sign in</a>
      </p>

    </div>
  </div>

  <script>
    const token = new URLSearchParams(location.search).get('token')
    const errorEl = document.getElementById('error')
    const successEl = document.getElementById('success')

    if (token) {
      document.getElementById('title').textContent = 'Set new password'
      document.getElementById('subtitle').textContent = 'Enter your new password below.'
      document.getElementById('forgotForm').classList.add('hidden')
      document.getElementById('resetForm').classList.remove('hidden')
    }

    document.getElementById('forgotForm').addEventListener('submit', async (e) => {
      e.preventDefault()
      const btn = document.getElementById('forgotBtn')
      btn.disabled = true
      errorEl.classList.add('hidden')
      successEl.classList.add('hidden')
      try {
        const res = await fetch('/auth/api/forget-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            email: document.getElementById('email').value,
            redirectTo: window.location.origin + '/auth/reset-password',
          }),
        })
        if (res.ok) {
          successEl.textContent = 'Reset link sent — check your email.'
          successEl.classList.remove('hidden')
          document.getElementById('email').disabled = true
          btn.disabled = true
        } else {
          const data = await res.json().catch(() => ({}))
          errorEl.textContent = data?.error?.message || data?.message || 'Something went wrong.'
          errorEl.classList.remove('hidden')
          btn.disabled = false
        }
      } catch {
        errorEl.textContent = 'Network error — please try again.'
        errorEl.classList.remove('hidden')
        btn.disabled = false
      }
    })

    document.getElementById('resetForm').addEventListener('submit', async (e) => {
      e.preventDefault()
      const btn = document.getElementById('resetBtn')
      btn.disabled = true
      errorEl.classList.add('hidden')
      successEl.classList.add('hidden')
      try {
        const res = await fetch('/auth/api/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ token, newPassword: document.getElementById('password').value }),
        })
        if (res.ok) {
          successEl.textContent = 'Password updated!'
          successEl.classList.remove('hidden')
          document.getElementById('password').disabled = true
          btn.disabled = true
          setTimeout(() => { window.location.href = '/auth/sign-in' }, 1500)
        } else {
          const data = await res.json().catch(() => ({}))
          errorEl.textContent = data?.error?.message || data?.message || 'Something went wrong.'
          errorEl.classList.remove('hidden')
          btn.disabled = false
        }
      } catch {
        errorEl.textContent = 'Network error — please try again.'
        errorEl.classList.remove('hidden')
        btn.disabled = false
      }
    })
  </script>`
}
