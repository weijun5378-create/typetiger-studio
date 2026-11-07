import { NextResponse } from "next/server";
import { env } from "cloudflare:workers";
import { assertAdminApi } from "@/lib/auth";

const fields: Record<string,string> = { slug:"slug",titleZh:"title_zh",titleEn:"title_en",categoryId:"category_id",subtitleZh:"subtitle_zh",subtitleEn:"subtitle_en",year:"year",background:"background",problem:"problem",constraints:"constraints",judgment:"judgment",solution:"solution",result:"result",role:"role",focus:"focus",coverKey:"cover_key",coverAlt:"cover_alt",cardWidth:"card_width",focalPoint:"focal_point",status:"status",sortOrder:"sort_order" };
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){if(!(await assertAdminApi()))return NextResponse.json({error:"Unauthorized"},{status:401});const {id}=await params;const p=await env.DB.prepare("SELECT p.id,p.slug,p.title_zh titleZh,p.title_en titleEn,p.category_id categoryId,c.name categoryName,p.subtitle_zh subtitleZh,p.subtitle_en subtitleEn,p.year,p.background,p.problem,p.constraints,p.judgment,p.solution,p.result,p.role,p.focus,p.cover_key coverKey,p.cover_alt coverAlt,p.card_width cardWidth,p.focal_point focalPoint,p.status,p.sort_order sortOrder,p.created_at createdAt,p.updated_at updatedAt FROM projects p JOIN categories c ON c.id=p.category_id WHERE p.id=?").bind(id).first<Record<string,unknown>>();if(!p)return NextResponse.json({error:"Not found"},{status:404});p.images=(await env.DB.prepare("SELECT id,project_id projectId,object_key objectKey,alt,focal_point focalPoint,sort_order sortOrder,created_at createdAt FROM project_images WHERE project_id=? ORDER BY sort_order").bind(id).all()).results;return NextResponse.json(p);}
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await assertAdminApi(request))) return NextResponse.json({ error:"Unauthorized" }, { status:401 });
  const { id } = await params; const b = await request.json();
  if (b.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(b.slug)) return NextResponse.json({ error:"Slug 格式不正确" }, { status:400 });
  const pairs = Object.keys(fields).filter((k) => k in b); if (!pairs.length) return NextResponse.json({ ok:true });
  const values = pairs.map((k) => b[k]); values.push(new Date().toISOString(), id);
  try { await env.DB.prepare(`UPDATE projects SET ${pairs.map((k)=>`${fields[k]}=?`).join(",")},updated_at=? WHERE id=?`).bind(...values).run(); return NextResponse.json({ ok:true }); }
  catch { return NextResponse.json({ error:"更新失败，请检查 Slug 是否重复" }, { status:409 }); }
}
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await assertAdminApi(request))) return NextResponse.json({ error:"Unauthorized" }, { status:401 });
  const { id } = await params; const removeFiles = new URL(request.url).searchParams.get("deleteImages") === "true";
  const keys = (await env.DB.prepare("SELECT object_key objectKey FROM project_images WHERE project_id=? UNION SELECT cover_key objectKey FROM projects WHERE id=?").bind(id,id).all<{objectKey:string}>()).results;
  if (removeFiles) await Promise.all(keys.filter((x)=>x.objectKey && !x.objectKey.startsWith("/")).map((x)=>env.BUCKET.delete(x.objectKey)));
  await env.DB.batch([env.DB.prepare("DELETE FROM project_images WHERE project_id=?").bind(id),env.DB.prepare("DELETE FROM projects WHERE id=?").bind(id)]);
  return NextResponse.json({ ok:true });
}
