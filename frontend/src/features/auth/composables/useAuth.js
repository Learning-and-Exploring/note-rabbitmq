import { computed, ref } from 'vue'

const LEGACY_STORAGE_KEY = 'notionui.auth'

const initialized = ref(false)
const isAuthenticated = ref(false)
const currentUser = ref(null)
const accessToken = ref('')
const isAdmin = computed(() => currentUser.value?.role === 'ADMIN')
const authStatus = ref('')
let restorePromise = null

const authMode = ref('login')
const registerName = ref('')
const registerEmail = ref('')
const registerPassword = ref('')
const loginEmail = ref('')
const loginPassword = ref('')
const verifyEmail = ref('')
const verifyOtp = ref('')

function maskEmail(value) {
  const raw = String(value || '').trim()
  const at = raw.indexOf('@')
  if (at <= 0) return raw

  const name = raw.slice(0, at)
  const domain = raw.slice(at + 1)
  const visible = name.slice(0, Math.min(3, name.length))
  return `${visible}***@${domain}`
}

function clearLegacyStorage() {
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY)
  } catch {
    // Ignore storage errors in restricted environments.
  }
}

function clearSession() {
  clearLegacyStorage()
  accessToken.value = ''
  currentUser.value = null
  isAuthenticated.value = false
}

function expireSession(message = 'Session expired. Please login again.') {
  clearSession()
  authStatus.value = message
}

async function restoreSession() {
  clearLegacyStorage()

  if (initialized.value) return isAuthenticated.value
  if (restorePromise) return restorePromise

  restorePromise = (async () => {
    try {
      const res = await fetch('/auth-api/auths/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      })

      if (!res.ok) {
        clearSession()
        return false
      }

      const payload = await res.json()
      const auth = payload.data
      accessToken.value = auth.accessToken || ''
      currentUser.value = auth.data || null
      isAuthenticated.value = Boolean(accessToken.value && currentUser.value?.id)
      if (isAuthenticated.value) {
        authStatus.value = `Logged in as ${maskEmail(currentUser.value.email)}`
      }

      return isAuthenticated.value
    } catch {
      clearSession()
      return false
    } finally {
      initialized.value = true
      restorePromise = null
    }
  })()

  return restorePromise
}

async function register() {
  authStatus.value = 'Registering...'
  try {
    const res = await fetch('/auth-api/auths', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: registerName.value || undefined,
        email: registerEmail.value,
        password: registerPassword.value,
      }),
    })
    const payload = await res.json()
    if (!res.ok) {
      authStatus.value = payload.message || 'Register failed'
      return false
    }

    verifyEmail.value = registerEmail.value
    verifyOtp.value = ''
    authMode.value = 'verify'
    authStatus.value = 'Registered. Check email for OTP then verify.'
    return true
  } catch (err) {
    console.error(err)
    authStatus.value = 'Register failed'
    return false
  }
}

async function verify() {
  authStatus.value = 'Verifying email...'
  try {
    const res = await fetch('/auth-api/auths/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: verifyEmail.value,
        otp: verifyOtp.value,
      }),
    })
    const payload = await res.json()
    if (!res.ok) {
      authStatus.value = payload.message || 'Verify failed'
      return false
    }

    authMode.value = 'login'
    loginEmail.value = verifyEmail.value
    authStatus.value = 'Email verified. You can login now.'
    return true
  } catch (err) {
    console.error(err)
    authStatus.value = 'Verify failed'
    return false
  }
}

async function resendOtp() {
  authStatus.value = 'Resending OTP...'
  try {
    const res = await fetch('/auth-api/auths/resend-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: verifyEmail.value }),
    })
    const payload = await res.json()
    if (!res.ok) {
      authStatus.value = payload.message || 'Resend failed'
      return false
    }

    authStatus.value = 'OTP resent. Check your inbox.'
    return true
  } catch (err) {
    console.error(err)
    authStatus.value = 'Resend failed'
    return false
  }
}

async function login() {
  clearLegacyStorage()
  authStatus.value = 'Logging in...'
  try {
    const res = await fetch('/auth-api/auths/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        email: loginEmail.value,
        password: loginPassword.value,
      }),
    })
    const payload = await res.json()
    if (!res.ok) {
      authStatus.value = payload.message || 'Login failed'
      return false
    }

    const auth = payload.data
    accessToken.value = auth.accessToken
    currentUser.value = auth.data
    isAuthenticated.value = true
    initialized.value = true
    authStatus.value = `Logged in as ${maskEmail(auth.data?.email || 'user')}`
    return true
  } catch (err) {
    console.error(err)
    authStatus.value = 'Login failed'
    return false
  }
}

async function logout() {
  authStatus.value = 'Logging out...'
  try {
    await fetch('/auth-api/auths/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({}),
    })
  } catch (err) {
    console.error(err)
  }

  clearSession()
  authStatus.value = 'Logged out'
}

async function updateName(name) {
  const userId = currentUser.value?.id
  const token = accessToken.value
  const trimmedName = String(name || '').trim()

  if (!userId || !token) {
    authStatus.value = 'You are not authenticated'
    return false
  }

  if (!trimmedName) {
    authStatus.value = 'Name is required'
    return false
  }

  authStatus.value = 'Updating name...'

  try {
    const res = await fetch(`/auth-api/auths/change-name/${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: trimmedName }),
    })

    const payload = await res.json().catch(() => ({}))

    if (!res.ok) {
      authStatus.value = payload.message || 'Failed to update name'
      return false
    }

    currentUser.value = {
      ...(currentUser.value || {}),
      ...(payload.data || {}),
      name: payload.data?.name || trimmedName,
    }
    authStatus.value = 'Name updated'
    return true
  } catch (err) {
    console.error(err)
    authStatus.value = 'Failed to update name'
    return false
  }
}

function getAccessToken() {
  return accessToken.value
}

export function useAuth() {
  return {
    isAuthenticated,
    isAdmin,
    currentUser,
    authStatus,
    authMode,
    registerName,
    registerEmail,
    registerPassword,
    loginEmail,
    loginPassword,
    verifyEmail,
    verifyOtp,
    restoreSession,
    register,
    verify,
    resendOtp,
    login,
    logout,
    updateName,
    getAccessToken,
    expireSession,
  }
}
