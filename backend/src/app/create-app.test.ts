import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "./create-app.js";
import type {
  NoteRepository,
  PublishedNoteQuery,
} from "../modules/notes/ports/note-repository.js";
import type { PublishedNote } from "../modules/notes/domain/published-note.js";
import type {
  AdminNote,
  CreateNoteInput,
  UpdateNoteInput,
} from "../modules/notes/domain/admin-note.js";
import type {
  ProjectRepository,
  PublishedProjectQuery,
} from "../modules/projects/ports/project-repository.js";
import type { PublishedProject } from "../modules/projects/domain/published-project.js";
import type {
  AdminProject,
  CreateProjectInput,
  UpdateProjectInput,
} from "../modules/projects/domain/admin-project.js";
import type { AdminAuthentication } from "../modules/auth/ports/admin-authentication.js";

function createTestApp(options: {
  readinessProbe?: () => Promise<boolean>;
  onNoteQuery?: (query: PublishedNoteQuery) => void;
  onProjectQuery?: (query: PublishedProjectQuery) => void;
  note?: PublishedNote;
  project?: PublishedProject;
  authenticated?: boolean;
} = {}) {
  const noteRecord = (): AdminNote => ({
    slug: "note",
    title: "Note",
    summary: "A note",
    bodyMarkdown: "Content",
    publishedAt: null,
    categoryId: null,
    tagIds: [],
    featured: false,
    readingTimeMinutes: null,
    status: "draft",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    deletedAt: null,
  });
  const projectRecord = (): AdminProject => ({
    slug: "project",
    name: "Project",
    summary: "A project",
    description: "Details",
    publishedAt: new Date("2026-01-01T00:00:00.000Z"),
    categoryId: null,
    projectStatus: "active",
    techStack: ["TypeScript"],
    highlights: [],
    accent: null,
    repositoryUrl: null,
    demoUrl: null,
    featured: false,
    status: "published",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    deletedAt: null,
  });
  const noteRepository: NoteRepository = {
    async findPublishedPage(query) {
      options.onNoteQuery?.(query);
      return {
        items: [],
        index: query.index,
        size: query.size,
        total: 0,
      };
    },
    async findPublishedBySlug(slug) {
      return options.note?.slug === slug ? options.note : null;
    },
    async findAdminPage(index, size) {
      return { items: [], index, size, total: 0 };
    },
    async findAdminBySlug(slug) {
      return slug === "note" ? noteRecord() : null;
    },
    async create(input: CreateNoteInput) {
      return { ...noteRecord(), ...input, status: "draft" };
    },
    async update(slug: string, input: UpdateNoteInput) {
      return slug === "note" ? { ...noteRecord(), ...input } : null;
    },
    async publish(slug) {
      return slug === "note"
        ? { ...noteRecord(), status: "published", publishedAt: new Date() }
        : null;
    },
    async unpublish(slug) {
      return slug === "note" ? noteRecord() : null;
    },
    async softDelete(slug) {
      return slug === "note";
    },
  };
  const projectRepository: ProjectRepository = {
    async findPublishedPage(query) {
      options.onProjectQuery?.(query);
      return {
        items: [],
        index: query.index,
        size: query.size,
        total: 0,
      };
    },
    async findPublishedBySlug(slug) {
      return options.project?.slug === slug ? options.project : null;
    },
    async findAdminPage(index, size) {
      return { items: [], index, size, total: 0 };
    },
    async findAdminBySlug(slug) {
      return slug === "project" ? projectRecord() : null;
    },
    async create(input: CreateProjectInput) {
      return { ...projectRecord(), ...input, status: "published" };
    },
    async update(slug: string, input: UpdateProjectInput) {
      return slug === "project" ? { ...projectRecord(), ...input } : null;
    },
    async softDelete(slug) {
      return slug === "project";
    },
  };

  const adminAuthentication: AdminAuthentication = {
    async login(email, password) {
      if (email === "admin@example.com" && password === "correct-password") {
        return {
          token: "test-session-token",
          expiresAt: new Date(Date.now() + 60_000),
        };
      }

      return null;
    },
    async isAuthenticated(token) {
      return options.authenticated === true || token === "test-session-token";
    },
    async logout() {},
  };

  return createApp({
    noteRepository,
    projectRepository,
    adminAuthentication,
    adminOrigin: "http://localhost:5173",
    secureCookies: false,
    readinessProbe: { isReady: options.readinessProbe ?? (async () => true) },
    logger: false,
  });
}

