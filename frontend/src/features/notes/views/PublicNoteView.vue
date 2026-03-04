<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { http, isErrorStatus } from '@/lib/http'

const route = useRoute()
const token = computed(() => String(route.params.token || ''))
const loading = ref(true)
const error = ref('')
const note = ref(null)

function decodeHtmlEntities(value, maxIterations = 5) {
  let decoded = String(value ?? '')
  const parser = document.createElement('textarea')

  for (let i = 0; i < maxIterations; i += 1) {
    parser.innerHTML = decoded
    const next = parser.value
    if (next === decoded) break
    decoded = next
  }

  return decoded
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function sanitizeHtml(value) {
  if (!value) return ''

  const allowedTags = new Set(['DIV', 'P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'UL', 'OL', 'LI', 'H1', 'H2', 'H3', 'BLOCKQUOTE', 'SPAN', 'A'])
  const template = document.createElement('template')
  template.innerHTML = String(value)

  const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_ELEMENT)
  const toReplace = []

  while (walker.nextNode()) {
    const el = walker.currentNode
    if (!(el instanceof HTMLElement)) continue

    if (!allowedTags.has(el.tagName)) {
      toReplace.push(el)
      continue
    }

    const attrs = Array.from(el.attributes)
    for (const attr of attrs) {
      const name = attr.name.toLowerCase()
      const value = attr.value || ''

      if (name.startsWith('on')) {
        el.removeAttribute(attr.name)
        continue
      }

      if (el.tagName === 'A' && name === 'href') {
        const safe = /^(https?:|mailto:|tel:|\/)/i.test(value)
        if (!safe) {
          el.removeAttribute(attr.name)
          continue
        }
      } else if (name !== 'href' || el.tagName !== 'A') {
        el.removeAttribute(attr.name)
      }
    }

    if (el.tagName === 'A') {
      el.setAttribute('rel', 'noopener noreferrer')
      el.setAttribute('target', '_blank')
    }
  }

  for (const el of toReplace) {
    const replacement = document.createTextNode(el.textContent || '')
    el.replaceWith(replacement)
  }

  return template.innerHTML
}

const renderedContent = computed(() => {
  const raw = String(note.value?.content || '')
  if (!raw) return ''

  const hasHtmlTag = /<\/?[a-z][\s\S]*>/i.test(raw)
  if (hasHtmlTag) {
    return sanitizeHtml(raw)
  }

  const normalized = decodeHtmlEntities(raw)
  return escapeHtml(normalized).replace(/\n/g, '<br>')
})

async function loadPublicNote() {
  loading.value = true
  error.value = ''

  try {
    const res = await http.get(`/api/public/notes/${encodeURIComponent(token.value)}`)
    const payload = res.data || {}

    if (isErrorStatus(res.status)) {
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

        <article class="prose prose-neutral max-w-none text-neutral-800" v-html="renderedContent" />
      </template>
    </section>
  </main>
</template>
