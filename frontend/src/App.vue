<script setup>
import { computed, onMounted } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const { isAuthenticated, currentUser, restoreSession, logout } = useAuth()
const router = useRouter()
const homeRoute = computed(() => (isAuthenticated.value ? '/notes' : '/login'))

onMounted(() => {
  restoreSession()
})

async function handleLogout() {
  await logout()
  router.replace('/login')
}
</script>

<template>
  <div class="page">
    <header class="topbar">
      <h1>
        <RouterLink class="brand-link" :to="homeRoute">Notes</RouterLink>
      </h1>
      <div class="topbar-right">
        <span v-if="isAuthenticated" class="user-email">{{ currentUser?.email }}</span>
        <button v-if="isAuthenticated" class="btn btn-secondary" @click="handleLogout">Logout</button>
      </div>
    </header>

    <RouterView />
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

.brand-link {
  color: inherit;
  text-decoration: none;
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
