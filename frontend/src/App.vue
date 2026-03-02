<script setup>
import { onMounted, ref } from 'vue'

const authId = ref('')
const notes = ref([])
const title = ref('')
const content = ref('')
const status = ref('Ready')

const authMode = ref('login')
const authStatus = ref('')
const isAuthenticated = ref(false)
const currentUser = ref(null)

const registerName = ref('')
const registerEmail = ref('')
const registerPassword = ref('')

const loginEmail = ref('')
const loginPassword = ref('')

const verifyEmail = ref('')
const verifyOtp = ref('')

const accessToken = ref('')
const refreshToken = ref('')

const STORAGE_KEY = 'notionui.auth'

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
  authId.value = ''
}

function restoreSession() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return

  try {
    const parsed = JSON.parse(raw)
    accessToken.value = parsed.accessToken || ''
    refreshToken.value = parsed.refreshToken || ''
    currentUser.value = parsed.user || null
    isAuthenticated.value = Boolean(parsed.accessToken && parsed.user?.id)
    authId.value = parsed.user?.id || ''
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
      return
    }

    verifyEmail.value = registerEmail.value
    verifyOtp.value = ''
    authMode.value = 'verify'
    authStatus.value = 'Registered. Check email for OTP then verify.'
  } catch (err) {
    console.error(err)
    authStatus.value = 'Register failed'
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
      return
    }

    authMode.value = 'login'
    loginEmail.value = verifyEmail.value
    authStatus.value = 'Email verified. You can login now.'
  } catch (err) {
    console.error(err)
    authStatus.value = 'Verify failed'
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
      return
    }

    authStatus.value = 'OTP resent. Check your inbox.'
  } catch (err) {
    console.error(err)
    authStatus.value = 'Resend failed'
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
      return
    }

    const auth = payload.data
    accessToken.value = auth.accessToken
    refreshToken.value = auth.refreshToken
    currentUser.value = auth.data
    isAuthenticated.value = true
    authId.value = auth.data?.id || ''
    persistSession()
    authStatus.value = `Logged in as ${auth.data?.email || 'user'}`

    if (authId.value) {
      await loadNotes()
    }
  } catch (err) {
    console.error(err)
    authStatus.value = 'Login failed'
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
  notes.value = []
  title.value = ''
  content.value = ''
  authStatus.value = 'Logged out'
}

function preview(value) {
  if (!value) return 'No content'
  return value.slice(0, 70)
}

async function loadNotes() {
  if (!authId.value.trim()) {
    status.value = 'Login first or enter authId'
    return
  }

  status.value = 'Loading notes...'
  try {
    const res = await fetch(`/api/notes/auth/${encodeURIComponent(authId.value.trim())}`)
    const payload = await res.json()
    notes.value = payload.data || []
    status.value = `Loaded ${notes.value.length} note(s)`
  } catch (err) {
    console.error(err)
    status.value = 'Failed to load notes'
  }
}

async function selectNote(id) {
  status.value = 'Loading note...'
  try {
    const res = await fetch(`/api/notes/${encodeURIComponent(id)}`)
    const payload = await res.json()
    const note = payload.data
    title.value = note?.title || ''
    content.value = note?.content || ''
    status.value = 'Loaded note'
  } catch (err) {
    console.error(err)
    status.value = 'Failed to load note'
  }
}

async function saveNote() {
  if (!authId.value.trim()) {
    status.value = 'Login first or enter authId'
    return
  }

  status.value = 'Saving...'
  try {
    await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        authId: authId.value.trim(),
        title: title.value.trim() || 'Untitled Note',
        content: content.value,
      }),
    })
    status.value = 'Saved'
    await loadNotes()
  } catch (err) {
    console.error(err)
    status.value = 'Save failed'
  }
}

function clearEditor() {
  title.value = ''
  content.value = ''
  status.value = 'New draft'
}

onMounted(() => {
  restoreSession()
  if (authId.value) {
    loadNotes()
  }
})
</script>

