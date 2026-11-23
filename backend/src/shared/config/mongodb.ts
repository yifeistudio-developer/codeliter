import "./load-env.js";
import { MongoClient, type MongoClientOptions } from "mongodb";

export interface MongoConnectionConfig {
  uri: string;
  database: string;
  username?: string;
  password?: string;
  authSource?: string;
}

export function loadMongoConnectionConfig(
  env: NodeJS.ProcessEnv = process.env,
): MongoConnectionConfig {
  const uri = env.MONGODB_URI?.trim();
  const database = env.MONGODB_DB?.trim();
  const username = env.MONGODB_USERNAME?.trim();
  const password = env.MONGODB_PASSWORD;
  const configuredAuthSource = env.MONGODB_AUTH_SOURCE?.trim();

  if (!uri) {
    throw new Error("MONGODB_URI is required");
  }

  if (!database) {
    throw new Error("MONGODB_DB is required");
  }

  if (Boolean(username) !== Boolean(password)) {
    throw new Error("MONGODB_USERNAME and MONGODB_PASSWORD must be set together");
  }

  if (username && password) {
    const authority = /^mongodb(?:\+srv)?:\/\/([^/?#]+)/i.exec(uri)?.[1];
    if (authority?.includes("@")) {
      throw new Error(
        "Do not include credentials in MONGODB_URI when using MONGODB_USERNAME and MONGODB_PASSWORD",
      );
    }

    return {
      uri,
      database,
      username,
      password,
      authSource: configuredAuthSource || "admin",
    };
  }

  return {
    uri,
    database,
    ...(configuredAuthSource && { authSource: configuredAuthSource }),
  };
}

export function createMongoClient(
  config: MongoConnectionConfig,
): MongoClient {
  const options: MongoClientOptions = { serverSelectionTimeoutMS: 5_000 };

  if (config.username && config.password) {
    options.auth = {
      username: config.username,
      password: config.password,
    };
  }

  if (config.authSource) {
    options.authSource = config.authSource;
  }

  return new MongoClient(config.uri, options);
}
