<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const token = computed(() => String(route.params.token || ''))
const loading = ref(true)
const error = ref('')
const note = ref(null)

async function loadPublicNote() {
  loading.value = true
  error.value = ''

  try {
    const res = await fetch(`/api/public/notes/${encodeURIComponent(token.value)}`)
    const payload = await res.json()

    if (!res.ok) {
      error.value = payload.message || 'Shared note not found.'
      return
    }

    note.value = payload.data || null
  } catch {
    error.value = 'Failed to load shared note.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadPublicNote()
})
</script>

<template>
  <main class="mx-auto w-full max-w-4xl p-6">
    <section class="rounded-xl border border-neutral-200 bg-white p-6">
      <p v-if="loading" class="text-sm text-neutral-500">Loading shared note...</p>
      <p v-else-if="error" class="text-sm text-red-600">{{ error }}</p>

      <template v-else>
        <h1 class="mb-3 text-3xl font-bold text-neutral-900">{{ note?.title || 'Untitled Note' }}</h1>
        <p class="mb-5 text-xs text-neutral-500">Read-only shared note</p>

        <article
          class="prose prose-neutral max-w-none text-neutral-800"
          v-html="note?.content || ''"
        />
      </template>
    </section>
  </main>
</template>
