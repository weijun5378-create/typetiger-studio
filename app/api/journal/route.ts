import { NextResponse } from "next/server";
import { env } from "cloudflare:workers";
import { assertAdminApi } from "@/lib/auth";
import { listJournalRecords } from "@/lib/journal-repository";
import { validateJournalInput } from "@/lib/journal-validation";

export async function GET() {
  if (!(await assertAdminApi())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await listJournalRecords());
}
export async function POST(request: Request) {
  const user = await assertAdminApi(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const validated = validateJournalInput(await request.json().catch(() => null));
  if (!validated.data) return NextResponse.json({ error: validated.error }, { status: 400 });
  const b = validated.data; const id = crypto.randomUUID(); const now = new Date().toISOString();
  const category = await env.DB.prepare("SELECT name FROM journal_categories WHERE id=?").bind(b.categoryId).first<{name:string}>();
  if (!category) return NextResponse.json({ error: "文章分类不存在" }, { status: 400 });
  const publishedAt = b.status === "published" ? (b.publishedAt || now) : b.publishedAt;
  const snapshot = b.status === "published" ? JSON.stringify({ id,slug:b.slug,title:b.title,summary:b.summary,bodyMarkdown:b.bodyMarkdown,categoryId:b.categoryId,categoryName:category.name,tags:b.tags,coverKey:b.coverKey,coverAlt:b.coverAlt,featured:b.featured,status:"published",publishedAt,createdAt:now,updatedAt:now }) : null;
  try {
    await env.DB.prepare("INSERT INTO journal_articles (id,slug,title,summary,body_markdown,category_id,tags_json,cover_key,cover_alt,featured,status,published_at,published_snapshot_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(id,b.slug,b.title,b.summary,b.bodyMarkdown,b.categoryId,JSON.stringify(b.tags),b.coverKey,b.coverAlt,b.featured?1:0,b.status,publishedAt,snapshot,now,now).run();
    return NextResponse.json({ id }, { status: 201 });
  } catch { return NextResponse.json({ error: "保存失败，Slug 可能已存在或分类无效" }, { status: 409 }); }
}
