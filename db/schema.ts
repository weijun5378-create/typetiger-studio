import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(), name: text("name").notNull().unique(),
  sortOrder: integer("sort_order").notNull().default(0), createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
});
export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(), slug: text("slug").notNull().unique(), titleZh: text("title_zh").notNull(), titleEn: text("title_en").notNull(),
  categoryId: text("category_id").notNull().references(() => categories.id), subtitleZh: text("subtitle_zh").notNull().default(""), subtitleEn: text("subtitle_en").notNull().default(""),
  year: text("year").notNull().default(""), background: text("background").notNull().default(""), problem: text("problem").notNull().default(""), constraints: text("constraints").notNull().default(""),
  judgment: text("judgment").notNull().default(""), solution: text("solution").notNull().default(""), result: text("result").notNull().default(""), role: text("role").notNull().default(""), focus: text("focus").notNull().default(""),
  coverKey: text("cover_key").notNull().default(""), coverAlt: text("cover_alt").notNull().default(""), cardWidth: text("card_width", { enum: ["narrow", "medium", "wide"] }).notNull().default("medium"),
  focalPoint: text("focal_point", { enum: ["center", "left", "right", "top", "bottom"] }).notNull().default("center"), status: text("status", { enum: ["draft", "published", "hidden"] }).notNull().default("draft"),
  sortOrder: integer("sort_order").notNull().default(0), createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
}, (table) => [index("idx_projects_status_sort").on(table.status, table.sortOrder)]);
export const projectImages = sqliteTable("project_images", {
  id: text("id").primaryKey(), projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }), objectKey: text("object_key").notNull(), alt: text("alt").notNull().default(""),
  focalPoint: text("focal_point").notNull().default("center"), sortOrder: integer("sort_order").notNull().default(0), createdAt: text("created_at").notNull(),
}, (table) => [index("idx_project_images_project_sort").on(table.projectId, table.sortOrder)]);
export const siteSettings = sqliteTable("site_settings", {
  id: text("id").primaryKey(), siteName: text("site_name").notNull(), intro: text("intro").notNull(), about: text("about").notNull(), contact: text("contact").notNull().default(""), socialLinks: text("social_links").notNull().default("{}"), updatedAt: text("updated_at").notNull(),
});
