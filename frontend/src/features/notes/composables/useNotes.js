import { ref } from 'vue'
import { useAuth } from '@/features/auth/composables/useAuth'
import { http, isErrorStatus } from '@/lib/http'

export function useNotes() {
  const notes = ref([])
  const title = ref('')
  const content = ref('')
  const status = ref('Ready')
  const selectedNoteId = ref('')
  const deletingNoteId = ref('')
  const sharingNoteId = ref('')
  const savedTitle = ref('')
  const savedContent = ref('')
  const { getAccessToken, expireSession } = useAuth()

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

  function syncSavedSnapshot() {
    savedTitle.value = title.value
    savedContent.value = content.value
  }

  function hasUnsavedChanges() {
    return title.value !== savedTitle.value || content.value !== savedContent.value
  }

  function resetEditor() {
    selectedNoteId.value = ''
    title.value = ''
    content.value = ''
    status.value = 'New draft'
    syncSavedSnapshot()
  }

  function preview(value) {
    if (!value) return 'No content'
    const plain = decodeHtmlEntities(String(value))
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\u00a0/g, ' ')
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
      const res = await http.get(`/api/notes/auth/${encodeURIComponent(authId.trim())}`, {
        headers: authHeaders(),
      })
      const payload = res.data || {}
      if (res.status === 401) {
        handleUnauthorized(payload)
        return
      }
      if (isErrorStatus(res.status)) {
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
      const res = await http.get(`/api/notes/${encodeURIComponent(id)}`, {
        headers: authHeaders(),
      })
      const payload = res.data || {}
      if (res.status === 401) {
        handleUnauthorized(payload)
        return
      }
      if (isErrorStatus(res.status)) {
        status.value = payload.message || 'Failed to load note'
        return
      }
      const note = payload.data
      selectedNoteId.value = note?.id || ''
      title.value = note?.title || ''
      content.value = note?.content || ''
      status.value = 'Loaded note'
      syncSavedSnapshot()
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

      const request = isUpdate ? http.patch : http.post
      const res = await request(endpoint, body, {
        headers: authHeaders({ 'Content-Type': 'application/json' }),
      })
      const payload = res.data || {}
      if (res.status === 401) {
        handleUnauthorized(payload)
        return
      }
      if (isErrorStatus(res.status)) {
        status.value = payload.message || 'Save failed'
        return
      }

      status.value = isUpdate ? 'Updated' : 'Saved'
      if (payload?.data?.id) {
        selectedNoteId.value = payload.data.id
      }
      if (payload?.data?.title !== undefined) {
        title.value = payload.data.title || ''
      }
      if (payload?.data?.content !== undefined) {
        content.value = payload.data.content || ''
      }
      syncSavedSnapshot()
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
      const res = await http.delete(`/api/notes/${encodeURIComponent(id)}`, {
        headers: authHeaders(),
      })
      const payload = res.data || {}

      if (res.status === 401) {
        handleUnauthorized(payload)
        return
      }

      if (isErrorStatus(res.status)) {
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

  function buildShareUrl(token) {
    if (!token) return ''
    return `${window.location.origin}/shared/${token}`
  }

  async function shareNote(id, authId) {
    if (!id) {
      status.value = 'Missing note id'
      return ''
    }
    if (!authId?.trim()) {
      status.value = 'Missing authId'
      return ''
    }

    sharingNoteId.value = id
    status.value = 'Creating share link...'
    try {
      const res = await http.post(`/api/notes/${encodeURIComponent(id)}/share`, { authId: authId.trim() }, {
        headers: authHeaders({ 'Content-Type': 'application/json' }),
      })

      const payload = res.data || {}
      if (res.status === 401) {
        handleUnauthorized(payload)
        return ''
      }
      if (isErrorStatus(res.status)) {
        status.value = payload.message || 'Share failed'
        return ''
      }

      status.value = 'Share link ready'
      if (authId?.trim()) {
        await loadNotes(authId)
      }
      return buildShareUrl(payload?.data?.shareToken)
    } catch (err) {
      console.error(err)
      status.value = 'Share failed'
      return ''
    } finally {
      sharingNoteId.value = ''
    }
  }

  async function unshareNote(id, authId) {
    if (!id) {
      status.value = 'Missing note id'
      return false
    }
    if (!authId?.trim()) {
      status.value = 'Missing authId'
      return false
    }

    sharingNoteId.value = id
    status.value = 'Disabling share...'
    try {
      const res = await http.delete(`/api/notes/${encodeURIComponent(id)}/share`, {
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        data: { authId: authId.trim() },
      })

      const payload = res.data || {}
      if (res.status === 401) {
        handleUnauthorized(payload)
        return false
      }
      if (isErrorStatus(res.status)) {
        status.value = payload.message || 'Disable share failed'
        return false
      }

      status.value = 'Share disabled'
      if (authId?.trim()) {
        await loadNotes(authId)
      }
      return true
    } catch (err) {
      console.error(err)
      status.value = 'Disable share failed'
      return false
    } finally {
      sharingNoteId.value = ''
    }
  }

  function clearAll() {
    notes.value = []
    selectedNoteId.value = ''
    title.value = ''
    content.value = ''
    status.value = 'Ready'
    syncSavedSnapshot()
  }

  return {
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
  }
}
