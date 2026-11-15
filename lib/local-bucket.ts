import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

type PutOptions = { httpMetadata?: { contentType?: string; cacheControl?: string }; customMetadata?: Record<string, string> };
type StoredMetadata = PutOptions & { etag: string };

function safePath(key: string) {
  const root = path.resolve(process.env.LOCAL_UPLOAD_PATH || ".data/uploads");
  const target = path.resolve(root, key);
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) throw new Error("Invalid object key");
  return { root, target, metadata: `${target}.metadata.json` };
}

export class LocalBucket {
  async put(key: string, value: ArrayBuffer | ArrayBufferView, options: PutOptions = {}) {
    const { target, metadata } = safePath(key);
    const bytes = value instanceof ArrayBuffer ? new Uint8Array(value) : new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    await mkdir(path.dirname(target), { recursive: true });
    const etag = createHash("sha256").update(bytes).digest("hex");
    await writeFile(target, bytes);
    await writeFile(metadata, JSON.stringify({ ...options, etag } satisfies StoredMetadata));
    return { key, etag, httpEtag: `"${etag}"` };
  }
  async get(key: string) {
    const { target, metadata } = safePath(key);
    try {
      const [bytes, raw] = await Promise.all([readFile(target), readFile(metadata, "utf8")]);
      const saved = JSON.parse(raw) as StoredMetadata;
      return {
        body: bytes,
        httpEtag: `"${saved.etag}"`,
        writeHttpMetadata(headers: Headers) {
          if (saved.httpMetadata?.contentType) headers.set("content-type", saved.httpMetadata.contentType);
          if (saved.httpMetadata?.cacheControl) headers.set("cache-control", saved.httpMetadata.cacheControl);
        },
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }
  async delete(key: string) {
    const { target, metadata } = safePath(key);
    await Promise.all([rm(target, { force: true }), rm(metadata, { force: true })]);
  }
}
