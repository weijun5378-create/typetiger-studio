export type ProjectStatus = "draft" | "published" | "hidden";
export type CardWidth = "narrow" | "medium" | "wide";
export type FocalPoint = "center" | "left" | "right" | "top" | "bottom";

export type Project = {
  id: string; slug: string; titleZh: string; titleEn: string; categoryId: string; categoryName?: string;
  subtitleZh: string; subtitleEn: string; year: string; background: string; problem: string; constraints: string;
  judgment: string; solution: string; result: string; role: string; focus: string; coverKey: string; coverAlt: string;
  cardWidth: CardWidth; focalPoint: FocalPoint; status: ProjectStatus; sortOrder: number; createdAt: string; updatedAt: string;
  images?: ProjectImage[];
};
export type ProjectImage = { id: string; projectId: string; objectKey: string; alt: string; focalPoint: FocalPoint; sortOrder: number; createdAt: string };
export type Category = { id: string; name: string; sortOrder: number; createdAt: string; updatedAt: string };
export type SiteSettings = { id: string; siteName: string; intro: string; about: string; contact: string; socialLinks: string; updatedAt: string };

export type JournalStatus = "draft" | "published" | "withdrawn";
export type JournalCategoryRecord = { id: string; name: string; sortOrder: number; createdAt: string; updatedAt: string };
export type JournalRecord = {
  id: string; slug: string; title: string; summary: string; bodyMarkdown: string;
  categoryId: string; categoryName?: string; tags: string[]; coverKey: string; coverAlt: string;
  featured: boolean; status: JournalStatus; publishedAt: string | null; archivedAt?: string | null; createdAt: string; updatedAt: string;
};
export type JournalVersion = { id: string; articleId: string; revision: number; action: string; createdBy: string; createdAt: string; snapshot?: JournalRecord };

export const mediaUrl = (key: string) => key.startsWith("/") ? key : `/media/${key.split("/").map(encodeURIComponent).join("/")}`;
