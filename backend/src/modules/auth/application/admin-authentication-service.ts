import type { AdminAuthentication, AdminSession } from "../ports/admin-authentication.js";
import type { AdminCredentialCodec } from "../ports/admin-credential-codec.js";
import type { AdminSessionRepository } from "../ports/admin-session-repository.js";

const SESSION_TTL_MS = 8 * 60 * 60 * 1_000;

export class AdminAuthenticationService implements AdminAuthentication {
  constructor(
    private readonly sessions: AdminSessionRepository,
    private readonly credentialCodec: AdminCredentialCodec,
    private readonly email: string,
    private readonly passwordHash: string,
  ) {}

  async login(email: string, password: string): Promise<AdminSession | null> {
    const passwordMatches = await this.credentialCodec.verifyPassword(
      password,
      this.passwordHash,
    );
    if (email.trim().toLowerCase() !== this.email || !passwordMatches) {
      return null;
    }

    const token = this.credentialCodec.createSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await this.sessions.create(this.credentialCodec.hashSessionToken(token), expiresAt);

    return { token, expiresAt };
  }

  async isAuthenticated(token: string): Promise<boolean> {
    if (!this.credentialCodec.isSessionTokenValid(token)) {
      return false;
    }

    return this.sessions.exists(
      this.credentialCodec.hashSessionToken(token),
      new Date(),
    );
  }

  async logout(token: string): Promise<void> {
    if (this.credentialCodec.isSessionTokenValid(token)) {
      await this.sessions.delete(this.credentialCodec.hashSessionToken(token));
    }
  }
}
