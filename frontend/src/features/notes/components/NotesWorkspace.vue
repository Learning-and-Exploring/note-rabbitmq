<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import { useNotes } from '@/features/notes/composables/useNotes'

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

const {
  notes,
  title,
  content,
  status,
  selectedNoteId,
  deletingNoteId,
  preview,
  resetEditor,
  loadNotes,
  selectNote,
  saveNote,
  deleteNote,
  clearAll,
} = useNotes()
const deleteCandidate = ref(null)
const noteCountLabel = computed(() => `${notes.value.length} note${notes.value.length === 1 ? '' : 's'}`)
const saveButtonLabel = computed(() => (selectedNoteId.value ? 'Update Note' : 'Save Note'))
const maskedEmail = computed(() => {
  const raw = String(props.email || '').trim()
  const at = raw.indexOf('@')
  if (at <= 0) return raw || 'No email provided'
  const name = raw.slice(0, at)
  const domain = raw.slice(at + 1)
  const visible = name.slice(0, Math.min(3, name.length))
  return `${visible}***@${domain}`
})

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

function openDeleteModal(note) {
  deleteCandidate.value = note
}

function closeDeleteModal() {
  deleteCandidate.value = null
}

async function confirmDelete() {
  if (!deleteCandidate.value) return
  const noteId = deleteCandidate.value.id
  closeDeleteModal()
  await deleteNote(noteId, props.authId)
}
</script>

<template>
  <main class="mx-auto grid w-full max-w-[1280px] grid-cols-1 gap-4 overflow-x-hidden p-5 lg:grid-cols-12">
    <aside class="min-w-0 rounded-xl border border-neutral-200 bg-white p-4 lg:col-span-4">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 class="text-base font-semibold text-neutral-900">Workspace</h2>
          <p class="text-xs text-neutral-500">{{ noteCountLabel }}</p>
        </div>
        <div class="flex gap-2">
          <BaseButton variant="secondary" @click="loadNotes(authId)">Reload</BaseButton>
          <BaseButton variant="secondary" @click="resetEditor">New Draft</BaseButton>
        </div>
      </div>

      <div class="mb-4 grid gap-3 rounded-xl border border-neutral-100 bg-neutral-50 p-3 md:grid-cols-2">
        <div class="rounded-lg bg-white p-3">
          <p class="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Name</p>
          <p class="mt-1 truncate text-sm font-medium text-neutral-800">{{ userName || 'Unnamed User' }}</p>
        </div>
        <div class="rounded-lg bg-white p-3">
          <p class="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Email</p>
          <p class="mt-1 truncate text-sm text-neutral-700">{{ maskedEmail }}</p>
        </div>
      </div>

      <div class="grid max-h-96 gap-2 overflow-y-auto pr-1">
        <div
          v-for="note in notes"
          :key="note.id"
          class="flex h-24 min-w-0 items-start gap-2 rounded-lg border p-2 transition-colors"
          :class="note.id === selectedNoteId ? 'border-blue-400 bg-blue-50/40' : 'border-neutral-200 bg-white hover:bg-neutral-50'"
        >
          <button
            class="flex h-full min-w-0 flex-1 flex-col justify-start overflow-hidden rounded-md px-1 py-0.5 text-left"
            @click="selectNote(note.id)"
          >
            <p class="truncate text-sm font-semibold text-neutral-900">{{ note.title || 'Untitled Note' }}</p>
            <p class="mt-1 truncate text-xs text-neutral-500">{{ preview(note.content) }}</p>
          </button>
          <BaseButton
            variant="ghost"
            class="shrink-0 border-red-200 text-red-600 hover:bg-red-50"
            :disabled="deletingNoteId === note.id"
            @click="openDeleteModal(note)"
          >
            {{ deletingNoteId === note.id ? 'Deleting...' : 'Delete' }}
          </BaseButton>
        </div>
        <p v-if="notes.length === 0" class="rounded-lg border border-dashed border-neutral-300 p-4 text-center text-xs text-neutral-500">
          No notes yet. Create your first note below.
        </p>
      </div>
    </aside>

    <section class="min-w-0 flex h-[72vh] flex-col rounded-xl border border-neutral-200 bg-white lg:col-span-8">
      <div class="border-b border-neutral-200 px-6 py-4">
        <p class="text-xs font-medium uppercase tracking-wide text-neutral-400">Editor</p>
        <input
          v-model="title"
          class="mt-2 w-full border-0 p-0 text-3xl font-bold text-neutral-900 outline-none"
          placeholder="Untitled"
        />
      </div>
      <div class="flex min-h-0 min-w-0 flex-1 flex-col px-6 py-4">
        <textarea
          v-model="content"
          class="min-h-0 min-w-0 flex-1 resize-none overflow-y-auto border-0 p-0 text-base leading-8 text-neutral-800 outline-none"
          placeholder="Write your ideas here..."
        />
      </div>
      <div class="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 px-6 py-4">
        <span class="text-xs text-neutral-500">{{ status }}</span>
        <BaseButton size="md" @click="saveNote(authId)">{{ saveButtonLabel }}</BaseButton>
      </div>
    </section>
  </main>

  <div
    v-if="deleteCandidate"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    @click.self="closeDeleteModal"
  >
    <div class="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
      <h3 class="text-base font-semibold text-neutral-900">Delete Note?</h3>
      <p class="mt-2 text-sm text-neutral-600">
        This action cannot be undone.
      </p>
      <p class="mt-1 truncate text-sm text-neutral-700">
        "{{ deleteCandidate?.title || 'Untitled Note' }}"
      </p>
      <div class="mt-5 flex justify-end gap-2">
        <BaseButton variant="secondary" @click="closeDeleteModal">Cancel</BaseButton>
        <BaseButton class="bg-red-600 hover:bg-red-700" @click="confirmDelete">Delete</BaseButton>
      </div>
    </div>
  </div>
</template>
