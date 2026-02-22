// DTO types for note-service
export interface CreateNoteDto {
  userId: string;
  title?: string;
  content?: string;
}

export interface NoteResponse {
  id: string;
  userId: string;
  title: string;
  content: string | null;
  createdAt: Date;
  updatedAt: Date;
}
