import { loadMongoConnectionConfig } from "./mongodb.js";

export interface AppConfig {
  host: string;
  port: number;
  mongodb: ReturnType<typeof loadMongoConnectionConfig>;
  adminOrigin: string;
  adminEmail: string;
  adminPasswordHash: string;
  trustProxy: boolean;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const port = Number(env.PORT ?? "3000");

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }

  const mongodb = loadMongoConnectionConfig(env);
  const adminEmail = env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPasswordHash = env.ADMIN_PASSWORD_HASH?.trim();
  const adminOrigin = env.ADMIN_ORIGIN?.trim() || "http://localhost:5173";
  const trustProxyValue = env.TRUST_PROXY?.trim().toLowerCase() || "false";

  if (!adminEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
    throw new Error("ADMIN_EMAIL must be a valid email address");
  }

  if (!adminPasswordHash || !/^[A-Za-z0-9_-]{22}:[A-Za-z0-9_-]{86}$/.test(adminPasswordHash)) {
    throw new Error(
      "ADMIN_PASSWORD_HASH must be a scrypt salt:key pair from npm run admin:hash-password; do not use the plain password",
    );
  }

  if (trustProxyValue !== "true" && trustProxyValue !== "false") {
    throw new Error("TRUST_PROXY must be either true or false");
  }

  const origin = new URL(adminOrigin);
  if (!["http:", "https:"].includes(origin.protocol) || origin.origin !== adminOrigin) {
    throw new Error("ADMIN_ORIGIN must be an HTTP(S) origin without a path");
  }

  return {
    host: env.HOST?.trim() || "127.0.0.1",
    port,
    mongodb,
    adminOrigin,
    adminEmail,
    adminPasswordHash,
    trustProxy: trustProxyValue === "true",
  };
}
