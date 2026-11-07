import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, readdir, realpath, rename, stat, writeFile } from "node:fs/promises";
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const defaultProjectRoot = resolve(dirname(scriptPath), "..");
const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".avif"]);

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function within(root, target) {
  const value = relative(root, target);
  return value === "" || (!value.startsWith(`..${sep}`) && value !== ".." && !isAbsolute(value));
}

function parseScalar(value) {
  const input = value.trim();
  if (input === "true") return true;
  if (input === "false") return false;
  if (input.startsWith("[") && input.endsWith("]")) {
    return input.slice(1, -1).split(",").map((item) => item.trim().replace(/^['"]|['"]$/g, "")).filter(Boolean);
  }
  if ((input.startsWith('"') && input.endsWith('"')) || (input.startsWith("'") && input.endsWith("'"))) {
    try { return input.startsWith('"') ? JSON.parse(input) : input.slice(1, -1); } catch { return input.slice(1, -1); }
  }
  return input;
}

export function parseFrontmatter(raw, source) {
  const match = raw.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n([\s\S]*)$/);
  if (!match) throw new Error(`${source}: 缺少 YAML Frontmatter`);
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    if (/^\s/.test(line)) throw new Error(`${source}: V1 暂不支持多行或嵌套 YAML，请改用单行字段`);
    const separator = line.indexOf(":");
    if (separator < 1) throw new Error(`${source}: 无法解析 Frontmatter 行「${line}」`);
    data[line.slice(0, separator).trim()] = parseScalar(line.slice(separator + 1));
  }
  return { data, body: match[2].trim() };
}

async function walkMarkdown(directory) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const target = join(directory, entry.name);
    if (entry.isDirectory()) output.push(...await walkMarkdown(target));
    else if (entry.isFile() && extname(entry.name).toLowerCase() === ".md") output.push(target);
  }
  return output;
}

async function readJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(await readFile(path, "utf8"));
}

async function atomicWrite(path, contents) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  await writeFile(temporary, contents);
  await rename(temporary, path);
}

function validateArticle(data, body, source, categories) {
  const errors = [];
  for (const field of ["title", "slug", "date", "category", "summary"]) {
    if (typeof data[field] !== "string" || !data[field].trim()) errors.push(`缺少必填字段 ${field}`);
  }
  if (data.publish !== true && data.publish !== false) errors.push("publish 必须为 true 或 false");
  if (data.featured !== undefined && typeof data.featured !== "boolean") errors.push("featured 必须为 true 或 false");
  if (data.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug)) errors.push("slug 只能使用小写字母、数字和连字符");
  if (data.date && !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) errors.push("date 必须为 YYYY-MM-DD");
  if (data.updated && !/^\d{4}-\d{2}-\d{2}$/.test(data.updated)) errors.push("updated 必须为 YYYY-MM-DD");
  if (data.category && !categories.includes(data.category)) errors.push(`category 必须是：${categories.join("、")}`);
  if (data.tags !== undefined && !Array.isArray(data.tags)) errors.push("tags 必须使用 [标签一, 标签二] 格式");
  if (data.publish === true && !body.trim()) errors.push("正文不能为空");
  if (errors.length) throw new Error(`${source}: ${errors.join("；")}`);
}

function frontmatterValue(value) {
  return JSON.stringify(String(value));
}

function outputMarkdown(data, body, sourcePath) {
  const fields = [
    `title: ${frontmatterValue(data.title)}`,
    `slug: ${data.slug}`,
    `date: ${data.date}`,
    ...(data.updated ? [`updated: ${data.updated}`] : []),
    `category: ${frontmatterValue(data.category)}`,
    `summary: ${frontmatterValue(data.summary)}`,
    `cover: ${data.cover ? frontmatterValue(data.cover) : ""}`,
    `featured: ${data.featured === true}`,
    "draft: false",
    `tags: [${(data.tags || []).map(frontmatterValue).join(", ")}]`,
    "source: obsidian",
    `sourcePath: ${frontmatterValue(sourcePath)}`,
  ];
  return `---\n${fields.join("\n")}\n---\n\n${body.trim()}\n`;
}

