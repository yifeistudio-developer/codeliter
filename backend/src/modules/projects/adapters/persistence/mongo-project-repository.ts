import {
  ObjectId,
  MongoServerError,
  type Collection,
  type Filter,
  type Sort,
} from "mongodb";
import { ConflictError } from "../../../../shared/domain/errors.js";
import type {
  AdminProject,
  CreateProjectInput,
  UpdateProjectInput,
} from "../../domain/admin-project.js";
import type { PublishedProject } from "../../domain/published-project.js";
import type {
  ProjectPage,
  ProjectRepository,
  PublishedProjectPage,
  PublishedProjectQuery,
} from "../../ports/project-repository.js";

interface ProjectDocument {
  _id: ObjectId;
  slug: string;
  name: string;
  summary: string;
  description: string;
  status: "draft" | "published" | "deleted";
  publishedAt: Date | null;
  categoryId?: ObjectId | null;
  projectStatus: string;
  techStack: string[];
  highlights: string[];
  accent?: string | null;
  repositoryUrl?: string | null;
  demoUrl?: string | null;
  featured?: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export class MongoProjectRepository implements ProjectRepository {
  constructor(private readonly projects: Collection<ProjectDocument>) {}

  async findPublishedPage(
    query: PublishedProjectQuery,
  ): Promise<PublishedProjectPage> {
    const filter: Filter<ProjectDocument> = { status: "published" };
    const searchTerm = query.q?.trim();

    if (query.categoryId) {
      filter.categoryId = new ObjectId(query.categoryId);
    }

    if (query.stack) {
      filter.techStack = query.stack;
    }

    if (query.projectStatus) {
      filter.projectStatus = query.projectStatus;
    }

    if (query.featured === true) {
      filter.featured = true;
    } else if (query.featured === false) {
      filter.$or = [{ featured: false }, { featured: { $exists: false } }];
    }

    if (searchTerm) {
      filter.$text = { $search: searchTerm };
    }

    const sort: Sort = searchTerm
      ? { score: { $meta: "textScore" }, publishedAt: -1, _id: -1 }
      : { publishedAt: -1, _id: -1 };
    const [documents, total] = await Promise.all([
      this.projects
        .find(filter)
        .sort(sort)
        .skip((query.index - 1) * query.size)
        .limit(query.size)
        .toArray(),
      this.projects.countDocuments(filter),
    ]);

    return {
      items: documents.map(toPublishedProject),
      index: query.index,
      size: query.size,
      total,
    };
  }

  async findPublishedBySlug(slug: string): Promise<PublishedProject | null> {
    const document = await this.projects.findOne({ slug, status: "published" });
    return document ? toPublishedProject(document) : null;
  }

  async findAdminPage(
    index: number,
    size: number,
  ): Promise<ProjectPage<AdminProject>> {
    const filter: Filter<ProjectDocument> = { status: { $ne: "deleted" } };
    const [documents, total] = await Promise.all([
      this.projects
        .find(filter)
        .sort({ updatedAt: -1, _id: -1 })
        .skip((index - 1) * size)
        .limit(size)
        .toArray(),
      this.projects.countDocuments(filter),
    ]);

    return {
      items: documents.map(toAdminProject),
      index,
      size,
      total,
    };
  }

  async findAdminBySlug(slug: string): Promise<AdminProject | null> {
    const document = await this.projects.findOne({
      slug,
      status: { $ne: "deleted" },
    });
    return document ? toAdminProject(document) : null;
  }

  async create(input: CreateProjectInput): Promise<AdminProject> {
    const now = new Date();
    const document: ProjectDocument = {
      _id: new ObjectId(),
      slug: input.slug,
      name: input.name,
      summary: input.summary,
      description: input.description,
      status: "published",
      publishedAt: now,
      categoryId: input.categoryId ? new ObjectId(input.categoryId) : null,
      projectStatus: input.projectStatus,
      techStack: input.techStack,
      highlights: input.highlights,
      accent: input.accent ?? null,
      repositoryUrl: input.repositoryUrl ?? null,
      demoUrl: input.demoUrl ?? null,
      featured: input.featured ?? false,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    try {
      await this.projects.insertOne(document);
    } catch (error) {
      throwIfSlugConflict(error);
    }

    return toAdminProject(document);
  }

  async update(
    slug: string,
    input: UpdateProjectInput,
  ): Promise<AdminProject | null> {
    const fields: Partial<ProjectDocument> = { updatedAt: new Date() };
    if (input.name !== undefined) fields.name = input.name;
    if (input.summary !== undefined) fields.summary = input.summary;
    if (input.description !== undefined) fields.description = input.description;
    if (input.categoryId !== undefined) {
      fields.categoryId = input.categoryId ? new ObjectId(input.categoryId) : null;
    }
    if (input.projectStatus !== undefined) {
      fields.projectStatus = input.projectStatus;
    }
    if (input.techStack !== undefined) fields.techStack = input.techStack;
    if (input.highlights !== undefined) fields.highlights = input.highlights;
    if (input.accent !== undefined) fields.accent = input.accent;
    if (input.repositoryUrl !== undefined) {
      fields.repositoryUrl = input.repositoryUrl;
    }
    if (input.demoUrl !== undefined) fields.demoUrl = input.demoUrl;
    if (input.featured !== undefined) fields.featured = input.featured;

    const result = await this.projects.updateOne(
      { slug, status: { $ne: "deleted" } },
      { $set: fields },
    );
    if (result.matchedCount === 0) return null;

    return this.findAdminBySlug(slug);
  }

  async softDelete(slug: string): Promise<boolean> {
    const now = new Date();
    const result = await this.projects.updateOne(
      { slug, status: { $ne: "deleted" } },
      { $set: { status: "deleted", deletedAt: now, updatedAt: now } },
    );
    return result.matchedCount > 0;
  }
}

function toPublishedProject(document: ProjectDocument): PublishedProject {
  if (!document.publishedAt) {
    throw new Error(`Published project "${document.slug}" has no publishedAt`);
  }

  return {
    ...toProjectContent(document),
    publishedAt: document.publishedAt,
  };
}

function toAdminProject(document: ProjectDocument): AdminProject {
  return {
    ...toProjectContent(document),
    status: document.status,
    publishedAt: document.publishedAt,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    deletedAt: document.deletedAt,
  };
}

function toProjectContent(
  document: ProjectDocument,
): Omit<PublishedProject, "publishedAt"> {
  return {
    slug: document.slug,
    name: document.name,
    summary: document.summary,
    description: document.description,
    categoryId: document.categoryId?.toHexString() ?? null,
    projectStatus: document.projectStatus,
    techStack: document.techStack,
    highlights: document.highlights,
    accent: document.accent ?? null,
    repositoryUrl: document.repositoryUrl ?? null,
    demoUrl: document.demoUrl ?? null,
    featured: document.featured ?? false,
  };
}

function throwIfSlugConflict(error: unknown): never {
  if (error instanceof MongoServerError && error.code === 11000) {
    throw new ConflictError("Project slug already exists");
  }

  throw error;
}
