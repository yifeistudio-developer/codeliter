import type { PublishedNote } from "./published-note.js";

export interface AdminNote extends Omit<PublishedNote, "publishedAt"> {
  publishedAt: Date | null;
  status: "draft" | "published" | "deleted";
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CreateNoteInput {
  slug: string;
  title: string;
  summary: string;
  bodyMarkdown: string;
  categoryId?: string | null;
  tagIds?: string[];
  featured?: boolean;
  readingTimeMinutes?: number | null;
}

export type UpdateNoteInput = Partial<Omit<CreateNoteInput, "slug">>;