test("health endpoints report liveness and readiness", async () => {
  const app = createTestApp();
  const unavailableApp = createTestApp({ readinessProbe: async () => false });
  const failedProbeApp = createTestApp({
    readinessProbe: async () => {
      throw new Error("database unavailable");
    },
  });
  const live = await app.inject("/health/live");
  const ready = await app.inject("/health/ready");
  const unavailable = await unavailableApp.inject("/health/ready");
  const failedProbe = await failedProbeApp.inject("/health/ready");

  assert.equal(live.statusCode, 200);
  assert.deepEqual(live.json(), { status: "ok" });
  assert.equal(ready.statusCode, 200);
  assert.deepEqual(ready.json(), { status: "ok" });
  assert.equal(unavailable.statusCode, 503);
  assert.equal(failedProbe.statusCode, 503);

  await app.close();
  await unavailableApp.close();
  await failedProbeApp.close();
});

test("public note routes validate pagination and return not found for missing notes", async () => {
  const app = createTestApp();
  const notesPage = await app.inject("/api/v1/notes?index=2&size=5");
  const invalidPage = await app.inject("/api/v1/notes?index=0");
  const oldPaginationParams = await app.inject("/api/v1/notes?page=2&pageSize=5");
  const missingNote = await app.inject("/api/v1/notes/missing");
  const pageBody = notesPage.json();

  assert.equal(notesPage.statusCode, 200);
  assert.equal(pageBody.code, 200);
  assert.deepEqual(pageBody.data, { items: [], index: 2, size: 5 });
  assert.equal(typeof pageBody.trace_id, "string");
  assert.equal(invalidPage.statusCode, 400);
  assert.equal(invalidPage.json().code, 1025);
  assert.equal(invalidPage.json().msg, "Request validation failed");
  assert.equal(typeof invalidPage.json().trace_id, "string");
  assert.equal(oldPaginationParams.statusCode, 200);
  assert.deepEqual(oldPaginationParams.json().data, {
    items: [],
    index: 1,
    size: 10,
  });
  assert.equal(missingNote.statusCode, 404);
  assert.equal(missingNote.json().code, 1032);
  assert.equal(missingNote.json().msg, "Note not found");

  await app.close();
});

test("public note filters are validated and passed to the application", async () => {
  let receivedQuery: PublishedNoteQuery | undefined;
  const app = createTestApp({
    onNoteQuery: (query) => {
      receivedQuery = query;
    },
  });
  const categoryId = "507f1f77bcf86cd799439011";
  const tagId = "507f1f77bcf86cd799439012";
  const response = await app.inject(
    `/api/v1/notes?categoryId=${categoryId}&tagId=${tagId}&q=fastify&featured=true`,
  );
  const invalidCategory = await app.inject("/api/v1/notes?categoryId=bad");

  assert.equal(response.statusCode, 200);
  assert.deepEqual(receivedQuery, {
    index: 1,
    size: 10,
    categoryId,
    tagId,
    q: "fastify",
    featured: true,
  });
  assert.equal(invalidCategory.statusCode, 400);

  await app.close();
});

test("public project routes support filters and return not found for missing projects", async () => {
  let receivedQuery: PublishedProjectQuery | undefined;
  const app = createTestApp({
    onProjectQuery: (query) => {
      receivedQuery = query;
    },
  });
  const categoryId = "507f1f77bcf86cd799439011";
  const listing = await app.inject(
    `/api/v1/projects?index=3&size=7&categoryId=${categoryId}&stack=React&projectStatus=active&q=portal&featured=true`,
  );
  const missingProject = await app.inject("/api/v1/projects/missing");

  assert.equal(listing.statusCode, 200);
  assert.deepEqual(receivedQuery, {
    index: 3,
    size: 7,
    categoryId,
    stack: "React",
    projectStatus: "active",
    q: "portal",
    featured: true,
  });
  assert.equal(missingProject.statusCode, 404);
  assert.equal(missingProject.json().code, 1033);
  assert.equal(missingProject.json().msg, "Project not found");

  await app.close();
});

test("published note and project details serialize dates and public fields", async () => {
  const publishedAt = new Date("2026-11-20T08:30:00.000Z");
  const app = createTestApp({
    note: {
      slug: "hexagonal-architecture",
      title: "Hexagonal Architecture",
      summary: "A public note",
      bodyMarkdown: "# Content",
      publishedAt,
      categoryId: null,
      tagIds: [],
      featured: true,
      readingTimeMinutes: 5,
    },
    project: {
      slug: "portal",
      name: "Portal",
      summary: "A public project",
      description: "Project details",
      publishedAt,
      categoryId: null,
      projectStatus: "active",
      techStack: ["TypeScript"],
      highlights: ["Public API"],
      accent: null,
      repositoryUrl: null,
      demoUrl: null,
      featured: false,
    },
  });
  const note = await app.inject("/api/v1/notes/hexagonal-architecture");
  const project = await app.inject("/api/v1/projects/portal");

  assert.equal(note.statusCode, 200);
  assert.equal(note.json().data.publishedAt, publishedAt.toISOString());
  assert.equal(note.json().data.featured, true);
  assert.equal("categoryId" in note.json().data, false);
  assert.equal(project.statusCode, 200);
  assert.equal(project.json().data.publishedAt, publishedAt.toISOString());
  assert.deepEqual(project.json().data.techStack, ["TypeScript"]);
  assert.equal("categoryId" in project.json().data, false);
  assert.equal("accent" in project.json().data, false);

  await app.close();
});

