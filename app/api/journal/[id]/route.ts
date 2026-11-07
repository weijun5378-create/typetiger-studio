import { NextResponse } from "next/server";
import { env } from "cloudflare:workers";
import { assertAdminApi } from "@/lib/auth";
import { createJournalVersion, getJournalRecord } from "@/lib/journal-repository";
import { validateJournalInput } from "@/lib/journal-validation";

type Context = { params: Promise<{ id: string }> };
export async function GET(_: Request, { params }: Context) {
  if (!(await assertAdminApi())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const article = await getJournalRecord((await params).id);
  return article ? NextResponse.json(article) : NextResponse.json({ error: "Not found" }, { status: 404 });
}
export async function PATCH(request: Request, { params }: Context) {
  const user = await assertAdminApi(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = (await params).id; const current = await getJournalRecord(id);
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (new URL(request.url).searchParams.get("restore") === "true") {
    await env.DB.prepare("UPDATE journal_articles SET archived_at=NULL,updated_at=? WHERE id=?").bind(new Date().toISOString(),id).run();
    return NextResponse.json({ ok: true });
  }
  const validated = validateJournalInput(await request.json().catch(() => null));
  if (!validated.data) return NextResponse.json({ error: validated.error }, { status: 400 });
  const b = validated.data; const now = new Date().toISOString();
  if (current.publishedAt && b.slug !== current.slug) return NextResponse.json({ error: "文章发布后不能修改 Slug，以免破坏公开 URL" }, { status: 400 });
  const category = await env.DB.prepare("SELECT name FROM journal_categories WHERE id=?").bind(b.categoryId).first<{name:string}>();
  if (!category) return NextResponse.json({ error: "文章分类不存在" }, { status: 400 });
  const publishedAt = b.status === "published" ? (b.publishedAt || current.publishedAt || now) : b.publishedAt;
  const snapshot = JSON.stringify({ ...current,...b,categoryName:category.name,status:"published",publishedAt,updatedAt:now });
  const action = current.status !== b.status ? b.status === "published" ? "publish" : b.status === "withdrawn" ? "withdraw" : "save-draft" : "update";
  try {
    await createJournalVersion(current, action, user.email);
    await env.DB.prepare("UPDATE journal_articles SET slug=?,title=?,summary=?,body_markdown=?,category_id=?,tags_json=?,cover_key=?,cover_alt=?,featured=?,status=?,published_at=?,published_snapshot_json=CASE WHEN ?='published' THEN ? ELSE published_snapshot_json END,updated_at=? WHERE id=?").bind(b.slug,b.title,b.summary,b.bodyMarkdown,b.categoryId,JSON.stringify(b.tags),b.coverKey,b.coverAlt,b.featured?1:0,b.status,publishedAt,b.status,snapshot,now,id).run();
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "更新失败，Slug 可能已存在或分类无效" }, { status: 409 }); }
}
export async function DELETE(request: Request, { params }: Context) {
  const user = await assertAdminApi(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = (await params).id; const current = await getJournalRecord(id);
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const url = new URL(request.url);
  if (url.searchParams.get("permanent") !== "true") {
    await createJournalVersion(current, "archive", user.email);
    await env.DB.prepare("UPDATE journal_articles SET archived_at=?,updated_at=? WHERE id=?").bind(new Date().toISOString(),new Date().toISOString(),id).run();
    return NextResponse.json({ ok: true });
  }
  const confirmation = url.searchParams.get("confirmation");
  if (confirmation !== current.title) return NextResponse.json({ error: "永久删除前请输入完整文章标题" }, { status: 400 });
  await env.DB.prepare("DELETE FROM journal_articles WHERE id=?").bind(id).run();
  return NextResponse.json({ ok: true });
}