async function localImage(sourceDir, articlePath, rawPath, slug, projectRoot, warnings, copiedAssets, dryRun) {
  const cleaned = rawPath.replace(/^<|>$/g, "").split("#")[0].split("?")[0];
  if (/^(https?:|data:|\/)/i.test(cleaned)) return rawPath;
  const candidate = resolve(dirname(articlePath), decodeURIComponent(cleaned));
  const actual = await realpath(candidate).catch(() => null);
  if (!actual || !within(sourceDir, actual)) throw new Error(`${articlePath}: 图片路径越界或不存在「${rawPath}」`);
  const extension = extname(actual).toLowerCase();
  if (!imageExtensions.has(extension)) throw new Error(`${articlePath}: 不支持的附件类型「${rawPath}」`);
  const safeBase = basename(actual).replace(/[^a-zA-Z0-9._-]+/g, "-");
  const targetName = `${hash(actual).slice(0, 8)}-${safeBase}`;
  const destination = join(projectRoot, "public", "journal", slug, "assets", targetName);
  const sourceHash = hash(await readFile(actual));
  const destinationHash = existsSync(destination) ? hash(await readFile(destination)) : "";
  if (!dryRun && sourceHash !== destinationHash) {
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(actual, destination);
  }
  copiedAssets.push(relative(projectRoot, destination));
  return `/journal/${slug}/assets/${targetName}`;
}

async function transformBody({ body, data, articlePath, sourceDir, projectRoot, linkIndex, warnings, copiedAssets, dryRun }) {
  let transformed = body;
  const embeds = [...transformed.matchAll(/!\[\[([^\]]+)\]\]/g)];
  for (const match of embeds) {
    const [pathPart, altPart] = match[1].split("|");
    if (!imageExtensions.has(extname(pathPart).toLowerCase())) throw new Error(`${articlePath}: V1 不支持非图片嵌入「${match[0]}」`);
    const url = await localImage(sourceDir, articlePath, pathPart, data.slug, projectRoot, warnings, copiedAssets, dryRun);
    transformed = transformed.replace(match[0], `![${altPart || basename(pathPart)}](${url})`);
  }
  const markdownImages = [...transformed.matchAll(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g)];
  for (const match of markdownImages) {
    const url = await localImage(sourceDir, articlePath, match[2], data.slug, projectRoot, warnings, copiedAssets, dryRun);
    transformed = transformed.replace(match[0], `![${match[1]}](${url}${match[3] ? ` "${match[3]}"` : ""})`);
  }
  transformed = transformed.replace(/(?<!!)\[\[([^\]]+)\]\]/g, (full, value) => {
    const [target, label] = value.split("|");
    const key = target.split("#")[0].trim().toLowerCase();
    const article = linkIndex.get(key);
    if (!article) {
      warnings.push(`${articlePath}: 无法解析内部链接「${full}」，已保留可见文字`);
      return label || target;
    }
    const anchor = target.includes("#") ? `#${target.split("#").slice(1).join("#").trim().replace(/\s+/g, "-")}` : "";
    return `[${label || article.title}](/journal/${article.slug}${anchor})`;
  });
  if (/!\[\[/.test(transformed)) throw new Error(`${articlePath}: 仍有未处理的 Obsidian 嵌入语法`);
  if (/\{\{[^}]+\}\}/.test(transformed)) warnings.push(`${articlePath}: 检测到可能不受支持的模板语法，请检查导出结果`);
  return transformed;
}

