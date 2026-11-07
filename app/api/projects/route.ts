import { NextResponse } from "next/server";
import { env } from "cloudflare:workers";
import { assertAdminApi } from "@/lib/auth";
import { listProjects } from "@/lib/repository";

export async function GET() {
  if (!(await assertAdminApi())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await listProjects(true));
}
export async function POST(request: Request) {
  if (!(await assertAdminApi(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = await request.json(); const now = new Date().toISOString(); const id = crypto.randomUUID();
  if (!b.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(b.slug) || !b.titleEn || !b.categoryId) return NextResponse.json({ error: "请填写英文名称、分类和有效 Slug" }, { status: 400 });
  try {
    await env.DB.prepare("INSERT INTO projects (id,slug,title_zh,title_en,category_id,subtitle_zh,subtitle_en,year,background,problem,constraints,judgment,solution,result,role,focus,cover_key,cover_alt,card_width,focal_point,status,sort_order,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(id,b.slug,b.titleZh||b.titleEn,b.titleEn,b.categoryId,b.subtitleZh||"",b.subtitleEn||"",b.year||"",b.background||"",b.problem||"",b.constraints||"",b.judgment||"",b.solution||"",b.result||"",b.role||"",b.focus||"",b.coverKey||"",b.coverAlt||"",b.cardWidth||"medium",b.focalPoint||"center",b.status||"draft",Number(b.sortOrder)||0,now,now).run();
    return NextResponse.json({ id }, { status: 201 });
  } catch { return NextResponse.json({ error: "保存失败，Slug 可能已存在" }, { status: 409 }); }
}