test("admin session is origin-checked, cookie-backed, and required for writes", async () => {
  const app = createTestApp();
  const invalidOrigin = await app.inject({
    method: "POST",
    url: "/api/v1/admin/session",
    headers: { origin: "https://attacker.example" },
    payload: { email: "admin@example.com", password: "correct-password" },
  });
  const login = await app.inject({
    method: "POST",
    url: "/api/v1/admin/session",
    headers: { origin: "http://localhost:5173" },
    payload: { email: "admin@example.com", password: "correct-password" },
  });
  const cookie = login.headers["set-cookie"];
  const session = await app.inject({
    url: "/api/v1/admin/session",
    headers: { cookie },
  });
  const forbiddenWrite = await app.inject({
    method: "POST",
    url: "/api/v1/admin/notes",
    headers: { origin: "http://localhost:5173" },
    payload: {
      slug: "note",
      title: "Note",
      summary: "Summary",
      bodyMarkdown: "Content",
    },
  });

  assert.equal(invalidOrigin.statusCode, 403);
  assert.equal(invalidOrigin.json().code, 1029);
  assert.equal(login.statusCode, 200);
  assert.match(String(cookie), /HttpOnly/i);
  assert.match(String(cookie), /SameSite=Strict/i);
  assert.equal(login.headers["access-control-allow-origin"], "http://localhost:5173");
  assert.equal(login.headers["access-control-allow-credentials"], "true");
  assert.equal(session.statusCode, 200);
  assert.equal(forbiddenWrite.statusCode, 401);

  await app.close();
});

test("admin can create, edit, publish, unpublish, and soft-delete notes", async () => {
  const app = createTestApp();
  const headers = {
    origin: "http://localhost:5173",
    cookie: "codeliter_admin_session=test-session-token",
  };
  const notesPage = await app.inject({
    url: "/api/v1/admin/notes?index=2&size=5",
    headers,
  });
  const created = await app.inject({
    method: "POST",
    url: "/api/v1/admin/notes",
    headers,
    payload: {
      slug: "note",
      title: "Note",
      summary: "Summary",
      bodyMarkdown: "Content",
    },
  });
  const edited = await app.inject({
    method: "PATCH",
    url: "/api/v1/admin/notes/note",
    headers,
    payload: { title: "Edited note" },
  });
  const published = await app.inject({
    method: "POST",
    url: "/api/v1/admin/notes/note/publish",
    headers,
  });
  const unpublished = await app.inject({
    method: "POST",
    url: "/api/v1/admin/notes/note/unpublish",
    headers,
  });
  const deleted = await app.inject({
    method: "DELETE",
    url: "/api/v1/admin/notes/note",
    headers,
  });

  assert.equal(notesPage.statusCode, 200);
  assert.deepEqual(notesPage.json().data, { index: 2, size: 5, items: [] });
  assert.equal(created.statusCode, 201);
  assert.equal(created.json().code, 201);
  assert.equal(created.json().data.status, "draft");
  assert.equal("publishedAt" in created.json().data, false);
  assert.equal(edited.statusCode, 200);
  assert.equal(edited.json().data.title, "Edited note");
  assert.equal(published.json().data.status, "published");
  assert.equal(unpublished.json().data.status, "draft");
  assert.equal(deleted.statusCode, 200);
  assert.deepEqual(deleted.json().data, {});

  await app.close();
});

test("admin can register, edit, and soft-delete projects", async () => {
  const app = createTestApp();
  const headers = {
    origin: "http://localhost:5173",
    cookie: "codeliter_admin_session=test-session-token",
  };
  const projectsPage = await app.inject({
    url: "/api/v1/admin/projects?index=2&size=5",
    headers,
  });
  const created = await app.inject({
    method: "POST",
    url: "/api/v1/admin/projects",
    headers,
    payload: {
      slug: "project",
      name: "Project",
      summary: "Summary",
      description: "Description",
      projectStatus: "active",
      techStack: ["TypeScript"],
      highlights: ["API"],
    },
  });
  const edited = await app.inject({
    method: "PATCH",
    url: "/api/v1/admin/projects/project",
    headers,
    payload: { name: "Updated project" },
  });
  const deleted = await app.inject({
    method: "DELETE",
    url: "/api/v1/admin/projects/project",
    headers,
  });

  assert.equal(projectsPage.statusCode, 200);
  assert.deepEqual(projectsPage.json().data, { index: 2, size: 5, items: [] });
  assert.equal(created.statusCode, 201);
  assert.equal(created.json().data.status, "published");
  assert.equal(edited.statusCode, 200);
  assert.equal(edited.json().data.name, "Updated project");
  assert.equal(deleted.statusCode, 200);
  assert.deepEqual(deleted.json().data, {});

  await app.close();
});
