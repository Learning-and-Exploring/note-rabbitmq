<script setup>
import { onMounted, watch } from 'vue'
import BaseButton from '@/components/base/BaseButton.vue'
import { useNotes } from '@/composables/useNotes'

const props = defineProps({
  authId: {
    type: String,
    required: true,
  },
  userName: {
    type: String,
    default: '',
  },
  email: {
    type: String,
    default: '',
  },
})

const { notes, title, content, status, preview, resetEditor, loadNotes, selectNote, saveNote, clearAll } = useNotes()

watch(
  () => props.authId,
  (value) => {
    clearAll()
    if (value) loadNotes(value)
  },
  { immediate: true },
)

onMounted(() => {
  if (props.authId) {
    loadNotes(props.authId)
  }
})
</script>

<template>
  <main class="mx-auto flex max-w-[1480px] flex-col gap-4 p-5 xl:flex-row">
    <aside class="w-full rounded-xl border border-neutral-200 bg-white p-4 xl:w-80">
      <h2 class="mb-2.5 text-sm font-semibold text-neutral-900">Workspace</h2>
      <!-- <input
        :value="userName || 'Unnamed User'"
        class="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm text-neutral-700 mb-2"
        disabled
      />
      <input
        :value="email || 'No email'"
        class="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm text-neutral-700"
        disabled
      /> -->
      <div class="space-y-4 p-4 bg-white rounded-xl border border-neutral-100 shadow-sm">
        <div class="group">
          <label class="text-xs font-semibold text-neutral-400 uppercase tracking-wider ml-1">Account Name</label>
          <div
            class="flex items-center mt-1 w-full rounded-lg bg-neutral-50 border border-neutral-200 px-3 py-3 transition-colors group-hover:bg-neutral-100">
            <span class="text-sm font-medium text-neutral-800">
              {{ userName || 'Unnamed User' }}
            </span>
          </div>
        </div>

        <div class="group">
          <label class="text-xs font-semibold text-neutral-400 uppercase tracking-wider ml-1">Email Address</label>
          <div
            class="flex items-center mt-1 w-full rounded-lg bg-neutral-50 border border-neutral-200 px-3 py-3 transition-colors group-hover:bg-neutral-100">
            <span class="text-sm text-neutral-600">
              {{ email || 'No email provided' }}
            </span>
          </div>
        </div>
      </div>
      <BaseButton class="mt-2" variant="secondary" @click="loadNotes(authId)">
        Reload Notes
      </BaseButton>

      <div class="mt-3 grid gap-2">
        <button v-for="note in notes" :key="note.id"
          class="w-full rounded-lg border border-neutral-200 bg-white p-2.5 text-left hover:bg-neutral-50"
          @click="selectNote(note.id)">
          <p class="text-sm font-semibold text-neutral-900 ">{{ note.title || 'Untitled Note' }}</p>
          <p class="mt-1 text-xs text-neutral-500">{{ preview(note.content) }}</p>
        </button>
        <p v-if="notes.length === 0" class="mt-2 text-xs text-neutral-500">No notes yet.</p>
      </div>
    </aside>

    <section class="min-h-[70vh] flex-1 rounded-xl border border-neutral-200 bg-white p-6">
      <p class="mb-5 text-4xl">📝</p>
      <input v-model="title" class="mb-2.5 w-full border-0 text-4xl font-bold text-neutral-900 outline-none"
        placeholder="Untitled" />
      <textarea v-model="content"
        class="min-h-[50vh] w-full resize-y border-0 text-[17px] leading-8 text-neutral-800 outline-none"
        placeholder="Type '/' for commands..." />

      <div class="mt-4 flex flex-wrap items-center gap-2.5">
        <BaseButton @click="saveNote(authId)">
          Save Note
        </BaseButton>
        <BaseButton variant="secondary" @click="resetEditor">
          New Draft
        </BaseButton>
        <span class="text-xs text-neutral-500">{{ status }}</span>
      </div>
    </section>
  </main>
</template>
