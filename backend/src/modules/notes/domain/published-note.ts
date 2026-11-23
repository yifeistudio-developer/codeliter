export interface PublishedNote {
  slug: string;
  title: string;
  summary: string;
  bodyMarkdown: string;
  publishedAt: Date;
  categoryId: string | null;
  tagIds: string[];
  featured: boolean;
  readingTimeMinutes: number | null;
}
