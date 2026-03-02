type Note = {
  id: string;
  authId: string;
  title: string;
  content: string | null;
  createdAt: string;
  updatedAt: string;
};

type NotesResponse = { data: Note[] };
type NoteResponse = { data: Note };
type CreateNoteResponse = { message: string; data: Note };

export const useNotesApi = () => {
  const listNotes = async (authId: string) => {
    return await $fetch<NotesResponse>("/api/notes", {
      query: { authId },
    });
  };

  const getNote = async (id: string) => {
    return await $fetch<NoteResponse>(`/api/notes/${id}`);
  };

  const createNote = async (payload: {
    authId: string;
    title?: string;
    content?: string;
  }) => {
    return await $fetch<CreateNoteResponse>("/api/notes", {
      method: "POST",
      body: payload,
    });
  };

  return { listNotes, getNote, createNote };
};
