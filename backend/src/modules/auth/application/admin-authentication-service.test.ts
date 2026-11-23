import assert from "node:assert/strict";
import { randomBytes, scrypt } from "node:crypto";
import test from "node:test";
import { AdminAuthenticationService } from "./admin-authentication-service.js";
import { NodeAdminCredentialCodec } from "../adapters/crypto/node-admin-credential-codec.js";
import type { AdminSessionRepository } from "../ports/admin-session-repository.js";

test("admin login creates revocable sessions without persisting the raw token", async () => {
  const salt = randomBytes(16).toString("base64url");
  const passwordHash = await new Promise<Buffer>((resolve, reject) => {
    scrypt("correct horse battery staple", salt, 64, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
  const activeSessions = new Map<string, Date>();
  const repository: AdminSessionRepository = {
    async create(tokenHash, expiresAt) {
      activeSessions.set(tokenHash, expiresAt);
    },
    async exists(tokenHash, now) {
      return (activeSessions.get(tokenHash)?.getTime() ?? 0) > now.getTime();
    },
    async delete(tokenHash) {
      activeSessions.delete(tokenHash);
    },
  };
  const authentication = new AdminAuthenticationService(
    repository,
    new NodeAdminCredentialCodec(),
    "admin@example.com",
    `${salt}:${passwordHash.toString("base64url")}`,
  );

  assert.equal(
    await authentication.login("admin@example.com", "wrong password"),
    null,
  );
  const session = await authentication.login(
    "ADMIN@example.com",
    "correct horse battery staple",
  );

  assert.ok(session);
  assert.equal(await authentication.isAuthenticated(session.token), true);
  await authentication.logout(session.token);
  assert.equal(await authentication.isAuthenticated(session.token), false);
});
