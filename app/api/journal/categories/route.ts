import { NextResponse } from "next/server";
import { assertAdminApi } from "@/lib/auth";
import { env } from "cloudflare:workers";
import { listJournalCategoriesDb } from "@/lib/journal-repository";

export async function GET() {
  if (!(await assertAdminApi())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await listJournalCategoriesDb());
}
export async function POST(request: Request) {
  if (!(await assertAdminApi(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as {name?:string;sortOrder?:number}|null;
  const name = body?.name?.trim();
  if (!name) return NextResponse.json({ error: "分类名称不能为空" }, { status: 400 });
  const id=crypto.randomUUID(),now=new Date().toISOString();
  try { await env.DB.prepare("INSERT INTO journal_categories (id,name,sort_order,created_at,updated_at) VALUES (?,?,?,?,?)").bind(id,name,Number(body?.sortOrder)||0,now,now).run(); return NextResponse.json({id},{status:201}); }
  catch { return NextResponse.json({ error: "分类名称已存在" }, { status: 409 }); }
}
export async function PATCH(request: Request) {
  if (!(await assertAdminApi(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as {id?:string;name?:string;sortOrder?:number}|null;
  if (!body?.id || !body.name?.trim()) return NextResponse.json({ error: "分类信息不完整" }, { status: 400 });
  try { await env.DB.prepare("UPDATE journal_categories SET name=?,sort_order=?,updated_at=? WHERE id=?").bind(body.name.trim(),Number(body.sortOrder)||0,new Date().toISOString(),body.id).run(); return NextResponse.json({ok:true}); }
  catch { return NextResponse.json({ error: "分类名称已存在" }, { status: 409 }); }
}
export async function DELETE(request: Request) {
  if (!(await assertAdminApi(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id=new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "缺少分类" }, { status: 400 });
  const used=await env.DB.prepare("SELECT COUNT(*) count FROM journal_articles WHERE category_id=?").bind(id).first<{count:number}>();
  if (used?.count) return NextResponse.json({ error: `该分类仍有 ${used.count} 篇文章，不能删除` }, { status: 409 });
  await env.DB.prepare("DELETE FROM journal_categories WHERE id=?").bind(id).run();
  return NextResponse.json({ok:true});
}
