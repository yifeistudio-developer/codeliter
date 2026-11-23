import { ObjectId, type Collection } from "mongodb";
import type { AdminSessionRepository } from "../../ports/admin-session-repository.js";

interface AdminSessionDocument {
  _id: ObjectId;
  tokenHash: string;
  expiresAt: Date;
}

export class MongoAdminSessionRepository implements AdminSessionRepository {
  constructor(private readonly sessions: Collection<AdminSessionDocument>) {}

  async create(tokenHash: string, expiresAt: Date): Promise<void> {
    await this.sessions.insertOne({
      _id: new ObjectId(),
      tokenHash,
      expiresAt,
    });
  }

  async exists(tokenHash: string, now: Date): Promise<boolean> {
    return Boolean(
      await this.sessions.findOne({ tokenHash, expiresAt: { $gt: now } }),
    );
  }

  async delete(tokenHash: string): Promise<void> {
    await this.sessions.deleteOne({ tokenHash });
  }
}
