import type { NoteRepository } from "../ports/note-repository.js";
import type { PublishedNote } from "../domain/published-note.js";

export class GetPublishedNote {
  constructor(private readonly notes: NoteRepository) {}

  execute(slug: string): Promise<PublishedNote | null> {
    return this.notes.findPublishedBySlug(slug);
  }
}
