import type {
  NoteRepository,
  PublishedNoteQuery,
  PublishedNotePage,
} from "../ports/note-repository.js";

export class ListPublishedNotes {
  constructor(private readonly notes: NoteRepository) {}

  execute(query: PublishedNoteQuery): Promise<PublishedNotePage> {
    return this.notes.findPublishedPage(query);
  }
}
