import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { cp, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { syncJournal } from "./sync-obsidian-journal.mjs";

const repository = resolve(fileURLToPath(new URL("..", import.meta.url)));
const temporary = await mkdtemp(join(tmpdir(), "typetiger-journal-sync-"));
const projectRoot = join(temporary, "site");
const sourceDir = join(temporary, "Journal Publish");
await mkdir(join(projectRoot, "content", "journal"), { recursive: true });
await cp(join(repository, "tests", "fixtures", "obsidian-journal"), sourceDir, { recursive: true });
await cp(join(repository, "content", "journal", "categories.json"), join(projectRoot, "content", "journal", "categories.json"));

const preview = await syncJournal({ sourceDir, projectRoot, dryRun: true });
assert.equal(preview.errors.length, 0);
assert.equal(existsSync(join(projectRoot, "content", "journal", "obsidian")), false);
assert.equal(existsSync(join(projectRoot, "public", "journal")), false);

const first = await syncJournal({ sourceDir, projectRoot });
assert.deepEqual(first.added.sort(), ["sync-test-image", "sync-test-plain", "sync-test-special"]);
assert.equal(first.errors.length, 0);
assert.ok(first.skipped.some((message) => message.includes("draft.md")));

const imageArticle = await readFile(join(projectRoot, "content", "journal", "obsidian", "sync-test-image.md"), "utf8");
assert.match(imageArticle, /\/journal\/sync-test-image\/assets\//);
const specialArticle = await readFile(join(projectRoot, "content", "journal", "obsidian", "sync-test-special.md"), "utf8");
assert.match(specialArticle, /\[纯文本文章\]\(\/journal\/sync-test-plain\)/);
assert.match(specialArticle, /> \[!NOTE\]/);
assert.match(specialArticle, /```js/);
assert.match(specialArticle, /\| 项目 \| 状态 \|/);

const second = await syncJournal({ sourceDir, projectRoot });
assert.equal(second.added.length, 0);
assert.equal(second.updated.length, 0);
assert.deepEqual(second.unchanged.sort(), ["sync-test-image", "sync-test-plain", "sync-test-special"]);

const plainPath = join(sourceDir, "plain.md");
const originalPlain = await readFile(plainPath, "utf8");
await writeFile(plainPath, `${originalPlain}\n更新内容。\n`);
const modified = await syncJournal({ sourceDir, projectRoot });
assert.deepEqual(modified.updated, ["sync-test-plain"]);

const publishedPlainPath = join(projectRoot, "content", "journal", "obsidian", "sync-test-plain.md");
const lastPublished = await readFile(publishedPlainPath, "utf8");
await writeFile(plainPath, originalPlain.replace("summary: 用于测试纯文本同步。\n", ""));
const failed = await syncJournal({ sourceDir, projectRoot });
assert.ok(failed.errors.some((message) => message.includes("summary")));
assert.equal(await readFile(publishedPlainPath, "utf8"), lastPublished);

const withdrawn = await syncJournal({ sourceDir, projectRoot, withdraw: ["sync-test-image"] });
assert.deepEqual(withdrawn.withdrawn, ["sync-test-image"]);
assert.match(await readFile(join(projectRoot, "content", "journal", "withdrawn", "sync-test-image.md"), "utf8"), /slug: sync-test-image/);

console.log(JSON.stringify({ status: "passed", first, second, modified, preservedAfterFailure: true, withdrawn: withdrawn.withdrawn }, null, 2));
