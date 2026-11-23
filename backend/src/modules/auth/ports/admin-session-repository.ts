export interface AdminSessionRepository {
  create(tokenHash: string, expiresAt: Date): Promise<void>;
  exists(tokenHash: string, now: Date): Promise<boolean>;
  delete(tokenHash: string): Promise<void>;
}
