import { NextResponse } from "next/server";
import { env } from "cloudflare:workers";
import { assertAdminApi } from "@/lib/auth";
import { defaultCategories, defaultProjects } from "@/lib/seed";

export async function POST(request: Request) {
  if (!(await assertAdminApi(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const now = new Date().toISOString();
  const statements: D1PreparedStatement[] = [];
  const categoryIds = new Map<string, string>();
  defaultCategories.forEach((name, index) => {
    const id = `category-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    categoryIds.set(name, id);
    statements.push(env.DB.prepare("INSERT OR IGNORE INTO categories (id,name,sort_order,created_at,updated_at) VALUES (?,?,?,?,?)").bind(id, name, index, now, now));
  });
  statements.push(env.DB.prepare("INSERT OR IGNORE INTO site_settings (id,site_name,intro,about,contact,social_links,updated_at) VALUES ('main',?,?,?,?,?,?)").bind("Typetiger Studio", "Designing brand systems, packaging and product stories for global stationery.", "Typetiger Studio works across brand identity, packaging, product design and visual systems. The studio turns scattered ideas into coherent product families—connecting positioning, characters, colour, materials and retail presentation.", "", "{}", now));
  defaultProjects.forEach((p, index) => statements.push(env.DB.prepare("INSERT OR IGNORE INTO projects (id,slug,title_zh,title_en,category_id,subtitle_zh,subtitle_en,year,background,problem,constraints,judgment,solution,result,role,focus,cover_key,cover_alt,card_width,focal_point,status,sort_order,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(`project-${p.slug}`,p.slug,p.titleZh,p.titleEn,categoryIds.get(p.category),"",p.subtitleEn,"","","","","","","",p.role,p.focus,p.cover,p.alt,p.cardWidth,"center",p.status,index,now,now)));
  await env.DB.batch(statements);
  return NextResponse.json({ ok: true });
}
