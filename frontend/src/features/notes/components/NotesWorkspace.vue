<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
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
  sharingNoteId,
  hasUnsavedChanges,
  buildShareUrl,
  preview,
  resetEditor,
  loadNotes,
  selectNote,
  saveNote,
  deleteNote,
  shareNote,
  unshareNote,
  clearAll,
} = useNotes()
const deleteCandidate = ref(null)
const unsavedModalOpen = ref(false)
const pendingAction = ref(null)
const shareModalOpen = ref(false)
const shareModalCopied = ref(false)
const editorRef = ref(null)
const activeToolbar = ref({})
const syncingFromEditor = ref(false)
const noteCountLabel = computed(() => `${notes.value.length} note${notes.value.length === 1 ? '' : 's'}`)
const saveButtonLabel = computed(() => (selectedNoteId.value ? 'Update Note' : 'Save Note'))
const selectedNote = computed(() => notes.value.find((note) => note.id === selectedNoteId.value) || null)
const shareLink = computed(() => {
  if (!selectedNote.value?.isPublic || !selectedNote.value?.shareToken) return ''
  return buildShareUrl(selectedNote.value.shareToken)
})
const maskedEmail = computed(() => {
  const raw = String(props.email || '').trim()
  const at = raw.indexOf('@')
  if (at <= 0) return raw || 'No email provided'
  const name = raw.slice(0, at)
  const domain = raw.slice(at + 1)
  const visible = name.slice(0, Math.min(3, name.length))
  return `${visible}***@${domain}`
})
const toolbarActions = [
  { key: 'bold', label: 'B', title: 'Bold' },
  { key: 'italic', label: 'I', title: 'Italic' },
  { key: 'underline', label: 'U', title: 'Underline' },
  { key: 'insertUnorderedList', label: '• List', title: 'Bulleted list' },
  { key: 'insertOrderedList', label: '1. List', title: 'Numbered list' },
  { key: 'formatBlock:h2', label: 'H2', title: 'Heading' },
  { key: 'formatBlock:blockquote', label: 'Quote', title: 'Quote' },
]

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function decodeHtmlEntities(value, maxIterations = 5) {
  let decoded = String(value ?? '')
  const textarea = document.createElement('textarea')

  for (let i = 0; i < maxIterations; i += 1) {
    textarea.innerHTML = decoded
    const next = textarea.value
    if (next === decoded) break
    decoded = next
  }

  return decoded
}

function isRichHtml(value) {
  return /<\/?(?:div|p|br|strong|b|em|i|u|ul|ol|li|h1|h2|h3|blockquote|span|a)(?:\s|>|\/)/i.test(String(value || ''))
}

function toEditorHtml(raw) {
  if (!raw) return ''
  const text = String(raw)
  if (isRichHtml(text)) return text

  // Normalize recursively encoded entities so re-renders do not compound `&amp;...`.
  const normalized = decodeHtmlEntities(text)
  return escapeHtml(normalized).replace(/\n/g, '<br>')
}

function syncEditorFromModel() {
  if (!editorRef.value) return
  const html = toEditorHtml(content.value)
  if (editorRef.value.innerHTML !== html) {
    editorRef.value.innerHTML = html
  }
}

function syncModelFromEditor() {
  if (!editorRef.value) return
  syncingFromEditor.value = true
  content.value = editorRef.value.innerHTML
  nextTick(() => {
    syncingFromEditor.value = false
  })
}

function runCommand(actionKey) {
  if (!editorRef.value) return
  editorRef.value.focus()
  if (actionKey.startsWith('formatBlock:')) {
    const block = actionKey.split(':')[1]
    document.execCommand('formatBlock', false, block)
  } else {
    document.execCommand(actionKey, false)
  }
  syncModelFromEditor()
  updateToolbarState()
}

function normalizeFormatBlock(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[<>]/g, '')
}

function isSelectionInsideEditor() {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0 || !editorRef.value) return false
  const anchorNode = selection.anchorNode
  return Boolean(anchorNode && editorRef.value.contains(anchorNode))
}

function updateToolbarState() {
  if (!editorRef.value || !isSelectionInsideEditor()) {
    activeToolbar.value = {}
    return
  }

  const block = normalizeFormatBlock(document.queryCommandValue('formatBlock'))
  activeToolbar.value = {
    bold: document.queryCommandState('bold'),
    italic: document.queryCommandState('italic'),
    underline: document.queryCommandState('underline'),
    insertUnorderedList: document.queryCommandState('insertUnorderedList'),
    insertOrderedList: document.queryCommandState('insertOrderedList'),
    'formatBlock:h2': block === 'h2',
    'formatBlock:blockquote': block === 'blockquote',
  }
}

