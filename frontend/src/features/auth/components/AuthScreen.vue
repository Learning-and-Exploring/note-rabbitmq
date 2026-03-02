<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import { useAuth } from '@/features/auth/composables/useAuth'

const router = useRouter()
const uiError = ref('')
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

function setMode(mode) {
  uiError.value = ''
  authMode.value = mode
}

function isValidEmail(value) {
  return /^\S+@\S+\.\S+$/.test(value.trim())
}

function validateRegister() {
  if (!registerEmail.value.trim()) return 'Email is required.'
  if (!isValidEmail(registerEmail.value)) return 'Please enter a valid email address.'
  if (!registerPassword.value) return 'Password is required.'
  if (registerPassword.value.length < 8) return 'Password must be at least 8 characters.'
  return ''
}

function validateLogin() {
  if (!loginEmail.value.trim()) return 'Email is required.'
  if (!isValidEmail(loginEmail.value)) return 'Please enter a valid email address.'
  if (!loginPassword.value) return 'Password is required.'
  return ''
}

function validateVerify() {
  if (!verifyEmail.value.trim()) return 'Email is required.'
  if (!isValidEmail(verifyEmail.value)) return 'Please enter a valid email address.'
  if (!/^\d{6}$/.test(verifyOtp.value.trim())) return 'OTP must be exactly 6 digits.'
  return ''
}

function validateResend() {
  if (!verifyEmail.value.trim()) return 'Email is required.'
  if (!isValidEmail(verifyEmail.value)) return 'Please enter a valid email address.'
  return ''
}

async function handleRegister() {
  uiError.value = validateRegister()
  if (uiError.value) return
  await register()
}

async function handleLogin() {
  uiError.value = validateLogin()
  if (uiError.value) return
  const ok = await login()
  if (ok) {
    router.replace('/notes')
  }
}

async function handleVerify() {
  uiError.value = validateVerify()
  if (uiError.value) return
  await verify()
}

async function handleResendOtp() {
  uiError.value = validateResend()
  if (uiError.value) return
  await resendOtp()
}
</script>

<template>
  <main class="flex min-h-[calc(100vh-64px)] items-center justify-center p-6">
    <section class="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <p class="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">Welcome</p>
      <h2 class="mb-4 text-xl font-bold text-neutral-900">Authentication</h2>

      <div class="mb-4 grid grid-cols-3 gap-2 rounded-xl bg-neutral-100 p-1">
        <button
          class="rounded-lg px-2 py-2 text-xs font-semibold transition-colors"
          :class="authMode === 'login' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'"
          @click="setMode('login')"
        >
          Login
        </button>
        <button
          class="rounded-lg px-2 py-2 text-xs font-semibold transition-colors"
          :class="authMode === 'register' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'"
          @click="setMode('register')"
        >
          Register
        </button>
        <button
          class="rounded-lg px-2 py-2 text-xs font-semibold transition-colors"
          :class="authMode === 'verify' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'"
          @click="setMode('verify')"
        >
          Verify OTP
        </button>
      </div>

      <div v-if="authMode === 'register'" class="grid gap-2.5">
        <input v-model="registerName" class="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-blue-400" placeholder="Name (optional)" />
        <input v-model="registerEmail" class="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-blue-400" placeholder="Email" type="email" />
        <input v-model="registerPassword" class="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-blue-400" placeholder="Password (min 8 chars)" type="password" />
        <BaseButton size="md" @click="handleRegister">Create account</BaseButton>
      </div>

      <div v-else-if="authMode === 'verify'" class="grid gap-2.5">
        <input v-model="verifyEmail" class="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-blue-400" placeholder="Email" type="email" />
        <input v-model="verifyOtp" class="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-blue-400" placeholder="6-digit OTP" />
        <BaseButton size="md" @click="handleVerify">Verify email</BaseButton>
        <BaseButton variant="secondary" size="md" @click="handleResendOtp">Resend OTP</BaseButton>
      </div>

      <div v-else class="grid gap-2.5">
        <input v-model="loginEmail" class="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-blue-400" placeholder="Email" type="email" />
        <input v-model="loginPassword" class="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-blue-400" placeholder="Password" type="password" />
        <BaseButton size="md" @click="handleLogin">Login</BaseButton>
      </div>

      <p v-if="uiError" class="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
        {{ uiError }}
      </p>
      <p class="mt-3 text-xs text-neutral-500">{{ authStatus || 'Use your auth-service account.' }}</p>
    </section>
  </main>
</template>
