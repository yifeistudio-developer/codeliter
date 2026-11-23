import type { PublishedNote } from "../domain/published-note.js";
import type {
  AdminNote,
  CreateNoteInput,
  UpdateNoteInput,
} from "../domain/admin-note.js";

export interface NotePage<T> {
  items: T[];
  index: number;
  size: number;
  total: number;
}

export type PublishedNotePage = NotePage<PublishedNote>;

export interface PublishedNoteQuery {
  index: number;
  size: number;
  categoryId?: string;
  tagId?: string;
  q?: string;
  featured?: boolean;
}

export interface NoteRepository {
  findPublishedPage(query: PublishedNoteQuery): Promise<PublishedNotePage>;
  findPublishedBySlug(slug: string): Promise<PublishedNote | null>;
  findAdminPage(
    index: number,
    size: number,
    status?: "draft" | "published" | "deleted",
  ): Promise<NotePage<AdminNote>>;
  findAdminBySlug(slug: string): Promise<AdminNote | null>;
  create(input: CreateNoteInput): Promise<AdminNote>;
  update(slug: string, input: UpdateNoteInput): Promise<AdminNote | null>;
  publish(slug: string): Promise<AdminNote | null>;
  unpublish(slug: string): Promise<AdminNote | null>;
  softDelete(slug: string): Promise<boolean>;
}
