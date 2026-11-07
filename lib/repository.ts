import { env } from "cloudflare:workers";
import type { Category, Project, ProjectImage, SiteSettings } from "./types";
import { defaultCategories, defaultProjects } from "./seed";

const db = () => env.DB;
let seeded = false;
export async function ensureSeeded() {
  if (seeded) return;
  const existing = await db().prepare("SELECT COUNT(*) count FROM categories").first<{count:number}>();
  if (!existing?.count) {
    const now = new Date().toISOString(), statements: D1PreparedStatement[] = [], categoryIds = new Map<string,string>();
    defaultCategories.forEach((name,index)=>{const id=`category-${name.toLowerCase().replace(/[^a-z0-9]+/g,"-")}`;categoryIds.set(name,id);statements.push(db().prepare("INSERT OR IGNORE INTO categories (id,name,sort_order,created_at,updated_at) VALUES (?,?,?,?,?)").bind(id,name,index,now,now));});
    statements.push(db().prepare("INSERT OR IGNORE INTO site_settings (id,site_name,intro,about,contact,social_links,updated_at) VALUES ('main',?,?,?,?,?,?)").bind("Typetiger Studio","Designing brand systems, packaging and product stories for global stationery.","Typetiger Studio works across brand identity, packaging, product design and visual systems. The studio turns scattered ideas into coherent product families—connecting positioning, characters, colour, materials and retail presentation.","","{}",now));
    defaultProjects.forEach((p,index)=>statements.push(db().prepare("INSERT OR IGNORE INTO projects (id,slug,title_zh,title_en,category_id,subtitle_zh,subtitle_en,year,background,problem,constraints,judgment,solution,result,role,focus,cover_key,cover_alt,card_width,focal_point,status,sort_order,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(`project-${p.slug}`,p.slug,p.titleZh,p.titleEn,categoryIds.get(p.category),"",p.subtitleEn,"","","","","","","",p.role,p.focus,p.cover,p.alt,p.cardWidth,"center",p.status,index,now,now)));
    await db().batch(statements);
  }
  seeded = true;
}
export async function listCategories(): Promise<Category[]> { await ensureSeeded(); return (await db().prepare("SELECT id,name,sort_order sortOrder,created_at createdAt,updated_at updatedAt FROM categories ORDER BY sort_order,name").all<Category>()).results; }
export async function listProjects(includeAll = false): Promise<Project[]> {
  await ensureSeeded();
  const where = includeAll ? "" : "WHERE p.status='published'";
  return (await db().prepare(`SELECT p.id,p.slug,p.title_zh titleZh,p.title_en titleEn,p.category_id categoryId,c.name categoryName,p.subtitle_zh subtitleZh,p.subtitle_en subtitleEn,p.year,p.background,p.problem,p.constraints,p.judgment,p.solution,p.result,p.role,p.focus,p.cover_key coverKey,p.cover_alt coverAlt,p.card_width cardWidth,p.focal_point focalPoint,p.status,p.sort_order sortOrder,p.created_at createdAt,p.updated_at updatedAt FROM projects p JOIN categories c ON c.id=p.category_id ${where} ORDER BY p.sort_order,p.updated_at DESC`).all<Project>()).results;
}
export async function getProjectBySlug(slug: string, includeAll = false): Promise<Project | null> {
  await ensureSeeded();
  const status = includeAll ? "" : " AND p.status='published'";
  const project = await db().prepare(`SELECT p.id,p.slug,p.title_zh titleZh,p.title_en titleEn,p.category_id categoryId,c.name categoryName,p.subtitle_zh subtitleZh,p.subtitle_en subtitleEn,p.year,p.background,p.problem,p.constraints,p.judgment,p.solution,p.result,p.role,p.focus,p.cover_key coverKey,p.cover_alt coverAlt,p.card_width cardWidth,p.focal_point focalPoint,p.status,p.sort_order sortOrder,p.created_at createdAt,p.updated_at updatedAt FROM projects p JOIN categories c ON c.id=p.category_id WHERE p.slug=?${status}`).bind(slug).first<Project>();
  if (!project) return null;
  project.images = (await db().prepare("SELECT id,project_id projectId,object_key objectKey,alt,focal_point focalPoint,sort_order sortOrder,created_at createdAt FROM project_images WHERE project_id=? ORDER BY sort_order").bind(project.id).all<ProjectImage>()).results;
  return project;
}
export async function getSettings(): Promise<SiteSettings> {
  await ensureSeeded();
  const now = new Date().toISOString();
  await db().batch([
    db().prepare("UPDATE site_settings SET intro=?,updated_at=? WHERE id='main' AND intro=?").bind("以品牌策略为起点，为文具、消费品与授权项目建立清晰、鲜活且可延展的视觉系统。",now,"Designing brand systems, packaging and product stories for global stationery."),
    db().prepare("UPDATE site_settings SET about=?,updated_at=? WHERE id='main' AND about=?").bind("Typetiger Studio 是一间独立设计工作室。我们从品牌定位与产品语境出发，连接视觉识别、包装、角色主题、色彩材料与展示体验，让分散的想法成为一致、可识别并能持续生长的设计系统。",now,"Typetiger Studio works across brand identity, packaging, product design and visual systems. The studio turns scattered ideas into coherent product families—connecting positioning, characters, colour, materials and retail presentation."),
  ]);
  return (await db().prepare("SELECT id,site_name siteName,intro,about,contact,social_links socialLinks,updated_at updatedAt FROM site_settings WHERE id='main'").first<SiteSettings>()) || { id:"main", siteName:"Typetiger Studio", intro:"以品牌策略为起点，为文具、消费品与授权项目建立清晰、鲜活且可延展的视觉系统。", about:"Typetiger Studio 是一间专注品牌与产品表达的独立设计工作室。", contact:"", socialLinks:"{}", updatedAt:"" };
}
