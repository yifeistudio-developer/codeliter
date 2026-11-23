import type { FastifyInstance } from "fastify";
import type { GetPublishedProject } from "../../application/get-published-project.js";
import type { ListPublishedProjects } from "../../application/list-published-projects.js";

interface ProjectRoutesOptions {
  getPublishedProject: GetPublishedProject;
  listPublishedProjects: ListPublishedProjects;
}

const projectResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "slug",
    "name",
    "summary",
    "description",
    "publishedAt",
    "categoryId",
    "projectStatus",
    "techStack",
    "highlights",
    "accent",
    "repositoryUrl",
    "demoUrl",
    "featured",
  ],
  properties: {
    slug: { type: "string" },
    name: { type: "string" },
    summary: { type: "string" },
    description: { type: "string" },
    publishedAt: { type: "string", format: "date-time" },
    categoryId: { type: ["string", "null"] },
    projectStatus: { type: "string" },
    techStack: { type: "array", items: { type: "string" } },
    highlights: { type: "array", items: { type: "string" } },
    accent: { type: ["string", "null"] },
    repositoryUrl: { type: ["string", "null"] },
    demoUrl: { type: ["string", "null"] },
    featured: { type: "boolean" },
  },
} as const;

const projectPageResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["items", "index", "size"],
  properties: {
    items: { type: "array", items: projectResponseSchema },
    index: { type: "integer" },
    size: { type: "integer" },
  },
} as const;

export async function registerProjectRoutes(
  app: FastifyInstance,
  options: ProjectRoutesOptions,
): Promise<void> {
  app.get<{
    Querystring: {
      index?: number;
      size?: number;
      categoryId?: string;
      stack?: string;
      projectStatus?: string;
      q?: string;
      featured?: boolean;
    };
  }>(
    "/api/v1/projects",
    {
      schema: {
        response: { 200: projectPageResponseSchema },
        querystring: {
          type: "object",
          additionalProperties: false,
          properties: {
            index: { type: "integer", minimum: 1, default: 1 },
            size: { type: "integer", minimum: 1, maximum: 50, default: 10 },
            categoryId: { type: "string", pattern: "^[0-9a-fA-F]{24}$" },
            stack: { type: "string", minLength: 1, maxLength: 80 },
            projectStatus: { type: "string", minLength: 1, maxLength: 80 },
            q: { type: "string", minLength: 1, maxLength: 120 },
            featured: { type: "boolean" },
          },
        },
      },
    },
    async (request) => {
      const result = await options.listPublishedProjects.execute({
        index: request.query.index ?? 1,
        size: request.query.size ?? 10,
        ...(request.query.categoryId && { categoryId: request.query.categoryId }),
        ...(request.query.stack && { stack: request.query.stack }),
        ...(request.query.projectStatus && {
          projectStatus: request.query.projectStatus,
        }),
        ...(request.query.q && { q: request.query.q }),
        ...(request.query.featured !== undefined && {
          featured: request.query.featured,
        }),
      });

      return {
        index: result.index,
        size: result.size,
        items: result.items.map(serializeProject),
      };
    },
  );

  app.get<{ Params: { slug: string } }>(
    "/api/v1/projects/:slug",
    {
      schema: {
        params: {
          type: "object",
          required: ["slug"],
          properties: { slug: { type: "string", minLength: 1, maxLength: 160 } },
        },
        response: { 200: projectResponseSchema },
      },
    },
    async (request, reply) => {
      const project = await options.getPublishedProject.execute(
        request.params.slug,
      );

      if (!project) {
        return reply.code(404).send({
          error: { code: "PROJECT_NOT_FOUND", message: "Project not found" },
        });
      }

      return serializeProject(project);
    },
  );
}

function serializeProject(project: {
  slug: string;
  name: string;
  summary: string;
  description: string;
  publishedAt: Date;
  categoryId: string | null;
  projectStatus: string;
  techStack: string[];
  highlights: string[];
  accent: string | null;
  repositoryUrl: string | null;
  demoUrl: string | null;
  featured: boolean;
}) {
  return {
    ...project,
    publishedAt: project.publishedAt.toISOString(),
  };
}