function isActionActive(actionKey) {
  return Boolean(activeToolbar.value[actionKey])
}

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
  syncEditorFromModel()
  document.addEventListener('selectionchange', updateToolbarState)
})

onBeforeUnmount(() => {
  document.removeEventListener('selectionchange', updateToolbarState)
})

watch(
  () => content.value,
  () => {
    if (syncingFromEditor.value) return
    if (document.activeElement === editorRef.value) return
    nextTick(() => {
      syncEditorFromModel()
    })
  },
)

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

function askUnsaved(action) {
  pendingAction.value = action
  unsavedModalOpen.value = true
}

function closeUnsavedModal() {
  pendingAction.value = null
  unsavedModalOpen.value = false
}

async function proceedPendingAction() {
  if (!pendingAction.value) return

  if (pendingAction.value.type === 'select') {
    await selectNote(pendingAction.value.noteId)
  } else if (pendingAction.value.type === 'newDraft') {
    resetEditor()
  }

  closeUnsavedModal()
}

async function handleSelectNote(noteId) {
  if (selectedNoteId.value === noteId) return
  if (hasUnsavedChanges()) {
    askUnsaved({ type: 'select', noteId })
    return
  }
  await selectNote(noteId)
}

function handleNewDraft() {
  if (hasUnsavedChanges()) {
    askUnsaved({ type: 'newDraft' })
    return
  }
  resetEditor()
}

async function saveThenContinue() {
  await saveNote(props.authId)
  if (hasUnsavedChanges()) return
  await proceedPendingAction()
}

async function discardThenContinue() {
  await proceedPendingAction()
}

function openShareModal() {
  if (!selectedNote.value?.id) return
  shareModalCopied.value = false
  shareModalOpen.value = true
}

function closeShareModal() {
  shareModalOpen.value = false
  shareModalCopied.value = false
}

async function enableShareFromModal() {
  if (!selectedNote.value?.id) return
  await shareNote(selectedNote.value.id, props.authId)
  shareModalCopied.value = false
}

async function disableShareFromModal() {
  if (!selectedNote.value?.id) return
  await unshareNote(selectedNote.value.id, props.authId)
  shareModalCopied.value = false
}

async function copyShareLink() {
  if (!shareLink.value) return
  try {
    await navigator.clipboard.writeText(shareLink.value)
    shareModalCopied.value = true
    status.value = 'Share link copied'
  } catch {
    shareModalCopied.value = false
    status.value = 'Failed to copy share link'
  }
}
</script>

