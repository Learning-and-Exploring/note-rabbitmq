<script setup>
import { onMounted } from 'vue'
import AuthScreen from '@/components/auth/AuthScreen.vue'
import { useAuth } from '@/composables/useAuth'

const { restoreSession } = useAuth()

onMounted(() => {
  restoreSession()
})
</script>

<template>
  <AuthScreen />
</template>
