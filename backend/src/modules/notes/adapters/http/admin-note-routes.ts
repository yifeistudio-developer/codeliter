import type { FastifyInstance } from "fastify";
import type {
  CreateNoteInput,
  UpdateNoteInput,
} from "../../domain/admin-note.js";
import type { ManageNotes } from "../../application/manage-notes.js";

interface AdminNoteRoutesOptions {
  manageNotes: ManageNotes;
}

const objectIdSchema = {
  anyOf: [
    { type: "string", pattern: "^[0-9a-fA-F]{24}$" },
    { type: "null" },
  ],
} as const;

const noteFields = {
  title: { type: "string", minLength: 1, maxLength: 200 },
  summary: { type: "string", minLength: 1, maxLength: 500 },
  bodyMarkdown: { type: "string", minLength: 1, maxLength: 500_000 },
  categoryId: objectIdSchema,
  tagIds: {
    type: "array",
    maxItems: 30,
    items: { type: "string", pattern: "^[0-9a-fA-F]{24}$" },
  },
  featured: { type: "boolean" },
  readingTimeMinutes: {
    anyOf: [{ type: "integer", minimum: 1 }, { type: "null" }],
  },
} as const;

const adminNoteSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "slug",
    "title",
    "summary",
    "bodyMarkdown",
    "status",
    "publishedAt",
    "categoryId",
    "tagIds",
    "featured",
    "readingTimeMinutes",
    "createdAt",
    "updatedAt",
    "deletedAt",
  ],
  properties: {
    slug: { type: "string" },
    ...noteFields,
    status: { type: "string", enum: ["draft", "published", "deleted"] },
    publishedAt: { anyOf: [{ type: "string", format: "date-time" }, { type: "null" }] },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
    deletedAt: { anyOf: [{ type: "string", format: "date-time" }, { type: "null" }] },
  },
} as const;

const pageSchema = {
  type: "object",
  additionalProperties: false,
  required: ["items", "index", "size"],
  properties: {
    items: { type: "array", items: adminNoteSchema },
    index: { type: "integer" },
    size: { type: "integer" },
  },
} as const;

export async function registerAdminNoteRoutes(
  app: FastifyInstance,
  options: AdminNoteRoutesOptions,
): Promise<void> {
  app.get<{ Querystring: { index?: number; size?: number; status?: "draft" | "published" | "deleted" } }>(
    "/notes",
    {
      schema: {
        response: { 200: pageSchema },
        querystring: {
          type: "object",
          additionalProperties: false,
          properties: {
            index: { type: "integer", minimum: 1, default: 1 },
            size: { type: "integer", minimum: 1, maximum: 100, default: 20 },
            status: { type: "string", enum: ["draft", "published", "deleted"] },
          },
        },
      },
    },
    async (request) => serializePage(
      await options.manageNotes.list(
        request.query.index ?? 1,
        request.query.size ?? 20,
        request.query.status,
      ),
    ),
  );

  app.get<{ Params: { slug: string } }>(
    "/notes/:slug",
    { schema: { params: slugParamsSchema, response: { 200: adminNoteSchema } } },
    async (request, reply) => {
      const note = await options.manageNotes.get(request.params.slug);
      if (!note) return reply.code(404).send(notFound("NOTE_NOT_FOUND"));
      return serializeNote(note);
    },
  );

  app.post<{ Body: CreateNoteInput }>(
    "/notes",
    {
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          required: ["slug", "title", "summary", "bodyMarkdown"],
          properties: {
            slug: { type: "string", pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$", maxLength: 160 },
            ...noteFields,
          },
        },
        response: { 201: adminNoteSchema },
      },
    },
    async (request, reply) =>
      reply.code(201).send(serializeNote(await options.manageNotes.create(request.body))),
  );

  app.patch<{ Params: { slug: string }; Body: UpdateNoteInput }>(
    "/notes/:slug",
    {
      schema: {
        params: slugParamsSchema,
        body: { type: "object", additionalProperties: false, minProperties: 1, properties: noteFields },
        response: { 200: adminNoteSchema },
      },
    },
    async (request, reply) => {
      const note = await options.manageNotes.update(request.params.slug, request.body);
      if (!note) return reply.code(404).send(notFound("NOTE_NOT_FOUND"));
      return serializeNote(note);
    },
  );

  app.post<{ Params: { slug: string } }>(
    "/notes/:slug/publish",
    { schema: { params: slugParamsSchema, response: { 200: adminNoteSchema } } },
    async (request, reply) => {
      const note = await options.manageNotes.publish(request.params.slug);
      if (!note) return reply.code(404).send(notFound("NOTE_NOT_FOUND"));
      return serializeNote(note);
    },
  );

  app.post<{ Params: { slug: string } }>(
    "/notes/:slug/unpublish",
    { schema: { params: slugParamsSchema, response: { 200: adminNoteSchema } } },
    async (request, reply) => {
      const note = await options.manageNotes.unpublish(request.params.slug);
      if (!note) return reply.code(404).send(notFound("NOTE_NOT_FOUND"));
      return serializeNote(note);
    },
  );

  app.delete<{ Params: { slug: string } }>(
    "/notes/:slug",
    { schema: { params: slugParamsSchema } },
    async (request, reply) => {
      const deleted = await options.manageNotes.delete(request.params.slug);
      if (!deleted) return reply.code(404).send(notFound("NOTE_NOT_FOUND"));
      return reply.code(200).send({});
    },
  );
}

const slugParamsSchema = {
  type: "object",
  required: ["slug"],
  additionalProperties: false,
  properties: {
    slug: { type: "string", pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$", maxLength: 160 },
  },
} as const;

function serializePage(page: Awaited<ReturnType<ManageNotes["list"]>>) {
  return {
    index: page.index,
    size: page.size,
    items: page.items.map(serializeNote),
  };
}

function serializeNote(note: {
  slug: string;
  title: string;
  summary: string;
  bodyMarkdown: string;
  status: "draft" | "published" | "deleted";
  publishedAt: Date | null;
  categoryId: string | null;
  tagIds: string[];
  featured: boolean;
  readingTimeMinutes: number | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}) {
  return {
    ...note,
    publishedAt: note.publishedAt?.toISOString() ?? null,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
    deletedAt: note.deletedAt?.toISOString() ?? null,
  };
}

function notFound(code: string) {
  return { error: { code, message: "Resource not found" } };
}
