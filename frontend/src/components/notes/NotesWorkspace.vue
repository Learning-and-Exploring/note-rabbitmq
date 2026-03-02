<script setup>
import { onMounted, watch } from 'vue'
import { useNotes } from '@/composables/useNotes'

const props = defineProps({
  authId: {
    type: String,
    required: true,
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
  <main class="layout">
    <aside class="sidebar">
      <h2 class="section-title">Workspace</h2>
      <p class="label">Auth ID</p>
      <input :value="authId" class="input" disabled />
      <button class="btn btn-secondary" @click="loadNotes(authId)">Reload Notes</button>

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
        <button class="btn" @click="saveNote(authId)">Save Note</button>
        <button class="btn btn-secondary" @click="resetEditor">New Draft</button>
        <span class="status">{{ status }}</span>
      </div>
    </section>
  </main>
</template>

<style scoped>
.layout {
  margin: 0 auto;
  display: flex;
  max-width: 1480px;
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

.section-title {
  margin: 0 0 10px;
  font-size: 14px;
  font-weight: 600;
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
  margin: 10px 2px 0;
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

@media (max-width: 1200px) {
  .layout {
    flex-direction: column;
  }

  .sidebar {
    width: auto;
  }
}
</style>
