export function loginPage(): string {
  return `
  <div class="card bg-base-100 shadow-xl w-full max-w-md">
    <div class="card-body">

      <div class="flex flex-col items-center gap-2 mb-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="size-10 opacity-80" viewBox="0 0 100 100">
          <polygon points="50,10 90,30 90,70 50,90 10,70 10,30" fill="#444" stroke="#fff" stroke-width="3"/>
          <line x1="50" y1="10" x2="50" y2="90" stroke="#fff" stroke-width="2"/>
          <line x1="10" y1="30" x2="90" y2="30" stroke="#fff" stroke-width="2"/>
        </svg>
        <h1 class="card-title text-2xl" id="title">Sign In</h1>
        <p class="text-base-content/60 text-sm mb-2" id="subtitle">Welcome back</p>
      </div>

      <div class="alert alert-error text-sm hidden" id="error"></div>
      <div class="alert alert-success text-sm hidden" id="success"></div>

      <form id="authForm">
        <div class="hidden" id="nameField">
          <label class="label" for="name">Name</label>
          <input type="text" id="name" name="name" placeholder="Your name" autocomplete="name"
            class="input input-bordered w-full mb-3" />
        </div>
        <label class="label" for="email">Email</label>
        <input type="email" id="email" name="email" placeholder="you@example.com" required
          autocomplete="email" class="input input-bordered w-full mb-3" />
        <label class="label" for="password">Password</label>
        <input type="password" id="password" name="password" placeholder="Min 8 characters" required
          autocomplete="current-password" class="input input-bordered w-full mb-1" />
        <div class="label mb-3">
          <a href="/auth/reset-password" class="label-text-alt link link-primary">Forgot password?</a>
        </div>
        <button type="submit" id="submitBtn" class="btn btn-primary w-full">Sign In</button>
      </form>

      <div class="text-center mt-4 text-sm text-base-content/60">
        <span id="toggleText">Don't have an account?</span>
        <a id="toggleLink" class="link link-primary ml-1 cursor-pointer" onclick="toggleMode()">Sign Up</a>
      </div>

      <a href="/auth/demo" class="link text-center mt-2 text-sm text-base-content/40">Skip to demo</a>

      <div class="divider text-xs text-base-content/40">Dev accounts</div>
      <div class="flex gap-2 flex-wrap justify-center">
        <button onclick="fillDev('admin@cad.dev','admin1234!')" class="btn btn-ghost btn-xs">Admin</button>
        <button onclick="fillDev('user@cad.dev','user12345!')" class="btn btn-ghost btn-xs">User</button>
      </div>

    </div>
  </div>

  <script>
    let isSignUp = new URLSearchParams(window.location.search).get('mode') === 'signup'
              || window.location.pathname.endsWith('/sign-up')

    function updateUI() {
      document.getElementById('title').textContent = isSignUp ? 'Create Account' : 'Sign In'
      document.getElementById('subtitle').textContent = isSignUp ? 'Get started' : 'Welcome back'
      document.getElementById('submitBtn').textContent = isSignUp ? 'Create Account' : 'Sign In'
      document.getElementById('toggleText').textContent = isSignUp ? 'Already have an account?' : "Don't have an account?"
      document.getElementById('toggleLink').textContent = isSignUp ? 'Sign In' : 'Sign Up'
      document.getElementById('nameField').style.display = isSignUp ? 'block' : 'none'
      document.getElementById('password').autocomplete = isSignUp ? 'new-password' : 'current-password'
    }

    function toggleMode() {
      isSignUp = !isSignUp
      updateUI()
      document.getElementById('error').classList.add('hidden')
    }

    function fillDev(email, password) {
      if (isSignUp) toggleMode()
      document.getElementById('email').value = email
      document.getElementById('password').value = password
      document.getElementById('authForm').dispatchEvent(new Event('submit', { cancelable: true }))
    }

    updateUI()

    document.getElementById('authForm').addEventListener('submit', async (e) => {
      e.preventDefault()
      const btn = document.getElementById('submitBtn')
      const errorEl = document.getElementById('error')
      const successEl = document.getElementById('success')
      btn.disabled = true
      errorEl.classList.add('hidden')
      successEl.classList.add('hidden')

      const body = {
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
      }
      if (isSignUp) body.name = document.getElementById('name').value

      try {
        const endpoint = isSignUp ? '/auth/api/sign-up/email' : '/auth/api/sign-in/email'
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(body),
        })
        if (res.ok) {
          if (isSignUp) {
            successEl.textContent = 'Account created! Redirecting…'
            successEl.classList.remove('hidden')
            setTimeout(() => { window.location.href = '/auth/demo' }, 1500)
          } else {
            window.location.href = '/auth/demo'
          }
        } else {
          const data = await res.json().catch(() => ({}))
          errorEl.textContent = data?.error?.message || data?.message || 'Something went wrong.'
          errorEl.classList.remove('hidden')
        }
      } catch {
        errorEl.textContent = 'Network error. Please try again.'
        errorEl.classList.remove('hidden')
      } finally {
        if (!successEl.classList.contains('hidden')) return
        btn.disabled = false
      }
    })
  </script>`
}
