import type { JournalRecord, JournalStatus } from "./types";

const statuses = new Set<JournalStatus>(["draft", "published", "withdrawn"]);
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type JournalInput = Pick<JournalRecord, "slug" | "title" | "summary" | "bodyMarkdown" | "categoryId" | "coverKey" | "coverAlt" | "featured" | "status"> & {
  tags: string[];
  publishedAt?: string | null;
};

export function validateJournalInput(value: unknown): { data?: JournalInput; error?: string } {
  if (!value || typeof value !== "object") return { error: "文章数据无效" };
  const input = value as Record<string, unknown>;
  const slug = String(input.slug || "").trim();
  const title = String(input.title || "").trim();
  const summary = String(input.summary || "").trim();
  const bodyMarkdown = String(input.bodyMarkdown || "");
  const categoryId = String(input.categoryId || "").trim();
  const coverKey = String(input.coverKey || "").trim();
  const coverAlt = String(input.coverAlt || "").trim();
  const status = String(input.status || "draft") as JournalStatus;
  const tags = Array.isArray(input.tags) ? input.tags.map(String).map((tag) => tag.trim()).filter(Boolean) : [];
  if (!title) return { error: "请填写文章标题" };
  if (!slugPattern.test(slug)) return { error: "Slug 只能使用小写字母、数字和连字符" };
  if (!summary) return { error: "请填写文章摘要" };
  if (!categoryId) return { error: "请选择文章分类" };
  if (!statuses.has(status)) return { error: "文章状态无效" };
  if (status === "published" && !bodyMarkdown.trim()) return { error: "发布前请填写正文" };
  if (title.length > 180 || summary.length > 600 || bodyMarkdown.length > 500_000) return { error: "文章内容超过长度限制" };
  if (tags.length > 20 || tags.some((tag) => tag.length > 40)) return { error: "标签数量或长度超过限制" };
  const publishedAt = input.publishedAt ? String(input.publishedAt) : null;
  if (publishedAt && Number.isNaN(Date.parse(publishedAt))) return { error: "发布时间格式不正确" };
  return { data: { slug, title, summary, bodyMarkdown, categoryId, tags: [...new Set(tags)], coverKey, coverAlt, featured: input.featured === true, status, publishedAt } };
}
