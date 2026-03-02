<script setup>
import { computed, onMounted } from 'vue'
import NotesWorkspace from '@/components/notes/NotesWorkspace.vue'
import { useAuth } from '@/composables/useAuth'

const { currentUser, restoreSession } = useAuth()
const authId = computed(() => currentUser.value?.id || '')
const userName = computed(() => currentUser.value?.name || '')
const userEmail = computed(() => currentUser.value?.email || '')

onMounted(() => {
  restoreSession()
})
</script>

<template>
  <NotesWorkspace :auth-id="authId" :user-name="userName" :email="userEmail" />
</template>
