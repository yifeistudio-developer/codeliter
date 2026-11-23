import Fastify, { type FastifyServerOptions } from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { CheckReadiness } from "../modules/system/application/check-readiness.js";
import type { ReadinessProbe } from "../modules/system/ports/readiness-probe.js";
import { registerSystemRoutes } from "../modules/system/adapters/http/system-routes.js";
import { GetPublishedNote } from "../modules/notes/application/get-published-note.js";
import { ListPublishedNotes } from "../modules/notes/application/list-published-notes.js";
import type { NoteRepository } from "../modules/notes/ports/note-repository.js";
import { registerNoteRoutes } from "../modules/notes/adapters/http/note-routes.js";
import { GetPublishedProject } from "../modules/projects/application/get-published-project.js";
import { ListPublishedProjects } from "../modules/projects/application/list-published-projects.js";
import type { ProjectRepository } from "../modules/projects/ports/project-repository.js";
import { registerProjectRoutes } from "../modules/projects/adapters/http/project-routes.js";
import { ManageNotes } from "../modules/notes/application/manage-notes.js";
import { registerAdminNoteRoutes } from "../modules/notes/adapters/http/admin-note-routes.js";
import { ManageProjects } from "../modules/projects/application/manage-projects.js";
import { registerAdminProjectRoutes } from "../modules/projects/adapters/http/admin-project-routes.js";
import type { AdminAuthentication } from "../modules/auth/ports/admin-authentication.js";
import { registerAdminSessionRoutes } from "../modules/auth/adapters/http/admin-session-routes.js";
import { ADMIN_SESSION_COOKIE } from "../modules/auth/adapters/http/admin-session-routes.js";
import { ConflictError } from "../shared/domain/errors.js";
import { registerApiResponseEnvelope } from "../shared/adapters/http/api-response-envelope.js";

interface CreateAppOptions {
  noteRepository: NoteRepository;
  projectRepository: ProjectRepository;
  adminAuthentication: AdminAuthentication;
  adminOrigin: string;
  secureCookies: boolean;
  trustProxy?: boolean;
  readinessProbe: ReadinessProbe;
  logger?: FastifyServerOptions["logger"];
}

export function createApp(options: CreateAppOptions) {
  const app = Fastify({
    logger: options.logger ?? true,
    trustProxy: options.trustProxy ?? false,
  });
  app.register(cookie);
  app.register(cors, {
    origin: options.adminOrigin,
    credentials: true,
  });
  app.register(rateLimit, { global: false });
  registerApiResponseEnvelope(app);

  app.setErrorHandler((error, request, reply) => {
    if (
      error instanceof Error &&
      "validation" in error &&
      Array.isArray(error.validation)
    ) {
      return reply.code(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
        },
      });
    }

    if (error instanceof ConflictError) {
      return reply.code(409).send({
        error: { code: "CONFLICT", message: error.message },
      });
    }

    request.log.error(error);
    return reply.code(500).send({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Internal server error",
      },
    });
  });

  app.setNotFoundHandler((_request, reply) => {
    return reply.code(404).send({
      error: { code: "NOT_FOUND", message: "Route not found" },
    });
  });

  app.register(registerSystemRoutes, {
    checkReadiness: new CheckReadiness(options.readinessProbe),
  });
  app.register(registerNoteRoutes, {
    getPublishedNote: new GetPublishedNote(options.noteRepository),
    listPublishedNotes: new ListPublishedNotes(options.noteRepository),
  });
  app.register(registerProjectRoutes, {
    getPublishedProject: new GetPublishedProject(options.projectRepository),
    listPublishedProjects: new ListPublishedProjects(options.projectRepository),
  });
  app.register(registerAdminSessionRoutes, {
    authentication: options.adminAuthentication,
    adminOrigin: options.adminOrigin,
    secureCookies: options.secureCookies,
  });
  app.register(
    async (adminApi) => {
      adminApi.addHook("preHandler", async (request, reply) => {
        if (
          request.method !== "GET" &&
          request.headers.origin !== options.adminOrigin
        ) {
          return reply.code(403).send({
            error: {
              code: "INVALID_ORIGIN",
              message: "Request origin is not allowed",
            },
          });
        }

        const token = request.cookies[ADMIN_SESSION_COOKIE];
        if (
          !token ||
          !(await options.adminAuthentication.isAuthenticated(token))
        ) {
          return reply.code(401).send({
            error: {
              code: "UNAUTHENTICATED",
              message: "Admin session required",
            },
          });
        }
      });

      adminApi.register(registerAdminNoteRoutes, {
        manageNotes: new ManageNotes(options.noteRepository),
      });
      adminApi.register(registerAdminProjectRoutes, {
        manageProjects: new ManageProjects(options.projectRepository),
      });
    },
    { prefix: "/api/v1/admin" },
  );

  return app;
}
