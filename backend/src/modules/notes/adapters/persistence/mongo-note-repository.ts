import {
  ObjectId,
  MongoServerError,
  type Collection,
  type Filter,
  type Sort,
} from "mongodb";
import { ConflictError } from "../../../../shared/domain/errors.js";
import type {
  AdminNote,
  CreateNoteInput,
  UpdateNoteInput,
} from "../../domain/admin-note.js";
import type { PublishedNote } from "../../domain/published-note.js";
import type {
  NotePage,
  NoteRepository,
  PublishedNotePage,
  PublishedNoteQuery,
} from "../../ports/note-repository.js";

interface NoteDocument {
  _id: ObjectId;
  slug: string;
  title: string;
  summary: string;
  bodyMarkdown: string;
  status: "draft" | "published" | "deleted";
  publishedAt: Date | null;
  categoryId?: ObjectId | null;
  tagIds?: ObjectId[];
  featured?: boolean;
  readingTimeMinutes?: number | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export class MongoNoteRepository implements NoteRepository {
  constructor(private readonly notes: Collection<NoteDocument>) {}

  async findPublishedPage(
    query: PublishedNoteQuery,
  ): Promise<PublishedNotePage> {
    const filter: Filter<NoteDocument> = { status: "published" };
    const searchTerm = query.q?.trim();

    if (query.categoryId) {
      filter.categoryId = new ObjectId(query.categoryId);
    }

    if (query.tagId) {
      filter.tagIds = { $in: [new ObjectId(query.tagId)] };
    }

    if (query.featured === true) {
      filter.featured = true;
    } else if (query.featured === false) {
      filter.$or = [{ featured: false }, { featured: { $exists: false } }];
    }

    if (searchTerm) {
      filter.$text = { $search: searchTerm };
    }

    const sort: Sort = searchTerm
      ? { score: { $meta: "textScore" }, publishedAt: -1, _id: -1 }
      : { publishedAt: -1, _id: -1 };
    const [documents, total] = await Promise.all([
      this.notes
        .find(filter)
        .sort(sort)
        .skip((query.index - 1) * query.size)
        .limit(query.size)
        .toArray(),
      this.notes.countDocuments(filter),
    ]);

    return {
      items: documents.map(toPublishedNote),
      index: query.index,
      size: query.size,
      total,
    };
  }

  async findPublishedBySlug(slug: string): Promise<PublishedNote | null> {
    const document = await this.notes.findOne({ slug, status: "published" });
    return document ? toPublishedNote(document) : null;
  }

  async findAdminPage(
    index: number,
    size: number,
    status?: "draft" | "published" | "deleted",
  ): Promise<NotePage<AdminNote>> {
    const filter: Filter<NoteDocument> = status
      ? { status }
      : { status: { $ne: "deleted" } };
    const [documents, total] = await Promise.all([
      this.notes
        .find(filter)
        .sort({ updatedAt: -1, _id: -1 })
        .skip((index - 1) * size)
        .limit(size)
        .toArray(),
      this.notes.countDocuments(filter),
    ]);

    return {
      items: documents.map(toAdminNote),
      index,
      size,
      total,
    };
  }

  async findAdminBySlug(slug: string): Promise<AdminNote | null> {
    const document = await this.notes.findOne({
      slug,
      status: { $ne: "deleted" },
    });
    return document ? toAdminNote(document) : null;
  }

  async create(input: CreateNoteInput): Promise<AdminNote> {
    const now = new Date();
    const document: NoteDocument = {
      _id: new ObjectId(),
      slug: input.slug,
      title: input.title,
      summary: input.summary,
      bodyMarkdown: input.bodyMarkdown,
      status: "draft",
      publishedAt: null,
      categoryId: input.categoryId ? new ObjectId(input.categoryId) : null,
      tagIds: (input.tagIds ?? []).map((id) => new ObjectId(id)),
      featured: input.featured ?? false,
      readingTimeMinutes: input.readingTimeMinutes ?? null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    try {
      await this.notes.insertOne(document);
    } catch (error) {
      throwIfSlugConflict(error, "Note");
    }

    return toAdminNote(document);
  }

  async update(slug: string, input: UpdateNoteInput): Promise<AdminNote | null> {
    const fields: Partial<NoteDocument> = { updatedAt: new Date() };
    if (input.title !== undefined) fields.title = input.title;
    if (input.summary !== undefined) fields.summary = input.summary;
    if (input.bodyMarkdown !== undefined) fields.bodyMarkdown = input.bodyMarkdown;
    if (input.categoryId !== undefined) {
      fields.categoryId = input.categoryId ? new ObjectId(input.categoryId) : null;
    }
    if (input.tagIds !== undefined) {
      fields.tagIds = input.tagIds.map((id) => new ObjectId(id));
    }
    if (input.featured !== undefined) fields.featured = input.featured;
    if (input.readingTimeMinutes !== undefined) {
      fields.readingTimeMinutes = input.readingTimeMinutes;
    }

    const result = await this.notes.updateOne(
      { slug, status: { $ne: "deleted" } },
      { $set: fields },
    );
    if (result.matchedCount === 0) return null;

    return this.findAdminBySlug(slug);
  }

  async publish(slug: string): Promise<AdminNote | null> {
    const now = new Date();
    const result = await this.notes.updateOne(
      { slug, status: { $ne: "deleted" } },
      { $set: { status: "published", publishedAt: now, updatedAt: now } },
    );
    if (result.matchedCount === 0) return null;

    return this.findAdminBySlug(slug);
  }

  async unpublish(slug: string): Promise<AdminNote | null> {
    const now = new Date();
    const result = await this.notes.updateOne(
      { slug, status: { $ne: "deleted" } },
      { $set: { status: "draft", publishedAt: null, updatedAt: now } },
    );
    if (result.matchedCount === 0) return null;

    return this.findAdminBySlug(slug);
  }

  async softDelete(slug: string): Promise<boolean> {
    const now = new Date();
    const result = await this.notes.updateOne(
      { slug, status: { $ne: "deleted" } },
      { $set: { status: "deleted", deletedAt: now, updatedAt: now } },
    );
    return result.matchedCount > 0;
  }
}

function toPublishedNote(document: NoteDocument): PublishedNote {
  if (!document.publishedAt) {
    throw new Error(`Published note "${document.slug}" has no publishedAt`);
  }

  return {
    ...toNoteContent(document),
    publishedAt: document.publishedAt,
  };
}

function toAdminNote(document: NoteDocument): AdminNote {
  return {
    ...toNoteContent(document),
    status: document.status,
    publishedAt: document.publishedAt,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    deletedAt: document.deletedAt,
  };
}

function toNoteContent(
  document: NoteDocument,
): Omit<PublishedNote, "publishedAt"> {
  return {
    slug: document.slug,
    title: document.title,
    summary: document.summary,
    bodyMarkdown: document.bodyMarkdown,
    categoryId: document.categoryId?.toHexString() ?? null,
    tagIds: document.tagIds?.map((id) => id.toHexString()) ?? [],
    featured: document.featured ?? false,
    readingTimeMinutes: document.readingTimeMinutes ?? null,
  };
}

function throwIfSlugConflict(error: unknown, entity: string): never {
  if (error instanceof MongoServerError && error.code === 11000) {
    throw new ConflictError(`${entity} slug already exists`);
  }

  throw error;
}
