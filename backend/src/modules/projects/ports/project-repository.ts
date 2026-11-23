import type { PublishedProject } from "../domain/published-project.js";
import type {
  AdminProject,
  CreateProjectInput,
  UpdateProjectInput,
} from "../domain/admin-project.js";

export interface ProjectPage<T> {
  items: T[];
  index: number;
  size: number;
  total: number;
}

export type PublishedProjectPage = ProjectPage<PublishedProject>;

export interface PublishedProjectQuery {
  index: number;
  size: number;
  categoryId?: string;
  stack?: string;
  projectStatus?: string;
  q?: string;
  featured?: boolean;
}

export interface ProjectRepository {
  findPublishedPage(query: PublishedProjectQuery): Promise<PublishedProjectPage>;
  findPublishedBySlug(slug: string): Promise<PublishedProject | null>;
  findAdminPage(
    index: number,
    size: number,
  ): Promise<ProjectPage<AdminProject>>;
  findAdminBySlug(slug: string): Promise<AdminProject | null>;
  create(input: CreateProjectInput): Promise<AdminProject>;
  update(slug: string, input: UpdateProjectInput): Promise<AdminProject | null>;
  softDelete(slug: string): Promise<boolean>;
}
