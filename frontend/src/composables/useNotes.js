import { ref } from 'vue'

export function useNotes() {
  const notes = ref([])
  const title = ref('')
  const content = ref('')
  const status = ref('Ready')

  function resetEditor() {
    title.value = ''
    content.value = ''
    status.value = 'New draft'
  }

  function preview(value) {
    if (!value) return 'No content'
    return value.slice(0, 70)
  }

  async function loadNotes(authId) {
    if (!authId?.trim()) {
      status.value = 'Missing authId'
      return
    }

    status.value = 'Loading notes...'
    try {
      const res = await fetch(`/api/notes/auth/${encodeURIComponent(authId.trim())}`)
      const payload = await res.json()
      notes.value = payload.data || []
      status.value = `Loaded ${notes.value.length} note(s)`
    } catch (err) {
      console.error(err)
      status.value = 'Failed to load notes'
    }
  }

  async function selectNote(id) {
    status.value = 'Loading note...'
    try {
      const res = await fetch(`/api/notes/${encodeURIComponent(id)}`)
      const payload = await res.json()
      const note = payload.data
      title.value = note?.title || ''
      content.value = note?.content || ''
      status.value = 'Loaded note'
    } catch (err) {
      console.error(err)
      status.value = 'Failed to load note'
    }
  }

  async function saveNote(authId) {
    if (!authId?.trim()) {
      status.value = 'Missing authId'
      return
    }

    status.value = 'Saving...'
    try {
      await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authId: authId.trim(),
          title: title.value.trim() || 'Untitled Note',
          content: content.value,
        }),
      })

      status.value = 'Saved'
      await loadNotes(authId)
    } catch (err) {
      console.error(err)
      status.value = 'Save failed'
    }
  }

  function clearAll() {
    notes.value = []
    title.value = ''
    content.value = ''
    status.value = 'Ready'
  }

  return {
    notes,
    title,
    content,
    status,
    preview,
    resetEditor,
    loadNotes,
    selectNote,
    saveNote,
    clearAll,
  }
}
