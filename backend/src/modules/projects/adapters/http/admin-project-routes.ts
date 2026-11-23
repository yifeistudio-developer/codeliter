import type { FastifyInstance } from "fastify";
import type {
  CreateProjectInput,
  UpdateProjectInput,
} from "../../domain/admin-project.js";
import type { ManageProjects } from "../../application/manage-projects.js";

interface AdminProjectRoutesOptions {
  manageProjects: ManageProjects;
}

const objectIdSchema = {
  anyOf: [
    { type: "string", pattern: "^[0-9a-fA-F]{24}$" },
    { type: "null" },
  ],
} as const;

const projectFields = {
  name: { type: "string", minLength: 1, maxLength: 200 },
  summary: { type: "string", minLength: 1, maxLength: 500 },
  description: { type: "string", minLength: 1, maxLength: 100_000 },
  categoryId: objectIdSchema,
  projectStatus: { type: "string", minLength: 1, maxLength: 80 },
  techStack: {
    type: "array",
    maxItems: 30,
    items: { type: "string", minLength: 1, maxLength: 80 },
  },
  highlights: {
    type: "array",
    maxItems: 30,
    items: { type: "string", minLength: 1, maxLength: 500 },
  },
  accent: {
    anyOf: [{ type: "string", maxLength: 80 }, { type: "null" }],
  },
  repositoryUrl: {
    anyOf: [
      { type: "string", format: "uri", pattern: "^https?://", maxLength: 2048 },
      { type: "null" },
    ],
  },
  demoUrl: {
    anyOf: [
      { type: "string", format: "uri", pattern: "^https?://", maxLength: 2048 },
      { type: "null" },
    ],
  },
  featured: { type: "boolean" },
} as const;

const adminProjectSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "slug",
    "name",
    "summary",
    "description",
    "status",
    "publishedAt",
    "categoryId",
    "projectStatus",
    "techStack",
    "highlights",
    "accent",
    "repositoryUrl",
    "demoUrl",
    "featured",
    "createdAt",
    "updatedAt",
    "deletedAt",
  ],
  properties: {
    slug: { type: "string" },
    ...projectFields,
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
    items: { type: "array", items: adminProjectSchema },
    index: { type: "integer" },
    size: { type: "integer" },
  },
} as const;

export async function registerAdminProjectRoutes(
  app: FastifyInstance,
  options: AdminProjectRoutesOptions,
): Promise<void> {
  app.get<{ Querystring: { index?: number; size?: number } }>(
    "/projects",
    {
      schema: {
        response: { 200: pageSchema },
        querystring: {
          type: "object",
          additionalProperties: false,
          properties: {
            index: { type: "integer", minimum: 1, default: 1 },
            size: { type: "integer", minimum: 1, maximum: 100, default: 20 },
          },
        },
      },
    },
    async (request) =>
      serializePage(
        await options.manageProjects.list(
          request.query.index ?? 1,
          request.query.size ?? 20,
        ),
      ),
  );

  app.get<{ Params: { slug: string } }>(
    "/projects/:slug",
    { schema: { params: slugParamsSchema, response: { 200: adminProjectSchema } } },
    async (request, reply) => {
      const project = await options.manageProjects.get(request.params.slug);
      if (!project) return reply.code(404).send(notFound("PROJECT_NOT_FOUND"));
      return serializeProject(project);
    },
  );

  app.post<{ Body: CreateProjectInput }>(
    "/projects",
    {
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          required: ["slug", "name", "summary", "description", "projectStatus", "techStack", "highlights"],
          properties: {
            slug: { type: "string", pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$", maxLength: 160 },
            ...projectFields,
          },
        },
        response: { 201: adminProjectSchema },
      },
    },
    async (request, reply) =>
      reply.code(201).send(
        serializeProject(await options.manageProjects.create(request.body)),
      ),
  );

  app.patch<{ Params: { slug: string }; Body: UpdateProjectInput }>(
    "/projects/:slug",
    {
      schema: {
        params: slugParamsSchema,
        body: { type: "object", additionalProperties: false, minProperties: 1, properties: projectFields },
        response: { 200: adminProjectSchema },
      },
    },
    async (request, reply) => {
      const project = await options.manageProjects.update(
        request.params.slug,
        request.body,
      );
      if (!project) return reply.code(404).send(notFound("PROJECT_NOT_FOUND"));
      return serializeProject(project);
    },
  );

  app.delete<{ Params: { slug: string } }>(
    "/projects/:slug",
    { schema: { params: slugParamsSchema } },
    async (request, reply) => {
      const deleted = await options.manageProjects.delete(request.params.slug);
      if (!deleted) return reply.code(404).send(notFound("PROJECT_NOT_FOUND"));
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

function serializePage(page: Awaited<ReturnType<ManageProjects["list"]>>) {
  return {
    index: page.index,
    size: page.size,
    items: page.items.map(serializeProject),
  };
}

function serializeProject(project: {
  slug: string;
  name: string;
  summary: string;
  description: string;
  status: "draft" | "published" | "deleted";
  publishedAt: Date | null;
  categoryId: string | null;
  projectStatus: string;
  techStack: string[];
  highlights: string[];
  accent: string | null;
  repositoryUrl: string | null;
  demoUrl: string | null;
  featured: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}) {
  return {
    ...project,
    publishedAt: project.publishedAt?.toISOString() ?? null,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    deletedAt: project.deletedAt?.toISOString() ?? null,
  };
}

function notFound(code: string) {
  return { error: { code, message: "Resource not found" } };
}
