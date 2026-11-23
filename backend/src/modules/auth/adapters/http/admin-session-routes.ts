import type { FastifyInstance } from "fastify";
import type { AdminAuthentication } from "../../ports/admin-authentication.js";

export const ADMIN_SESSION_COOKIE = "codeliter_admin_session";

interface AdminSessionRoutesOptions {
  authentication: AdminAuthentication;
  adminOrigin: string;
  secureCookies: boolean;
}

export async function registerAdminSessionRoutes(
  app: FastifyInstance,
  options: AdminSessionRoutesOptions,
): Promise<void> {
  app.post<{ Body: { email: string; password: string } }>(
    "/api/v1/admin/session",
    {
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          required: ["email", "password"],
          properties: {
            email: { type: "string", minLength: 3, maxLength: 254 },
            password: { type: "string", minLength: 1, maxLength: 1024 },
          },
        },
      },
      config: { rateLimit: { max: 5, timeWindow: "15 minutes" } },
      preHandler: async (request, reply) => {
        if (request.headers.origin !== options.adminOrigin) {
          return reply.code(403).send({
            error: {
              code: "INVALID_ORIGIN",
              message: "Request origin is not allowed",
            },
          });
        }
      },
    },
    async (request, reply) => {
      const session = await options.authentication.login(
        request.body.email,
        request.body.password,
      );

      if (!session) {
        return reply.code(401).send({
          error: { code: "INVALID_CREDENTIALS", message: "Invalid credentials" },
        });
      }

      reply.setCookie(ADMIN_SESSION_COOKIE, session.token, {
        httpOnly: true,
        secure: options.secureCookies,
        sameSite: "strict",
        path: "/",
        expires: session.expiresAt,
      });

      return reply.send({ authenticated: true });
    },
  );

  app.get("/api/v1/admin/session", async (request, reply) => {
    const token = request.cookies[ADMIN_SESSION_COOKIE];
    if (!token || !(await options.authentication.isAuthenticated(token))) {
      return reply.code(401).send({
        error: { code: "UNAUTHENTICATED", message: "Admin session required" },
      });
    }

    return { authenticated: true };
  });

  app.delete(
    "/api/v1/admin/session",
    {
      preHandler: async (request, reply) => {
        if (request.headers.origin !== options.adminOrigin) {
          return reply.code(403).send({
            error: {
              code: "INVALID_ORIGIN",
              message: "Request origin is not allowed",
            },
          });
        }
      },
    },
    async (request, reply) => {
      const token = request.cookies[ADMIN_SESSION_COOKIE];
      if (token) {
        await options.authentication.logout(token);
      }

      reply.clearCookie(ADMIN_SESSION_COOKIE, {
        httpOnly: true,
        secure: options.secureCookies,
        sameSite: "strict",
        path: "/",
      });
      return reply.code(200).send({});
    },
  );
}
