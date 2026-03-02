<script setup>
import { onMounted } from 'vue'
import AuthScreen from '@/features/auth/components/AuthScreen.vue'
import { useAuth } from '@/features/auth/composables/useAuth'

const { restoreSession } = useAuth()

onMounted(() => {
  restoreSession()
})
</script>

<template>
  <AuthScreen />
</template>
