<script setup>
import { useRouter } from 'vue-router'
import { useAuth } from '@/features/auth/composables/useAuth'

const router = useRouter()
const {
  authStatus,
  authMode,
  registerName,
  registerEmail,
  registerPassword,
  loginEmail,
  loginPassword,
  verifyEmail,
  verifyOtp,
  register,
  verify,
  resendOtp,
  login,
} = useAuth()

async function handleLogin() {
  const ok = await login()
  if (ok) {
    router.replace('/notes')
  }
}
</script>

<template>
  <main class="auth-layout">
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
        <button class="btn" @click="handleLogin">Login</button>
      </div>

      <p class="hint">{{ authStatus || 'Use your auth-service account.' }}</p>
    </section>
  </main>
</template>

<style scoped>
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

.input {
  width: 100%;
  border: 1px solid #d8d8d8;
  border-radius: 8px;
  padding: 10px 12px;
}

.hint {
  margin: 10px 2px 0;
  font-size: 12px;
  color: #888;
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
</style>