<template>
  <main class="mx-auto grid w-full max-w-[1280px] grid-cols-1 gap-5 overflow-x-hidden p-5 lg:grid-cols-12">
    <aside class="min-w-0 self-start rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm lg:col-span-4">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 class="text-base font-semibold text-neutral-900">Workspace</h2>
          <p class="text-xs text-neutral-500">{{ noteCountLabel }}</p>
        </div>
        <div class="flex gap-2">
          <BaseButton variant="secondary" @click="loadNotes(authId)">Reload</BaseButton>
          <BaseButton variant="secondary" @click="handleNewDraft">New Draft</BaseButton>
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
          class="flex min-h-24 min-w-0 items-start gap-2 rounded-xl border p-2 transition-colors"
          :class="note.id === selectedNoteId ? 'border-blue-400 bg-blue-50/50 shadow-sm' : 'border-neutral-200 bg-white hover:bg-neutral-50'"
        >
          <button
            class="flex min-w-0 flex-1 flex-col justify-start overflow-hidden rounded-md px-1 py-0.5 text-left"
            @click="handleSelectNote(note.id)"
          >
            <p class="truncate text-sm font-semibold text-neutral-900">{{ note.title || 'Untitled Note' }}</p>
            <p class="note-preview mt-1 text-xs text-neutral-500">{{ preview(note.content) }}</p>
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

    <section class="min-w-0 flex h-[72vh] flex-col rounded-2xl border border-neutral-200 bg-white shadow-sm lg:col-span-8">
      <div class="border-b border-neutral-200 px-6 py-5">
        <p class="text-xs font-medium uppercase tracking-wide text-neutral-400">Editor</p>
        <input
          v-model="title"
          class="mt-2 w-full border-0 p-0 text-3xl font-bold text-neutral-900 outline-none placeholder:text-neutral-300"
          placeholder="Untitled"
        />
      </div>
      <div class="flex min-h-0 min-w-0 flex-1 flex-col px-6 py-5">
        <div class="group relative min-h-0 min-w-0 flex-1">
          <div class="pointer-events-none absolute right-0 top-0 z-10 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            <div class="pointer-events-auto flex flex-wrap gap-1 rounded-lg border border-neutral-200 bg-white/95 p-1 shadow-sm backdrop-blur">
              <button
                v-for="action in toolbarActions"
                :key="action.key"
                type="button"
                class="rounded-md border px-2 py-1 text-xs font-semibold transition-colors"
                :class="isActionActive(action.key) ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50'"
                :title="action.title"
                @click="runCommand(action.key)"
              >
                {{ action.label }}
              </button>
            </div>
          </div>

          <div
            ref="editorRef"
            class="editor-input min-h-0 min-w-0 h-full overflow-y-auto rounded-xl border border-neutral-200 bg-neutral-50/40 p-4 text-base leading-8 text-neutral-800 outline-none focus:border-neutral-300"
            contenteditable="true"
            data-placeholder="Write your ideas here..."
            @input="syncModelFromEditor(); updateToolbarState()"
            @keyup="updateToolbarState"
            @mouseup="updateToolbarState"
            @focus="updateToolbarState"
          />
        </div>
      </div>
      <div class="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 px-6 py-4">
        <span class="text-xs text-neutral-500">{{ status }}</span>
        <div class="flex flex-wrap items-center justify-end gap-2">
          <BaseButton variant="secondary" :disabled="!selectedNoteId" @click="openShareModal">Share</BaseButton>
          <BaseButton size="md" @click="saveNote(authId)">{{ saveButtonLabel }}</BaseButton>
        </div>
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

  <div
    v-if="unsavedModalOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    @click.self="closeUnsavedModal"
  >
    <div class="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
      <h3 class="text-base font-semibold text-neutral-900">Unsaved changes</h3>
      <p class="mt-2 text-sm text-neutral-600">
        You have unsaved changes. Do you want to save before continuing?
      </p>
      <div class="mt-5 flex flex-wrap justify-end gap-2">
        <BaseButton variant="secondary" @click="closeUnsavedModal">Cancel</BaseButton>
        <BaseButton variant="secondary" @click="discardThenContinue">Discard</BaseButton>
        <BaseButton @click="saveThenContinue">Save & Continue</BaseButton>
      </div>
    </div>
  </div>

  <div
    v-if="shareModalOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    @click.self="closeShareModal"
  >
    <div class="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
      <h3 class="text-base font-semibold text-neutral-900">Share note</h3>
      <p class="mt-2 text-sm text-neutral-600">
        {{ selectedNote?.isPublic ? 'Anyone with this link can view the note.' : 'Create a public link to share this note.' }}
      </p>

      <div class="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
        <p class="truncate text-sm font-medium text-neutral-800">{{ selectedNote?.title || 'Untitled Note' }}</p>
        <p v-if="shareLink" class="mt-2 break-all text-xs font-medium text-blue-700">{{ shareLink }}</p>
        <p v-else class="mt-2 text-xs text-neutral-500">No share link created yet.</p>
      </div>

      <p v-if="shareModalCopied" class="mt-3 text-xs font-medium text-emerald-600">Copied to clipboard</p>

      <div class="mt-5 flex flex-wrap justify-end gap-2">
        <BaseButton variant="secondary" @click="closeShareModal">Close</BaseButton>
        <BaseButton
          v-if="selectedNote?.isPublic"
          variant="secondary"
          :disabled="sharingNoteId === selectedNoteId"
          @click="disableShareFromModal"
        >
          {{ sharingNoteId === selectedNoteId ? 'Working...' : 'Disable Share' }}
        </BaseButton>
        <BaseButton
          v-if="selectedNote?.isPublic"
          :disabled="!shareLink"
          @click="copyShareLink"
        >
          Copy Link
        </BaseButton>
        <BaseButton
          v-else
          :disabled="sharingNoteId === selectedNoteId"
          @click="enableShareFromModal"
        >
          {{ sharingNoteId === selectedNoteId ? 'Creating...' : 'Create Link' }}
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.editor-input:empty:before {
  content: attr(data-placeholder);
  color: #a3a3a3;
}

.editor-input :deep(h1),
.editor-input :deep(h2),
.editor-input :deep(h3) {
  font-weight: 700;
  margin: 0.5rem 0;
}

.editor-input :deep(blockquote) {
  border-left: 3px solid #d4d4d4;
  margin: 0.5rem 0;
  padding-left: 0.75rem;
  color: #525252;
}

.editor-input :deep(ul),
.editor-input :deep(ol) {
  margin: 0.5rem 0 0.5rem 1.2rem;
}

.note-preview {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.25rem;
  min-height: 2.5rem;
}
</style>
