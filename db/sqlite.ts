import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { defaultCategories, defaultProjects } from "../lib/seed";

export type SqliteDatabase = DatabaseSync;

export function resolveSqlitePath(value = process.env.DATABASE_PATH) {
  return path.resolve(value?.trim() || ".data/typetiger.sqlite");
}

export function openSqliteDatabase(filename = resolveSqlitePath()) {
  mkdirSync(path.dirname(filename), { recursive: true });
  const database = new DatabaseSync(filename);
  database.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");
  return database;
}

export function applySqliteMigrations(database: DatabaseSync, root = process.cwd()) {
  database.exec("CREATE TABLE IF NOT EXISTS app_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)");
  const applied = database.prepare("SELECT 1 FROM app_migrations WHERE name = ?");
  const record = database.prepare("INSERT INTO app_migrations (name, applied_at) VALUES (?, ?)");
  const migrations = ["0000_nasty_war_machine.sql", "0001_funny_slipstream.sql", "0002_journal_cms.sql", "0003_journal_archive.sql", "0004_homepage_hero_settings.sql"];
  for (const name of migrations) {
    if (applied.get(name)) continue;
    const sql = readFileSync(path.join(root, "drizzle", name), "utf8");
    database.exec("BEGIN IMMEDIATE");
    try {
      database.exec(sql);
      record.run(name, new Date().toISOString());
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw new Error(`SQLite migration failed: ${name}`, { cause: error });
    }
  }
}

export function seedSqlite(database: DatabaseSync) {
  const now = new Date().toISOString();
  const categoryIds = new Map<string, string>();
  const insertCategory = database.prepare("INSERT OR IGNORE INTO categories (id,name,sort_order,created_at,updated_at) VALUES (?,?,?,?,?)");
  const insertProject = database.prepare("INSERT OR IGNORE INTO projects (id,slug,title_zh,title_en,category_id,subtitle_zh,subtitle_en,year,background,problem,constraints,judgment,solution,result,role,focus,cover_key,cover_alt,card_width,focal_point,status,sort_order,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
  const insertSettings = database.prepare("INSERT OR IGNORE INTO site_settings (id,site_name,intro,about,contact,social_links,updated_at) VALUES ('main',?,?,?,?,?,?)");
  database.exec("BEGIN IMMEDIATE");
  try {
    defaultCategories.forEach((name, index) => {
      const id = `category-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
      categoryIds.set(name, id);
      insertCategory.run(id, name, index, now, now);
    });
    insertSettings.run("Typetiger Studio", "以品牌策略为起点，为文具、消费品与授权项目建立清晰、鲜活且可延展的视觉系统。", "Typetiger Studio 是一名设计总监的个人作品集与设计思考载体。", "hello@typetiger.cc", "{}", now);
    defaultProjects.forEach((project, index) => insertProject.run(
      `project-${project.slug}`, project.slug, project.titleZh, project.titleEn, categoryIds.get(project.category)!,
      "", project.subtitleEn, "", "", "", "", "", "", "", project.role, project.focus, project.cover,
      project.alt, project.cardWidth, "center", project.status, index, now, now,
    ));
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

export function sqliteHealth(database: DatabaseSync) {
  const counts = database.prepare(`SELECT
    (SELECT COUNT(*) FROM categories) categories,
    (SELECT COUNT(*) FROM projects) projects,
    (SELECT COUNT(*) FROM journal_categories) journalCategories,
    (SELECT COUNT(*) FROM journal_articles) journalArticles,
    (SELECT COUNT(*) FROM journal_versions) journalVersions`).get();
  const pragmas = {
    foreignKeys: database.prepare("PRAGMA foreign_keys").get(),
    journalMode: database.prepare("PRAGMA journal_mode").get(),
    integrity: database.prepare("PRAGMA integrity_check").get(),
  };
  return { counts, pragmas };
}
