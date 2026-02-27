// DTO types for note-service
export interface CreateNoteDto {
  authId: string;
  title?: string;
  content?: string;
}

export interface NoteResponse {
  id: string;
  authId: string;
  title: string;
  content: string | null;
  createdAt: Date;
  updatedAt: Date;
}
