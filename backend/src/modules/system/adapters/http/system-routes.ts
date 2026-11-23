import type { FastifyInstance } from "fastify";
import type { CheckReadiness } from "../../application/check-readiness.js";

interface SystemRoutesOptions {
  checkReadiness: CheckReadiness;
}

export async function registerSystemRoutes(
  app: FastifyInstance,
  options: SystemRoutesOptions,
): Promise<void> {
  app.get("/health/live", async () => ({ status: "ok" }));

  app.get("/health/ready", async (request, reply) => {
    let ready: boolean;

    try {
      ready = await options.checkReadiness.execute();
    } catch (error) {
      request.log.warn({ err: error }, "Readiness probe failed");
      return reply.code(503).send({ status: "unavailable" });
    }

    if (!ready) {
      return reply.code(503).send({ status: "unavailable" });
    }

    return { status: "ok" };
  });
}
