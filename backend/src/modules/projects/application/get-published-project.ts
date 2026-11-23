import type { ProjectRepository } from "../ports/project-repository.js";
import type { PublishedProject } from "../domain/published-project.js";

export class GetPublishedProject {
  constructor(private readonly projects: ProjectRepository) {}

  execute(slug: string): Promise<PublishedProject | null> {
    return this.projects.findPublishedBySlug(slug);
  }
}
