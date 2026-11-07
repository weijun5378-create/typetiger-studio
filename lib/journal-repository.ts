import { env } from "cloudflare:workers";
import { getLegacyJournalArticle, journalToc, listLegacyJournalArticles, type JournalArticle } from "./journal";
import type { JournalCategoryRecord, JournalRecord, JournalVersion } from "./types";
import { mediaUrl } from "./types";

const articleSelect = `SELECT a.id,a.slug,a.title,a.summary,a.body_markdown bodyMarkdown,a.category_id categoryId,c.name categoryName,a.tags_json tagsJson,a.cover_key coverKey,a.cover_alt coverAlt,a.featured,a.status,a.published_at publishedAt,a.published_snapshot_json publishedSnapshotJson,a.archived_at archivedAt,a.created_at createdAt,a.updated_at updatedAt FROM journal_articles a JOIN journal_categories c ON c.id=a.category_id`;

type ArticleRow = Omit<JournalRecord, "tags" | "featured"> & { tagsJson: string; featured: number; publishedSnapshotJson: string | null };
function rowToRecord(row: ArticleRow): JournalRecord {
  let tags: string[] = [];
  try { const value = JSON.parse(row.tagsJson || "[]"); if (Array.isArray(value)) tags = value.map(String); } catch {}
  return {
    id:row.id,slug:row.slug,title:row.title,summary:row.summary,bodyMarkdown:row.bodyMarkdown,
    categoryId:row.categoryId,categoryName:row.categoryName,tags,coverKey:row.coverKey,coverAlt:row.coverAlt,
    featured:Boolean(row.featured),status:row.status,publishedAt:row.publishedAt,archivedAt:row.archivedAt,createdAt:row.createdAt,updatedAt:row.updatedAt,
  };
}
function rowPublicRecord(row: ArticleRow): JournalRecord | null {
  if (row.archivedAt) return null;
  if (row.status === "withdrawn") return null;
  if (row.status === "published") return rowToRecord(row);
  if (!row.publishedSnapshotJson) return null;
  try { const snapshot=JSON.parse(row.publishedSnapshotJson) as JournalRecord; return { ...snapshot, categoryName:snapshot.categoryName||row.categoryName }; } catch { return null; }
}
function recordToArticle(record: JournalRecord): JournalArticle {
  return {
    title: record.title, slug: record.slug, date: (record.publishedAt || record.updatedAt).slice(0, 10),
    category: record.categoryName as JournalArticle["category"], summary: record.summary,
    cover: record.coverKey ? mediaUrl(record.coverKey) : undefined, featured: record.featured,
    draft: record.status !== "published", tags: record.tags, updated: record.updatedAt.slice(0, 10),
    source: "d1", body: record.bodyMarkdown, toc: journalToc(record.bodyMarkdown),
  };
}

export async function listJournalCategoriesDb(): Promise<JournalCategoryRecord[]> {
  return (await env.DB.prepare("SELECT id,name,sort_order sortOrder,created_at createdAt,updated_at updatedAt FROM journal_categories ORDER BY sort_order,name").all<JournalCategoryRecord>()).results;
}
export async function listJournalRecords(): Promise<JournalRecord[]> {
  const rows = (await env.DB.prepare(`${articleSelect} ORDER BY a.updated_at DESC`).all<ArticleRow>()).results;
  return rows.map(rowToRecord);
}
export async function getJournalRecord(id: string): Promise<JournalRecord | null> {
  const row = await env.DB.prepare(`${articleSelect} WHERE a.id=?`).bind(id).first<ArticleRow>();
  return row ? rowToRecord(row) : null;
}
export async function getJournalRecordBySlug(slug: string, includeUnpublished = false): Promise<JournalRecord | null> {
  const status = includeUnpublished ? "" : " AND a.status='published'";
  const row = await env.DB.prepare(`${articleSelect} WHERE a.slug=?${status}`).bind(slug).first<ArticleRow>();
  return row ? rowToRecord(row) : null;
}
export async function listPublicJournalArticles(): Promise<JournalArticle[]> {
  const rows = (await env.DB.prepare(`${articleSelect} ORDER BY a.featured DESC,a.published_at DESC,a.updated_at DESC`).all<ArticleRow>()).results;
  const databaseSlugs = new Set(rows.map((row) => row.slug));
  return [...rows.map(rowPublicRecord).filter((row):row is JournalRecord=>Boolean(row)).map(recordToArticle), ...listLegacyJournalArticles().filter((article) => !databaseSlugs.has(article.slug))]
    .sort((a,b) => a.featured !== b.featured ? (a.featured ? -1 : 1) : new Date(b.date).getTime() - new Date(a.date).getTime());
}
export async function getPublicJournalArticle(slug: string): Promise<JournalArticle | null> {
  const row = await env.DB.prepare(`${articleSelect} WHERE a.slug=?`).bind(slug).first<ArticleRow>();
  if (row) { const record = rowPublicRecord(row); return record ? recordToArticle(record) : null; }
  return getLegacyJournalArticle(slug);
}
export async function getPreviewJournalArticle(slug: string): Promise<JournalArticle | null> {
  const record = await getJournalRecordBySlug(slug, true);
  return record ? recordToArticle(record) : getLegacyJournalArticle(slug);
}
export async function getPublicJournalNeighbours(slug: string) {
  const articles = await listPublicJournalArticles();
  const index = articles.findIndex((article) => article.slug === slug);
  return { previous: index > 0 ? articles[index - 1] : null, next: index >= 0 && index < articles.length - 1 ? articles[index + 1] : null };
}
export async function listJournalVersions(articleId: string): Promise<JournalVersion[]> {
  const rows = (await env.DB.prepare("SELECT id,article_id articleId,revision,action,created_by createdBy,created_at createdAt,snapshot_json snapshotJson FROM journal_versions WHERE article_id=? ORDER BY revision DESC").bind(articleId).all<JournalVersion & {snapshotJson:string}>()).results;
  return rows.map(({ snapshotJson, ...version }) => {
    try { return { ...version, snapshot: JSON.parse(snapshotJson) as JournalRecord }; }
    catch { return version; }
  });
}
export async function createJournalVersion(article: JournalRecord, action: string, email: string) {
  const next = await env.DB.prepare("SELECT COALESCE(MAX(revision),0)+1 revision FROM journal_versions WHERE article_id=?").bind(article.id).first<{revision:number}>();
  await env.DB.prepare("INSERT INTO journal_versions (id,article_id,revision,snapshot_json,action,created_by,created_at) VALUES (?,?,?,?,?,?,?)").bind(crypto.randomUUID(),article.id,next?.revision || 1,JSON.stringify(article),action,email,new Date().toISOString()).run();
}
