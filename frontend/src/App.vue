<script setup>
import { ref } from 'vue'

const authId = ref('')
const notes = ref([])
const title = ref('')
const content = ref('')
const status = ref('Ready')

function preview(value) {
  if (!value) return 'No content'
  return value.slice(0, 70)
}

async function loadNotes() {
  if (!authId.value.trim()) {
    status.value = 'Enter authId first'
    return
  }

  status.value = 'Loading notes...'
  try {
    const res = await fetch(`/api/notes/auth/${encodeURIComponent(authId.value.trim())}`)
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

async function saveNote() {
  if (!authId.value.trim()) {
    status.value = 'Enter authId first'
    return
  }

  status.value = 'Saving...'
  try {
    await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        authId: authId.value.trim(),
        title: title.value.trim() || 'Untitled Note',
        content: content.value,
      }),
    })
    status.value = 'Saved'
    await loadNotes()
  } catch (err) {
    console.error(err)
    status.value = 'Save failed'
  }
}

function clearEditor() {
  title.value = ''
  content.value = ''
  status.value = 'New draft'
}
</script>

<template>
  <div class="page">
    <header class="topbar">
      <h1>Notes</h1>
    </header>

    <main class="layout">
      <aside class="sidebar">
        <p class="label">Auth ID</p>
        <input v-model="authId" class="input" placeholder="Enter authId from your backend" />
        <button class="btn btn-secondary" @click="loadNotes">Load Notes</button>

        <div class="notes">
          <button
            v-for="note in notes"
            :key="note.id"
            class="note-item"
            @click="selectNote(note.id)"
          >
            <p class="note-title">{{ note.title || 'Untitled Note' }}</p>
            <p class="note-preview">{{ preview(note.content) }}</p>
          </button>
          <p v-if="notes.length === 0" class="hint">No notes yet.</p>
        </div>
      </aside>

      <section class="editor">
        <p class="emoji">📝</p>
        <input v-model="title" class="title" placeholder="Untitled" />
        <textarea
          v-model="content"
          class="content"
          placeholder="Type '/' for commands..."
        />

        <div class="actions">
          <button class="btn" @click="saveNote">Save Note</button>
          <button class="btn btn-secondary" @click="clearEditor">New Draft</button>
          <span class="status">{{ status }}</span>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #fbfbfa;
  color: #37352f;
}

.topbar {
  border-bottom: 1px solid #ececec;
  background: #fff;
  padding: 14px 20px;
}

.topbar h1 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.layout {
  margin: 0 auto;
  display: flex;
  max-width: 1200px;
  gap: 16px;
  padding: 20px;
}

.sidebar {
  width: 320px;
  border: 1px solid #ececec;
  border-radius: 12px;
  background: #fff;
  padding: 16px;
}

.label {
  margin: 0 0 6px;
  font-size: 12px;
  color: #787878;
}

.input {
  width: 100%;
  border: 1px solid #d8d8d8;
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 10px;
}

.notes {
  margin-top: 12px;
  display: grid;
  gap: 8px;
}

.note-item {
  width: 100%;
  border: 1px solid #ececec;
  border-radius: 8px;
  background: #fff;
  padding: 10px;
  text-align: left;
}

.note-title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
}

.note-preview {
  margin: 4px 0 0;
  font-size: 12px;
  color: #888;
}

.hint {
  margin: 4px 2px;
  font-size: 12px;
  color: #888;
}

.editor {
  flex: 1;
  min-height: 70vh;
  border: 1px solid #ececec;
  border-radius: 12px;
  background: #fff;
  padding: 24px;
}

.emoji {
  margin: 0 0 8px;
  font-size: 44px;
}

.title {
  width: 100%;
  border: 0;
  outline: none;
  font-size: 44px;
  font-weight: 700;
  margin-bottom: 10px;
}

.content {
  width: 100%;
  min-height: 50vh;
  resize: vertical;
  border: 0;
  outline: none;
  font-size: 17px;
  line-height: 1.8;
}

.actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 16px;
}

.status {
  font-size: 12px;
  color: #777;
}

.btn {
  border: 0;
  border-radius: 8px;
  background: #2383e2;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  padding: 8px 12px;
}

.btn-secondary {
  background: #f4f4f4;
  color: #333;
}

@media (max-width: 960px) {
  .layout {
    flex-direction: column;
  }

  .sidebar {
    width: auto;
  }
}
</style>
