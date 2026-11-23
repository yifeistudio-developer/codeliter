import type { FastifyInstance } from "fastify";
import type { GetPublishedNote } from "../../application/get-published-note.js";
import type { ListPublishedNotes } from "../../application/list-published-notes.js";

interface NoteRoutesOptions {
  getPublishedNote: GetPublishedNote;
  listPublishedNotes: ListPublishedNotes;
}

const noteResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "slug",
    "title",
    "summary",
    "bodyMarkdown",
    "publishedAt",
    "categoryId",
    "tagIds",
    "featured",
    "readingTimeMinutes",
  ],
  properties: {
    slug: { type: "string" },
    title: { type: "string" },
    summary: { type: "string" },
    bodyMarkdown: { type: "string" },
    publishedAt: { type: "string", format: "date-time" },
    categoryId: { type: ["string", "null"] },
    tagIds: { type: "array", items: { type: "string" } },
    featured: { type: "boolean" },
    readingTimeMinutes: { type: ["integer", "null"] },
  },
} as const;

const notePageResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["items", "index", "size"],
  properties: {
    items: { type: "array", items: noteResponseSchema },
    index: { type: "integer" },
    size: { type: "integer" },
  },
} as const;

export async function registerNoteRoutes(
  app: FastifyInstance,
  options: NoteRoutesOptions,
): Promise<void> {
  app.get<{
    Querystring: {
      index?: number;
      size?: number;
      categoryId?: string;
      tagId?: string;
      q?: string;
      featured?: boolean;
    };
  }>(
    "/api/v1/notes",
    {
      schema: {
        response: { 200: notePageResponseSchema },
        querystring: {
          type: "object",
          additionalProperties: false,
          properties: {
            index: { type: "integer", minimum: 1, default: 1 },
            size: { type: "integer", minimum: 1, maximum: 50, default: 10 },
            categoryId: { type: "string", pattern: "^[0-9a-fA-F]{24}$" },
            tagId: { type: "string", pattern: "^[0-9a-fA-F]{24}$" },
            q: { type: "string", minLength: 1, maxLength: 120 },
            featured: { type: "boolean" },
          },
        },
      },
    },
    async (request) => {
      const result = await options.listPublishedNotes.execute({
        index: request.query.index ?? 1,
        size: request.query.size ?? 10,
        ...(request.query.categoryId && { categoryId: request.query.categoryId }),
        ...(request.query.tagId && { tagId: request.query.tagId }),
        ...(request.query.q && { q: request.query.q }),
        ...(request.query.featured !== undefined && {
          featured: request.query.featured,
        }),
      });

      return {
        index: result.index,
        size: result.size,
        items: result.items.map(serializeNote),
      };
    },
  );

  app.get<{ Params: { slug: string } }>(
    "/api/v1/notes/:slug",
    {
      schema: {
        params: {
          type: "object",
          required: ["slug"],
          properties: { slug: { type: "string", minLength: 1, maxLength: 160 } },
        },
        response: { 200: noteResponseSchema },
      },
    },
    async (request, reply) => {
      const note = await options.getPublishedNote.execute(request.params.slug);

      if (!note) {
        return reply.code(404).send({
          error: { code: "NOTE_NOT_FOUND", message: "Note not found" },
        });
      }

      return serializeNote(note);
    },
  );
}

function serializeNote(note: {
  slug: string;
  title: string;
  summary: string;
  bodyMarkdown: string;
  publishedAt: Date;
  categoryId: string | null;
  tagIds: string[];
  featured: boolean;
  readingTimeMinutes: number | null;
}) {
  return {
    ...note,
    publishedAt: note.publishedAt.toISOString(),
  };
}
