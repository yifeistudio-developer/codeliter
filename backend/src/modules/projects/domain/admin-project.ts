import type { PublishedProject } from "./published-project.js";

export interface AdminProject extends Omit<PublishedProject, "publishedAt"> {
  publishedAt: Date | null;
  status: "draft" | "published" | "deleted";
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CreateProjectInput {
  slug: string;
  name: string;
  summary: string;
  description: string;
  categoryId?: string | null;
  projectStatus: string;
  techStack: string[];
  highlights: string[];
  accent?: string | null;
  repositoryUrl?: string | null;
  demoUrl?: string | null;
  featured?: boolean;
}

export type UpdateProjectInput = Partial<Omit<CreateProjectInput, "slug">>;
