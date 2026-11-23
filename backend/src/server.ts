import { createApp } from "./app/create-app.js";
import { loadConfig } from "./shared/config/env.js";
import { createMongoClient } from "./shared/config/mongodb.js";
import { MongoNoteRepository } from "./modules/notes/adapters/persistence/mongo-note-repository.js";
import { MongoProjectRepository } from "./modules/projects/adapters/persistence/mongo-project-repository.js";
import { MongoAdminSessionRepository } from "./modules/auth/adapters/persistence/mongo-admin-session-repository.js";
import { AdminAuthenticationService } from "./modules/auth/application/admin-authentication-service.js";
import { NodeAdminCredentialCodec } from "./modules/auth/adapters/crypto/node-admin-credential-codec.js";

async function start(): Promise<void> {
  const config = loadConfig();
  const client = createMongoClient(config.mongodb);

  await client.connect();
  const database = client.db(config.mongodb.database);
  const adminAuthentication = new AdminAuthenticationService(
    new MongoAdminSessionRepository(database.collection("adminSessions")),
    new NodeAdminCredentialCodec(),
    config.adminEmail,
    config.adminPasswordHash,
  );
  const app = createApp({
    noteRepository: new MongoNoteRepository(database.collection("notes")),
    projectRepository: new MongoProjectRepository(
      database.collection("projects"),
    ),
    adminAuthentication,
    adminOrigin: config.adminOrigin,
    secureCookies: process.env.NODE_ENV === "production",
    trustProxy: config.trustProxy,
    readinessProbe: {
      async isReady() {
        await database.command({ ping: 1 });
        return true;
      },
    },
  });

  app.addHook("onClose", async () => {
    await client.close();
  });

  try {
    await app.listen({ host: config.host, port: config.port });
    app.log.info(`Server listening on ${config.host}:${config.port}`);
  } catch (error) {
    await app.close();
    throw error;
  }

  const shutdown = async (signal: NodeJS.Signals) => {
    app.log.info({ signal }, "Shutting down");
    await app.close();
  };

  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
}

start().catch((error: unknown) => {
  console.error("Failed to start backend:", error);
  process.exitCode = 1;
});
