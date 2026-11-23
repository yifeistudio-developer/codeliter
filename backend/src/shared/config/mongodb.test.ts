import assert from "node:assert/strict";
import test from "node:test";
import { loadMongoConnectionConfig } from "./mongodb.js";

const baseEnvironment = {
  MONGODB_URI: "mongodb://localhost:27017",
  MONGODB_DB: "codeliter",
};

test("MongoDB credentials are optional for local unauthenticated databases", () => {
  assert.deepEqual(loadMongoConnectionConfig(baseEnvironment), {
    uri: "mongodb://localhost:27017",
    database: "codeliter",
  });
});

test("MongoDB username, password, and authentication source are loaded separately", () => {
  assert.deepEqual(
    loadMongoConnectionConfig({
      ...baseEnvironment,
      MONGODB_USERNAME: "portal",
      MONGODB_PASSWORD: "test+secret/#",
    }),
    {
      uri: "mongodb://localhost:27017",
      database: "codeliter",
      username: "portal",
      password: "test+secret/#",
      authSource: "admin",
    },
  );
});

test("MongoDB credentials require both username and password", () => {
  assert.throws(
    () =>
      loadMongoConnectionConfig({
        ...baseEnvironment,
        MONGODB_USERNAME: "portal",
      }),
    /must be set together/,
  );
});

test("MongoDB URI credentials cannot be combined with separate credentials", () => {
  assert.throws(
    () =>
      loadMongoConnectionConfig({
        ...baseEnvironment,
        MONGODB_URI: "mongodb://user:password@localhost:27017",
        MONGODB_USERNAME: "portal",
        MONGODB_PASSWORD: "test-secret",
      }),
    /Do not include credentials in MONGODB_URI/,
  );
});
