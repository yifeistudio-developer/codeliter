import type {
  ProjectRepository,
  PublishedProjectPage,
  PublishedProjectQuery,
} from "../ports/project-repository.js";

export class ListPublishedProjects {
  constructor(private readonly projects: ProjectRepository) {}

  execute(query: PublishedProjectQuery): Promise<PublishedProjectPage> {
    return this.projects.findPublishedPage(query);
  }
}