async function existingManualSlugs(projectRoot) {
  const root = join(projectRoot, "content", "journal");
  if (!existsSync(root)) return new Map();
  const map = new Map();
  for (const file of await walkMarkdown(root)) {
    if (file.includes(`${sep}obsidian${sep}`) || file.includes(`${sep}withdrawn${sep}`)) continue;
    try {
      const { data } = parseFrontmatter(await readFile(file, "utf8"), file);
      if (data.slug) map.set(data.slug, file);
    } catch { /* Existing invalid manual drafts remain a build concern, not a sync input. */ }
  }
  return map;
}

export async function syncJournal({ sourceDir, projectRoot = defaultProjectRoot, withdraw = [], dryRun = false }) {
  if (!isAbsolute(sourceDir)) throw new Error("sourceDir 必须是绝对路径");
  const sourceRoot = await realpath(sourceDir).catch(() => null);
  if (!sourceRoot || !(await stat(sourceRoot)).isDirectory()) throw new Error(`发布目录不存在：${sourceDir}`);
  const categories = await readJson(join(projectRoot, "content", "journal", "categories.json"), []);
  const manifestPath = join(projectRoot, "content", "journal", ".obsidian-sync-manifest.json");
  const manifest = await readJson(manifestPath, { version: 1, articles: {} });
  const report = { added: [], updated: [], unchanged: [], withdrawn: [], skipped: [], warnings: [], errors: [] };

  for (const slug of withdraw) {
    const entry = Object.values(manifest.articles).find((item) => item.slug === slug && item.status !== "withdrawn");
    if (!entry) { report.errors.push(`无法撤稿：manifest 中没有已发布文章 ${slug}`); continue; }
    const source = join(projectRoot, entry.output);
    const destination = join(projectRoot, "content", "journal", "withdrawn", `${slug}.md`);
    if (!dryRun && existsSync(source)) { await mkdir(dirname(destination), { recursive: true }); await rename(source, destination); }
    entry.status = "withdrawn"; entry.withdrawnAt = new Date().toISOString(); entry.withdrawnFile = relative(projectRoot, destination);
    report.withdrawn.push(slug);
  }

  const files = await walkMarkdown(sourceRoot);
  const candidates = [];
  const sourcePaths = new Set();
  for (const file of files) {
    const actual = await realpath(file);
    if (!within(sourceRoot, actual)) { report.errors.push(`${file}: 源文件路径越界`); continue; }
    const sourcePath = relative(sourceRoot, actual);
    sourcePaths.add(sourcePath);
    try {
      const raw = await readFile(actual, "utf8");
      const parsed = parseFrontmatter(raw, sourcePath);
      validateArticle(parsed.data, parsed.body, sourcePath, categories);
      candidates.push({ ...parsed, file: actual, sourcePath });
    } catch (error) { report.errors.push(error.message); }
  }

  const slugOwners = new Map();
  for (const candidate of candidates) {
    if (candidate.data.publish !== true) {
      const old = manifest.articles[candidate.sourcePath];
      report.skipped.push(`${candidate.sourcePath}: publish 不是 true${old ? "；旧版本保持发布，需显式 --withdraw 撤稿" : ""}`);
      continue;
    }
    const owner = slugOwners.get(candidate.data.slug);
    if (owner) report.errors.push(`slug 重复：${candidate.data.slug} 同时用于 ${owner} 与 ${candidate.sourcePath}`);
    else slugOwners.set(candidate.data.slug, candidate.sourcePath);
  }
  const manualSlugs = await existingManualSlugs(projectRoot);
  for (const [slug, sourcePath] of slugOwners) if (manualSlugs.has(slug)) report.errors.push(`${sourcePath}: slug ${slug} 与现有网站文章冲突：${manualSlugs.get(slug)}`);

  const withdrawnSlugs = new Set(Object.values(manifest.articles).filter((entry) => entry.status === "withdrawn").map((entry) => entry.slug));
  const publishable = candidates.filter((item) => {
    if (item.data.publish !== true) return false;
    if (withdrawnSlugs.has(item.data.slug)) {
      report.skipped.push(`${item.sourcePath}: ${item.data.slug} 已处于撤稿状态，不会自动重新发布`);
      return false;
    }
    return !report.errors.some((error) => error.includes(item.sourcePath) || error.includes(`slug 重复：${item.data.slug}`) || error.includes(`slug ${item.data.slug} `));
  });
  const linkIndex = new Map();
  for (const item of publishable) {
    for (const key of [item.data.slug, item.data.title, basename(item.file, extname(item.file))]) linkIndex.set(String(key).toLowerCase(), item.data);
  }

  for (const item of publishable) {
    try {
      const previousBySource = manifest.articles[item.sourcePath];
      if (previousBySource && previousBySource.slug !== item.data.slug) throw new Error(`${item.sourcePath}: slug 已从 ${previousBySource.slug} 改为 ${item.data.slug}；请恢复原 slug，或先显式撤稿再以新文章发布`);
      const previousBySlug = Object.entries(manifest.articles).find(([path, entry]) => path !== item.sourcePath && entry.slug === item.data.slug && entry.status !== "withdrawn");
      if (previousBySlug) {
        delete manifest.articles[previousBySlug[0]];
        report.warnings.push(`${item.sourcePath}: 检测到文件改名，slug 保持不变，已更新来源路径`);
      }
      const copiedAssets = [];
      let cover = item.data.cover ? String(item.data.cover).replace(/^\[\[|\]\]$/g, "") : "";
      if (cover) cover = await localImage(sourceRoot, item.file, cover, item.data.slug, projectRoot, report.warnings, copiedAssets, dryRun);
      const body = await transformBody({ body: item.body, data: item.data, articlePath: item.file, sourceDir: sourceRoot, projectRoot, linkIndex, warnings: report.warnings, copiedAssets, dryRun });
      const normalized = outputMarkdown({ ...item.data, cover }, body, item.sourcePath);
      const output = join("content", "journal", "obsidian", `${item.data.slug}.md`);
      const outputPath = join(projectRoot, output);
      const contentHash = hash(normalized);
      const oldEntry = manifest.articles[item.sourcePath];
      if (oldEntry?.hash === contentHash && existsSync(outputPath)) report.unchanged.push(item.data.slug);
      else {
        if (!dryRun) await atomicWrite(outputPath, normalized);
        (oldEntry ? report.updated : report.added).push(item.data.slug);
      }
      manifest.articles[item.sourcePath] = { slug: item.data.slug, output, hash: contentHash, assets: copiedAssets, updated: item.data.updated || item.data.date, status: "published", syncedAt: new Date().toISOString() };
    } catch (error) { report.errors.push(error.message); }
  }

  for (const [sourcePath, entry] of Object.entries(manifest.articles)) {
    if (entry.status === "published" && !sourcePaths.has(sourcePath)) report.warnings.push(`${sourcePath}: 源文件已删除或移出发布目录；网站版本保持不变，如需撤稿请使用 --withdraw ${entry.slug}`);
  }
  if (!dryRun) await atomicWrite(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return report;
}

function parseArguments(argv) {
  const output = { config: "journal-sync.config.json", withdraw: [], dryRun: false };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--config") output.config = argv[++index];
    else if (argv[index] === "--withdraw") output.withdraw.push(argv[++index]);
    else if (argv[index] === "--dry-run") output.dryRun = true;
    else throw new Error(`未知参数：${argv[index]}`);
  }
  return output;
}

async function main() {
  const args = parseArguments(process.argv.slice(2));
  const configPath = resolve(defaultProjectRoot, args.config);
  if (!existsSync(configPath)) throw new Error(`缺少本地配置：${configPath}\n请复制 journal-sync.config.example.json，并填写 Journal Publish 的绝对路径。`);
  const config = JSON.parse(await readFile(configPath, "utf8"));
  const report = await syncJournal({ sourceDir: config.sourceDir, withdraw: args.withdraw, dryRun: args.dryRun });
  console.log(JSON.stringify(report, null, 2));
  if (report.errors.length) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
