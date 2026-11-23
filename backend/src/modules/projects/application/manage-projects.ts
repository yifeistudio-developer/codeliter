import type {
  AdminProject,
  CreateProjectInput,
  UpdateProjectInput,
} from "../domain/admin-project.js";
import type {
  ProjectPage,
  ProjectRepository,
} from "../ports/project-repository.js";

export class ManageProjects {
  constructor(private readonly projects: ProjectRepository) {}

  list(index: number, size: number): Promise<ProjectPage<AdminProject>> {
    return this.projects.findAdminPage(index, size);
  }

  get(slug: string): Promise<AdminProject | null> {
    return this.projects.findAdminBySlug(slug);
  }

  create(input: CreateProjectInput): Promise<AdminProject> {
    return this.projects.create(input);
  }

  update(slug: string, input: UpdateProjectInput): Promise<AdminProject | null> {
    return this.projects.update(slug, input);
  }

  delete(slug: string): Promise<boolean> {
    return this.projects.softDelete(slug);
  }
}
