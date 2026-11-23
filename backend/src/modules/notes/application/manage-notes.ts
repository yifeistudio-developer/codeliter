import type {
  AdminNote,
  CreateNoteInput,
  UpdateNoteInput,
} from "../domain/admin-note.js";
import type { NotePage, NoteRepository } from "../ports/note-repository.js";

export class ManageNotes {
  constructor(private readonly notes: NoteRepository) {}

  list(
    index: number,
    size: number,
    status?: "draft" | "published" | "deleted",
  ): Promise<NotePage<AdminNote>> {
    return this.notes.findAdminPage(index, size, status);
  }

  get(slug: string): Promise<AdminNote | null> {
    return this.notes.findAdminBySlug(slug);
  }

  create(input: CreateNoteInput): Promise<AdminNote> {
    return this.notes.create(input);
  }

  update(slug: string, input: UpdateNoteInput): Promise<AdminNote | null> {
    return this.notes.update(slug, input);
  }

  publish(slug: string): Promise<AdminNote | null> {
    return this.notes.publish(slug);
  }

  unpublish(slug: string): Promise<AdminNote | null> {
    return this.notes.unpublish(slug);
  }

  delete(slug: string): Promise<boolean> {
    return this.notes.softDelete(slug);
  }
}
