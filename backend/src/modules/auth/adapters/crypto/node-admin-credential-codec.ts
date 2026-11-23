import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import type { AdminCredentialCodec } from "../../ports/admin-credential-codec.js";

export class NodeAdminCredentialCodec implements AdminCredentialCodec {
  async verifyPassword(password: string, encodedHash: string): Promise<boolean> {
    const [salt, encodedKey, ...extra] = encodedHash.split(":");
    if (
      !salt ||
      !encodedKey ||
      extra.length > 0 ||
      !/^[A-Za-z0-9_-]{22}$/.test(salt) ||
      !/^[A-Za-z0-9_-]{86}$/.test(encodedKey)
    ) {
      return false;
    }

    const expectedKey = Buffer.from(encodedKey, "base64url");
    if (expectedKey.length !== 64) return false;

    const derivedKey = await new Promise<Buffer>((resolve, reject) => {
      scrypt(password, salt, 64, (error, key) => {
        if (error) reject(error);
        else resolve(key);
      });
    });

    return timingSafeEqual(derivedKey, expectedKey);
  }

  createSessionToken(): string {
    return randomBytes(32).toString("base64url");
  }

  hashSessionToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  isSessionTokenValid(token: string): boolean {
    return /^[A-Za-z0-9_-]{43}$/.test(token);
  }
}
