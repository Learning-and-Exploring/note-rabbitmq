import { ref } from 'vue'

const STORAGE_KEY = 'notionui.auth'

const initialized = ref(false)
const isAuthenticated = ref(false)
const currentUser = ref(null)
const accessToken = ref('')
const refreshToken = ref('')
const authStatus = ref('')

const authMode = ref('login')
const registerName = ref('')
const registerEmail = ref('')
const registerPassword = ref('')
const loginEmail = ref('')
const loginPassword = ref('')
const verifyEmail = ref('')
const verifyOtp = ref('')

function persistSession() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      accessToken: accessToken.value,
      refreshToken: refreshToken.value,
      user: currentUser.value,
    }),
  )
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEY)
  accessToken.value = ''
  refreshToken.value = ''
  currentUser.value = null
  isAuthenticated.value = false
}

function restoreSession() {
  if (initialized.value) return
  initialized.value = true

  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return

  try {
    const parsed = JSON.parse(raw)
    accessToken.value = parsed.accessToken || ''
    refreshToken.value = parsed.refreshToken || ''
    currentUser.value = parsed.user || null
    isAuthenticated.value = Boolean(parsed.accessToken && parsed.user?.id)
    if (isAuthenticated.value) {
      authStatus.value = `Logged in as ${parsed.user.email}`
    }
  } catch {
    clearSession()
  }
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
  authStatus.value = 'Logging in...'
  try {
    const res = await fetch('/auth-api/auths/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    refreshToken.value = auth.refreshToken
    currentUser.value = auth.data
    isAuthenticated.value = true
    persistSession()
    authStatus.value = `Logged in as ${auth.data?.email || 'user'}`
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
    if (refreshToken.value) {
      await fetch('/auth-api/auths/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refreshToken.value }),
      })
    }
  } catch (err) {
    console.error(err)
  }

  clearSession()
  authStatus.value = 'Logged out'
}

export function useAuth() {
  return {
    isAuthenticated,
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
  }
}
