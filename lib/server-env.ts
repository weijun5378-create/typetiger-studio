import { getSqliteD1Database } from "@/db/d1-sqlite";
import { CosBucket, isCosConfigured } from "./cos-bucket";
import { LocalBucket } from "./local-bucket";

let bucket: LocalBucket | CosBucket | undefined;

function getBucket() {
  if (!bucket) bucket = isCosConfigured() ? new CosBucket() : new LocalBucket();
  return bucket;
}

// Compatibility facade used during the server migration. It lets the existing
// D1/R2 call sites run on Node.js while their storage implementations change.
export const env = {
  get DB() { return getSqliteD1Database() as unknown as D1Database; },
  get BUCKET() { return getBucket() as unknown as R2Bucket; },
};
