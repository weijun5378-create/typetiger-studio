import { CosBucket, isCosConfigured } from "../lib/cos-bucket";

if (!isCosConfigured()) {
  console.error("COS is not configured. Set COS_SECRET_ID, COS_SECRET_KEY, COS_BUCKET and COS_REGION first.");
  process.exit(1);
}

const bucket = new CosBucket();
const key = `system/connection-test/${crypto.randomUUID()}.txt`;
const content = new TextEncoder().encode("typetiger-cos-connection-test");

try {
  await bucket.put(key, content, {
    httpMetadata: { contentType: "text/plain", cacheControl: "no-store" },
  });
  const object = await bucket.get(key);
  if (!object || Buffer.from(object.body).toString("utf8") !== "typetiger-cos-connection-test") {
    throw new Error("Uploaded test object could not be read back correctly");
  }
  console.log("COS put/get verification: ok");
} finally {
  await bucket.delete(key).catch(() => undefined);
}

console.log("COS test object cleanup: ok");
