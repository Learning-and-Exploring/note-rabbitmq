<template>
  <div class="min-h-screen bg-[#fbfbfa] text-[#37352f]">
    <AppHeader title="NotionUI Notes" />

    <main class="mx-auto flex w-full max-w-7xl gap-6 px-4 py-6 md:px-10">
      <aside class="w-full rounded-xl border border-gray-200 bg-white p-4 md:w-80">
        <h2 class="mb-3 text-sm font-semibold text-gray-600">Workspace</h2>
        <label class="mb-2 block text-xs text-gray-500">Auth ID</label>
        <input
          v-model="authId"
          type="text"
          class="mb-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#2383e2]"
          placeholder="Enter authId from your backend"
        />
        <UiBaseButton variant="secondary" @click="loadNotes">Load Notes</UiBaseButton>

        <div class="mt-4 space-y-2">
          <button
            v-for="note in notes"
            :key="note.id"
            type="button"
            class="w-full rounded-md border border-gray-200 px-3 py-2 text-left transition hover:border-gray-300 hover:bg-gray-50"
            @click="selectNote(note.id)"
          >
            <p class="truncate text-sm font-medium">{{ note.title || "Untitled Note" }}</p>
            <p class="truncate text-xs text-gray-500">{{ preview(note.content) }}</p>
          </button>
        </div>

        <p v-if="notes.length === 0" class="mt-4 text-xs text-gray-500">No notes yet.</p>
      </aside>

      <section class="min-h-[70vh] flex-1 rounded-xl border border-gray-200 bg-white p-6 md:p-10">
        <NotionIcon emoji="📝" />
        <input
          v-model="title"
          type="text"
          class="mb-4 w-full border-none text-4xl font-bold tracking-tight outline-none"
          placeholder="Untitled"
        />
        <textarea
          v-model="content"
          class="min-h-[50vh] w-full resize-none border-none text-[17px] leading-8 outline-none"
          placeholder="Type '/' for commands..."
        />
        <div class="mt-6 flex items-center gap-3">
          <UiBaseButton @click="createCurrentAsNote">Save Note</UiBaseButton>
          <UiBaseButton variant="secondary" @click="clearEditor">New Draft</UiBaseButton>
          <span class="text-xs text-gray-500">{{ status }}</span>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
type Note = {
  id: string;
  authId: string;
  title: string;
  content: string | null;
  createdAt: string;
  updatedAt: string;
};

const { listNotes, getNote, createNote } = useNotesApi();

const authId = ref("");
const notes = ref<Note[]>([]);
const title = ref("");
const content = ref("");
const status = ref("Ready");

const preview = (value: string | null) => {
  if (!value) return "No content";
  return value.slice(0, 70);
};

const clearEditor = () => {
  title.value = "";
  content.value = "";
  status.value = "New draft";
};

const loadNotes = async () => {
  if (!authId.value.trim()) {
    status.value = "Enter authId first";
    return;
  }

  status.value = "Loading notes...";
  try {
    const response = await listNotes(authId.value.trim());
    notes.value = response.data;
    status.value = `Loaded ${notes.value.length} note(s)`;
  } catch {
    status.value = "Failed to load notes";
  }
};

const selectNote = async (id: string) => {
  status.value = "Loading note...";
  try {
    const response = await getNote(id);
    title.value = response.data.title || "";
    content.value = response.data.content || "";
    status.value = "Loaded note";
  } catch {
    status.value = "Failed to load note";
  }
};

const createCurrentAsNote = async () => {
  if (!authId.value.trim()) {
    status.value = "Enter authId first";
    return;
  }

  status.value = "Saving...";
  try {
    await createNote({
      authId: authId.value.trim(),
      title: title.value.trim() || "Untitled Note",
      content: content.value,
    });
    status.value = "Saved";
    await loadNotes();
  } catch {
    status.value = "Save failed";
  }
};
</script>
