import { env } from "../lib/server-env";
import { getSettings, listCategories, listProjects } from "../lib/repository";

const [categories, projects, settings] = await Promise.all([listCategories(), listProjects(true), getSettings()]);
if (categories.length !== 6 || projects.length !== 6) throw new Error("SQLite repository did not return the migrated seed data");

const key = `poc/${crypto.randomUUID()}.webp`;
const bytes = new Uint8Array([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80]);
await env.BUCKET.put(key, bytes, { httpMetadata: { contentType: "image/webp" } });
const object = await env.BUCKET.get(key);
if (!object) throw new Error("Local object storage write/read failed");
const headers = new Headers();
object.writeHttpMetadata(headers);
if (headers.get("content-type") !== "image/webp") throw new Error("Object metadata was not preserved");
await env.BUCKET.delete(key);
if (await env.BUCKET.get(key)) throw new Error("Local object storage delete failed");

console.log(JSON.stringify({ categories: categories.length, projects: projects.length, published: projects.filter((project) => project.status === "published").length, siteName: settings.siteName, localObjectStorage: "ok" }, null, 2));
