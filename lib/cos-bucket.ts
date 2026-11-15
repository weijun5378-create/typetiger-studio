import COS from "cos-nodejs-sdk-v5";

type PutOptions = {
  httpMetadata?: { contentType?: string; cacheControl?: string };
  customMetadata?: Record<string, string>;
};

type CosConfiguration = {
  secretId: string;
  secretKey: string;
  bucket: string;
  region: string;
};

function configuration(): CosConfiguration | null {
  const values = {
    secretId: process.env.COS_SECRET_ID?.trim() || "",
    secretKey: process.env.COS_SECRET_KEY?.trim() || "",
    bucket: process.env.COS_BUCKET?.trim() || "",
    region: process.env.COS_REGION?.trim() || "",
  };
  const configured = Object.values(values).filter(Boolean).length;
  if (configured === 0) return null;
  if (configured !== 4) throw new Error("COS configuration is incomplete");
  return values;
}

export function isCosConfigured() {
  return configuration() !== null;
}

export class CosBucket {
  private readonly config: CosConfiguration;
  private readonly client: COS;

  constructor() {
    const config = configuration();
    if (!config) throw new Error("COS is not configured");
    this.config = config;
    this.client = new COS({ SecretId: config.secretId, SecretKey: config.secretKey });
  }

  async put(key: string, value: ArrayBuffer | ArrayBufferView, options: PutOptions = {}) {
    const bytes = value instanceof ArrayBuffer
      ? Buffer.from(value)
      : Buffer.from(value.buffer, value.byteOffset, value.byteLength);
    const metadata = Object.fromEntries(
      Object.entries(options.customMetadata || {}).map(([name, metadataValue]) => [
        `x-cos-meta-${name.toLowerCase().replace(/[^a-z0-9-]/g, "-")}`,
        encodeURIComponent(metadataValue),
      ]),
    );
    const result = await this.client.putObject({
      Bucket: this.config.bucket,
      Region: this.config.region,
      Key: key,
      Body: bytes,
      ContentLength: bytes.byteLength,
      ContentType: options.httpMetadata?.contentType,
      CacheControl: options.httpMetadata?.cacheControl,
      ...metadata,
    });
    const etag = result.ETag?.replaceAll('"', "") || "";
    return { key, etag, httpEtag: result.ETag || `"${etag}"` };
  }

  async get(key: string) {
    try {
      const result = await this.client.getObject({
        Bucket: this.config.bucket,
        Region: this.config.region,
        Key: key,
      });
      const responseHeaders = result.headers || {};
      return {
        body: result.Body,
        httpEtag: result.ETag || String(responseHeaders.etag || ""),
        writeHttpMetadata(headers: Headers) {
          const contentType = responseHeaders["content-type"];
          const cacheControl = responseHeaders["cache-control"];
          if (contentType) headers.set("content-type", String(contentType));
          if (cacheControl) headers.set("cache-control", String(cacheControl));
        },
      };
    } catch (error) {
      const cosError = error as COS.CosSdkError;
      if (cosError?.statusCode === 404 || cosError?.code === "NoSuchKey") return null;
      throw error;
    }
  }

  async delete(key: string) {
    await this.client.deleteObject({
      Bucket: this.config.bucket,
      Region: this.config.region,
      Key: key,
    });
  }
}
