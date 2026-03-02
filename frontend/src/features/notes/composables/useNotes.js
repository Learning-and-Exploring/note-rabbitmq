import { ref } from 'vue'
import { useAuth } from '@/features/auth/composables/useAuth'

export function useNotes() {
  const notes = ref([])
  const title = ref('')
  const content = ref('')
  const status = ref('Ready')
  const selectedNoteId = ref('')
  const deletingNoteId = ref('')
  const { getAccessToken, expireSession } = useAuth()

  function authHeaders(baseHeaders = {}) {
    const token = getAccessToken()
    if (!token) return baseHeaders
    return {
      ...baseHeaders,
      Authorization: `Bearer ${token}`,
    }
  }

  function handleUnauthorized(payload) {
    expireSession(payload?.message || 'Session expired. Please login again.')
    status.value = 'Session expired. Please login again.'
  }

  function resetEditor() {
    selectedNoteId.value = ''
    title.value = ''
    content.value = ''
    status.value = 'New draft'
  }

  function preview(value) {
    if (!value) return 'No content'
    const plain = String(value)
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/\s+/g, ' ')
      .trim()
    const compact = plain || 'No content'
    if (compact.length <= 70) return compact
    return `${compact.slice(0, 70)}...`
  }

  async function loadNotes(authId) {
    if (!authId?.trim()) {
      status.value = 'Missing authId'
      return
    }

    status.value = 'Loading notes...'
    try {
      const res = await fetch(`/api/notes/auth/${encodeURIComponent(authId.trim())}`, {
        headers: authHeaders(),
      })
      const payload = await res.json()
      if (res.status === 401) {
        handleUnauthorized(payload)
        return
      }
      if (!res.ok) {
        status.value = payload.message || 'Failed to load notes'
        return
      }
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
      const res = await fetch(`/api/notes/${encodeURIComponent(id)}`, {
        headers: authHeaders(),
      })
      const payload = await res.json()
      if (res.status === 401) {
        handleUnauthorized(payload)
        return
      }
      if (!res.ok) {
        status.value = payload.message || 'Failed to load note'
        return
      }
      const note = payload.data
      selectedNoteId.value = note?.id || ''
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
      const isUpdate = Boolean(selectedNoteId.value)
      const endpoint = isUpdate
        ? `/api/notes/${encodeURIComponent(selectedNoteId.value)}`
        : '/api/notes'

      const body = isUpdate
        ? {
            title: title.value.trim() || 'Untitled Note',
            content: content.value,
          }
        : {
            authId: authId.trim(),
            title: title.value.trim() || 'Untitled Note',
            content: content.value,
          }

      const res = await fetch(endpoint, {
        method: isUpdate ? 'PUT' : 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(body),
      })
      const payload = await res.json()
      if (res.status === 401) {
        handleUnauthorized(payload)
        return
      }
      if (!res.ok) {
        status.value = payload.message || 'Save failed'
        return
      }

      status.value = isUpdate ? 'Updated' : 'Saved'
      if (isUpdate && payload?.data?.id) {
        selectedNoteId.value = payload.data.id
      }
      await loadNotes(authId)
    } catch (err) {
      console.error(err)
      status.value = 'Save failed'
    }
  }

  async function deleteNote(id, authId) {
    if (!id) {
      status.value = 'Missing note id'
      return
    }

    deletingNoteId.value = id
    status.value = 'Deleting...'
    try {
      const res = await fetch(`/api/notes/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })

      let payload = {}
      try {
        payload = await res.json()
      } catch {
        payload = {}
      }

      if (res.status === 401) {
        handleUnauthorized(payload)
        return
      }

      if (!res.ok) {
        status.value = payload.message || 'Delete failed'
        return
      }

      if (selectedNoteId.value === id) {
        resetEditor()
      }

      status.value = 'Deleted'
      if (authId?.trim()) {
        await loadNotes(authId)
      }
    } catch (err) {
      console.error(err)
      status.value = 'Delete failed'
    } finally {
      deletingNoteId.value = ''
    }
  }

  function clearAll() {
    notes.value = []
    selectedNoteId.value = ''
    title.value = ''
    content.value = ''
    status.value = 'Ready'
  }

  return {
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
  }
}
