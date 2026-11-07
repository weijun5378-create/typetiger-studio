import { NextResponse } from "next/server";
import { env } from "cloudflare:workers";
import { assertAdminApi } from "@/lib/auth";
import { createJournalVersion, getJournalRecord } from "@/lib/journal-repository";
import type { JournalRecord } from "@/lib/types";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await assertAdminApi(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const articleId = (await params).id; const { revision } = await request.json();
  const current = await getJournalRecord(articleId);
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const version = await env.DB.prepare("SELECT snapshot_json snapshot FROM journal_versions WHERE article_id=? AND revision=?").bind(articleId,Number(revision)).first<{snapshot:string}>();
  if (!version) return NextResponse.json({ error: "历史版本不存在" }, { status: 404 });
  let snapshot: JournalRecord; try { snapshot = JSON.parse(version.snapshot); } catch { return NextResponse.json({ error: "历史版本损坏" }, { status: 500 }); }
  await createJournalVersion(current, "restore", user.email);
  const restoredStatus = current.status === "withdrawn" ? "withdrawn" : "draft";
  await env.DB.prepare("UPDATE journal_articles SET title=?,summary=?,body_markdown=?,category_id=?,tags_json=?,cover_key=?,cover_alt=?,featured=?,status=?,published_at=?,updated_at=? WHERE id=?").bind(snapshot.title,snapshot.summary,snapshot.bodyMarkdown,snapshot.categoryId,JSON.stringify(snapshot.tags),snapshot.coverKey,snapshot.coverAlt,snapshot.featured?1:0,restoredStatus,snapshot.publishedAt,new Date().toISOString(),articleId).run();
  return NextResponse.json({ ok: true });
}
