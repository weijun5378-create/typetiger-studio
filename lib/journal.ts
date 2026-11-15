import { isJournalCategory, type JournalCategory } from "./journal-config";
import fs from "node:fs";
import path from "node:path";
import { journalToc, type JournalArticle } from "./journal-shared";
export { formatJournalDate, journalToc } from "./journal-shared";
export type { JournalArticle, TocItem } from "./journal-shared";

export type JournalMeta = {
  title: string;
  slug: string;
  date: string;
  category: JournalCategory;
  summary: string;
  cover?: string;
  featured: boolean;
  draft: boolean;
  tags: string[];
  updated?: string;
  source?: string;
};

function readMarkdownFiles(directory:string):Record<string,string>{const result:Record<string,string>={};for(const entry of fs.readdirSync(directory,{withFileTypes:true})){if(entry.name==="withdrawn")continue;const absolute=path.join(directory,entry.name);if(entry.isDirectory())Object.assign(result,readMarkdownFiles(absolute));else if(entry.name.endsWith(".md"))result[absolute]=fs.readFileSync(absolute,"utf8");}return result;}
const markdownFiles=readMarkdownFiles(path.join(process.cwd(),"content/journal"));

function parseScalar(value: string) {
  const trimmed = value.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed.slice(1, -1).split(",").map((item) => item.trim().replace(/^['"]|['"]$/g, "")).filter(Boolean);
  }
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try { return JSON.parse(trimmed); } catch { return trimmed.slice(1, -1); }
  }
  return trimmed.replace(/^'|'$/g, "");
}

function parseArticle(raw: string, source: string): JournalArticle {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match) throw new Error(`Journal frontmatter missing: ${source}`);
  const values: Record<string, unknown> = {};
  for (const line of match[1].split("\n")) {
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    values[line.slice(0, separator).trim()] = parseScalar(line.slice(separator + 1));
  }
  const required = ["title", "slug", "date", "category", "summary"] as const;
  for (const key of required) if (!values[key]) throw new Error(`Journal ${key} missing: ${source}`);
  const category = String(values.category);
  if (!isJournalCategory(category)) throw new Error(`Unknown journal category "${category}": ${source}`);
  const body = match[2].trim();
  const toc = journalToc(body);
  return {
    title: String(values.title), slug: String(values.slug), date: String(values.date), category,
    summary: String(values.summary), cover: values.cover ? String(values.cover) : undefined,
    featured: values.featured === true, draft: values.draft === true,
    tags: Array.isArray(values.tags) ? values.tags.map(String) : [],
    updated: values.updated ? String(values.updated) : undefined,
    source: values.source ? String(values.source) : undefined,
    body, toc,
  };
}

const allArticles = Object.entries(markdownFiles).map(([source, raw]) => parseArticle(raw, source));

function byPriority(a: JournalArticle, b: JournalArticle) {
  if (a.featured !== b.featured) return a.featured ? -1 : 1;
  return new Date(b.date).getTime() - new Date(a.date).getTime();
}

export function listJournalArticles() {
  return allArticles.filter((article) => !article.draft).sort(byPriority);
}

export function listLegacyJournalArticles() { return listJournalArticles(); }
export function getLegacyJournalArticle(slug: string) { return getJournalArticle(slug); }

export function getJournalArticle(slug: string) {
  return allArticles.find((article) => article.slug === slug && !article.draft) || null;
}

export function getJournalNeighbours(slug: string) {
  const articles = listJournalArticles();
  const index = articles.findIndex((article) => article.slug === slug);
  return {
    previous: index > 0 ? articles[index - 1] : null,
    next: index >= 0 && index < articles.length - 1 ? articles[index + 1] : null,
  };
}
