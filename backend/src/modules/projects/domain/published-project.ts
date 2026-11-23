export interface PublishedProject {
  slug: string;
  name: string;
  summary: string;
  description: string;
  publishedAt: Date;
  categoryId: string | null;
  projectStatus: string;
  techStack: string[];
  highlights: string[];
  accent: string | null;
  repositoryUrl: string | null;
  demoUrl: string | null;
  featured: boolean;
}
