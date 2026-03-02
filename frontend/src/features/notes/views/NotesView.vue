<script setup>
import { computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import NotesWorkspace from '@/features/notes/components/NotesWorkspace.vue'
import { useAuth } from '@/features/auth/composables/useAuth'

const router = useRouter()
const { currentUser, isAuthenticated, isAdmin, restoreSession } = useAuth()
const authId = computed(() => currentUser.value?.id || '')
const userName = computed(() => currentUser.value?.name || '')
const userEmail = computed(() => currentUser.value?.email || '')

onMounted(() => {
  restoreSession()
})

watch(
  () => isAdmin.value,
  (value) => {
    if (value) {
      router.replace('/admin/users')
    }
  },
)

watch(
  () => isAuthenticated.value,
  (value) => {
    if (!value) {
      router.replace('/login')
    }
  },
)
</script>

<template>
  <NotesWorkspace :auth-id="authId" :user-name="userName" :email="userEmail" :is-admin="isAdmin" />
</template>