<template>
  <div class="page">
    <header class="topbar">
      <h1>NotionUI Notes</h1>
      <div class="topbar-right">
        <span v-if="isAuthenticated" class="user-email">{{ currentUser?.email }}</span>
        <button v-if="isAuthenticated" class="btn btn-secondary" @click="logout">Logout</button>
      </div>
    </header>

    <main v-if="!isAuthenticated" class="auth-layout">
      <section class="auth-card">
        <h2 class="section-title">Authentication</h2>

        <div class="tabs">
          <button class="tab" :class="{ active: authMode === 'login' }" @click="authMode = 'login'">Login</button>
          <button class="tab" :class="{ active: authMode === 'register' }" @click="authMode = 'register'">Register</button>
          <button class="tab" :class="{ active: authMode === 'verify' }" @click="authMode = 'verify'">Verify OTP</button>
        </div>

        <div v-if="authMode === 'register'" class="form-grid">
          <input v-model="registerName" class="input" placeholder="Name (optional)" />
          <input v-model="registerEmail" class="input" placeholder="Email" type="email" />
          <input v-model="registerPassword" class="input" placeholder="Password" type="password" />
          <button class="btn" @click="register">Create account</button>
        </div>

        <div v-else-if="authMode === 'verify'" class="form-grid">
          <input v-model="verifyEmail" class="input" placeholder="Email" type="email" />
          <input v-model="verifyOtp" class="input" placeholder="6-digit OTP" />
          <button class="btn" @click="verify">Verify email</button>
          <button class="btn btn-secondary" @click="resendOtp">Resend OTP</button>
        </div>

        <div v-else class="form-grid">
          <input v-model="loginEmail" class="input" placeholder="Email" type="email" />
          <input v-model="loginPassword" class="input" placeholder="Password" type="password" />
          <button class="btn" @click="login">Login</button>
        </div>

        <p class="hint">{{ authStatus || 'Use your auth-service account.' }}</p>
      </section>
    </main>

    <main v-else class="layout">
      <aside class="sidebar">
        <h2 class="section-title">Workspace</h2>
        <p class="label">Auth ID</p>
        <input
          v-model="authId"
          class="input"
          :disabled="isAuthenticated"
          placeholder="Login to fill automatically"
        />
        <button class="btn btn-secondary" @click="loadNotes">Load Notes</button>

        <div class="notes">
          <button
            v-for="note in notes"
            :key="note.id"
            class="note-item"
            @click="selectNote(note.id)"
          >
            <p class="note-title">{{ note.title || 'Untitled Note' }}</p>
            <p class="note-preview">{{ preview(note.content) }}</p>
          </button>
          <p v-if="notes.length === 0" class="hint">No notes yet.</p>
        </div>
      </aside>

      <section class="editor">
        <p class="emoji">📝</p>
        <input v-model="title" class="title" placeholder="Untitled" />
        <textarea
          v-model="content"
          class="content"
          placeholder="Type '/' for commands..."
        />

        <div class="actions">
          <button class="btn" @click="saveNote">Save Note</button>
          <button class="btn btn-secondary" @click="clearEditor">New Draft</button>
          <span class="status">{{ status }}</span>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #fbfbfa;
  color: #37352f;
}

.topbar {
  border-bottom: 1px solid #ececec;
  background: #fff;
  padding: 14px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.topbar h1 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-email {
  font-size: 12px;
  color: #666;
}

.layout {
  margin: 0 auto;
  display: flex;
  max-width: 1480px;
  gap: 16px;
  padding: 20px;
}

.auth-layout {
  min-height: calc(100vh - 60px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.auth-card {
  width: 100%;
  max-width: 420px;
  border: 1px solid #ececec;
  border-radius: 12px;
  background: #fff;
  padding: 20px;
}

.sidebar {
  width: 320px;
  border: 1px solid #ececec;
  border-radius: 12px;
  background: #fff;
  padding: 16px;
}

.section-title {
  margin: 0 0 10px;
  font-size: 14px;
  font-weight: 600;
}

.tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
}

.tab {
  border: 1px solid #ddd;
  background: #f7f7f7;
  border-radius: 8px;
  font-size: 12px;
  padding: 6px 10px;
}

.tab.active {
  background: #eaf3fd;
  border-color: #9fc5ef;
}

.form-grid {
  display: grid;
  gap: 8px;
}

.label {
  margin: 0 0 6px;
  font-size: 12px;
  color: #787878;
}

.input {
  width: 100%;
  border: 1px solid #d8d8d8;
  border-radius: 8px;
  padding: 10px 12px;
}

.notes {
  margin-top: 12px;
  display: grid;
  gap: 8px;
}

.note-item {
  width: 100%;
  border: 1px solid #ececec;
  border-radius: 8px;
  background: #fff;
  padding: 10px;
  text-align: left;
}

.note-title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
}

.note-preview {
  margin: 4px 0 0;
  font-size: 12px;
  color: #888;
}

.hint {
  margin: 10px 2px 0;
  font-size: 12px;
  color: #888;
}

.editor {
  flex: 1;
  min-height: 70vh;
  border: 1px solid #ececec;
  border-radius: 12px;
  background: #fff;
  padding: 24px;
}

.emoji {
  margin: 0 0 8px;
  font-size: 44px;
}

.title {
  width: 100%;
  border: 0;
  outline: none;
  font-size: 44px;
  font-weight: 700;
  margin-bottom: 10px;
}

.content {
  width: 100%;
  min-height: 50vh;
  resize: vertical;
  border: 0;
  outline: none;
  font-size: 17px;
  line-height: 1.8;
}

.actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 16px;
}

.status {
  font-size: 12px;
  color: #777;
}

.btn {
  border: 0;
  border-radius: 8px;
  background: #2383e2;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  padding: 8px 12px;
}

.btn-secondary {
  background: #f4f4f4;
  color: #333;
}

@media (max-width: 1200px) {
  .layout {
    flex-direction: column;
  }

  .sidebar {
    width: auto;
  }
}
</style>
