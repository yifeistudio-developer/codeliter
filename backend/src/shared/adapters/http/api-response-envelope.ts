import type { FastifyInstance } from "fastify";

const businessErrorCodes: Record<string, number> = {
  VALIDATION_ERROR: 1025,
  CONFLICT: 1026,
  INTERNAL_SERVER_ERROR: 1027,
  NOT_FOUND: 1028,
  INVALID_ORIGIN: 1029,
  UNAUTHENTICATED: 1030,
  INVALID_CREDENTIALS: 1031,
  NOTE_NOT_FOUND: 1032,
  PROJECT_NOT_FOUND: 1033,
};

export function registerApiResponseEnvelope(app: FastifyInstance): void {
  app.addHook("onSend", (request, reply, payload, done) => {
    if (!request.url.startsWith("/api/")) {
      done(null, payload);
      return;
    }

    const body = Buffer.isBuffer(payload) ? payload.toString("utf8") : payload;
    if (typeof body !== "string" || body.length === 0) {
      done(null, payload);
      return;
    }

    let response: unknown;
    try {
      response = JSON.parse(body);
    } catch (error) {
      done(error instanceof Error ? error : new Error("Invalid API response JSON"));
      return;
    }

    const code = reply.statusCode;
    if (code >= 400) {
      const msg = getErrorMessage(response);
      done(
        null,
        JSON.stringify({
          code: getBusinessErrorCode(response, code),
          ...(msg && { msg }),
          trace_id: request.id,
        }),
      );
      return;
    }

    done(
      null,
      JSON.stringify({
        code,
        data: omitNullProperties(response),
        trace_id: request.id,
      }),
    );
  });
}

function getBusinessErrorCode(response: unknown, statusCode: number): number {
  const identifier = getErrorIdentifier(response);
  const mappedCode = identifier ? businessErrorCodes[identifier] : undefined;
  return typeof mappedCode === "number" ? mappedCode : 1024 + statusCode;
}

function getErrorIdentifier(response: unknown): string | undefined {
  if (!isRecord(response)) return undefined;
  if (typeof response.code === "string") return response.code;
  if (isRecord(response.error) && typeof response.error.code === "string") {
    return response.error.code;
  }
  return undefined;
}

function getErrorMessage(response: unknown): string | undefined {
  if (!isRecord(response)) return undefined;
  if (typeof response.message === "string") return response.message;
  if (isRecord(response.error) && typeof response.error.message === "string") {
    return response.error.message;
  }
  return undefined;
}

function omitNullProperties(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(omitNullProperties);
  }
  if (!isRecord(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, property]) => property !== null)
      .map(([key, property]) => [key, omitNullProperties(property)]),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
