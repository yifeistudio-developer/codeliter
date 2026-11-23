import { createMongoClient, loadMongoConnectionConfig } from "../../src/shared/config/mongodb.js";

const config = loadMongoConnectionConfig();
const client = createMongoClient(config);

try {
  await client.connect();
  const database = client.db(config.database);
  const notes = database.collection("notes");
  const projects = database.collection("projects");
  const now = new Date();

  await notes.updateMany(
    { createdAt: { $exists: false } },
    { $set: { createdAt: now, updatedAt: now, deletedAt: null } },
  );
  await projects.updateMany(
    { createdAt: { $exists: false } },
    { $set: { createdAt: now, updatedAt: now, deletedAt: null } },
  );

  await notes.createIndex({ slug: 1 }, { unique: true, name: "uq_notes_slug" });
  await notes.createIndex(
    { status: 1, publishedAt: -1, _id: -1 },
    { name: "ix_notes_publication" },
  );
  await notes.createIndex(
    { status: 1, categoryId: 1, publishedAt: -1, _id: -1 },
    { name: "ix_notes_category_publication" },
  );
  await notes.createIndex(
    { status: 1, tagIds: 1, publishedAt: -1, _id: -1 },
    { name: "ix_notes_tag_publication" },
  );
  await notes.createIndex(
    { status: 1, featured: 1, publishedAt: -1, _id: -1 },
    { name: "ix_notes_featured_publication" },
  );
  await notes.createIndex(
    { title: "text", summary: "text", bodyMarkdown: "text" },
    { name: "text_notes_content" },
  );

  await projects.createIndex(
    { slug: 1 },
    { unique: true, name: "uq_projects_slug" },
  );
  await projects.createIndex(
    { status: 1, publishedAt: -1, _id: -1 },
    { name: "ix_projects_publication" },
  );
  await projects.createIndex(
    { status: 1, categoryId: 1, publishedAt: -1, _id: -1 },
    { name: "ix_projects_category_publication" },
  );
  await projects.createIndex(
    { status: 1, techStack: 1, publishedAt: -1, _id: -1 },
    { name: "ix_projects_stack_publication" },
  );
  await projects.createIndex(
    { status: 1, projectStatus: 1, publishedAt: -1, _id: -1 },
    { name: "ix_projects_status_publication" },
  );
  await projects.createIndex(
    { status: 1, featured: 1, publishedAt: -1, _id: -1 },
    { name: "ix_projects_featured_publication" },
  );
  await projects.createIndex(
    { name: "text", summary: "text", description: "text" },
    { name: "text_projects_content" },
  );

  const adminSessions = database.collection("adminSessions");
  await adminSessions.createIndex(
    { tokenHash: 1 },
    { unique: true, name: "uq_admin_sessions_token_hash" },
  );
  await adminSessions.createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0, name: "ttl_admin_sessions_expiry" },
  );

  console.info("Content indexes are up to date");
} finally {
  await client.close();
}
