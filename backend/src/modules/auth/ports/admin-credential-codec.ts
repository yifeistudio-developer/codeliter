export interface AdminCredentialCodec {
  verifyPassword(password: string, encodedHash: string): Promise<boolean>;
  createSessionToken(): string;
  hashSessionToken(token: string): string;
  isSessionTokenValid(token: string): boolean;
}
