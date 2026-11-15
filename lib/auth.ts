import {
  createHmac,
  randomBytes,
  scrypt as nodeScrypt,
  timingSafeEqual,
} from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

const SESSION_COOKIE = "typetiger_admin_session";
const SESSION_LIFETIME_SECONDS = 60 * 60 * 12;
const SCRYPT_KEY_LENGTH = 64;

export type AdminUser = {
  userId: string;
  displayName: string;
  email: string;
  fullName: string | null;
};

type SessionPayload = {
  email: string;
  issuedAt: number;
  expiresAt: number;
};

function adminEmail() {
  return (process.env.ADMIN_EMAIL || process.env.ADMIN_EMAILS?.split(",")[0] || "")
    .trim()
    .toLowerCase();
}

function sessionSecret() {
  const secret = process.env.SESSION_SECRET?.trim();
  if (secret) return secret;
  if (process.env.NODE_ENV !== "production") return "typetiger-local-development-session-secret";
  throw new Error("SESSION_SECRET is required in production");
}

function encode(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function sign(encodedPayload: string) {
  return createHmac("sha256", sessionSecret()).update(encodedPayload).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function derivePassword(password: string, salt: Buffer) {
  return new Promise<Buffer>((resolve, reject) => {
    nodeScrypt(password, salt, SCRYPT_KEY_LENGTH, {
      N: 16384,
      r: 8,
      p: 1,
      maxmem: 64 * 1024 * 1024,
    }, (error, key) => error ? reject(error) : resolve(key));
  });
}

export function createAdminSession(email: string) {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    email: email.trim().toLowerCase(),
    issuedAt: now,
    expiresAt: now + SESSION_LIFETIME_SECONDS,
  };
  const encodedPayload = encode(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

function readSession(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const [encodedPayload, signature, extra] = token.split(".");
  if (!encodedPayload || !signature || extra || !safeEqual(signature, sign(encodedPayload))) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as SessionPayload;
    const now = Math.floor(Date.now() / 1000);
    if (!payload.email || !payload.expiresAt || payload.expiresAt <= now) return null;
    if (payload.email.toLowerCase() !== adminEmail()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function getAdminUser(): Promise<AdminUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = readSession(token);
  if (!session) return null;
  return {
    userId: `admin:${session.email}`,
    displayName: session.email,
    email: session.email,
    fullName: null,
  };
}

export async function requireAdmin(returnTo = "/admin") {
  const user = await getAdminUser();
  if (!user) redirect(`/admin/login?return_to=${encodeURIComponent(safeReturnPath(returnTo))}`);
  return user;
}

export async function assertAdminApi(request?: Request) {
  const user = await getAdminUser();
  if (!user) return null;
  if (request && !["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    const origin = request.headers.get("origin");
    const host = (await headers()).get("host");
    if (origin && (!host || new URL(origin).host !== host)) return null;
  }
  return user;
}

export async function verifyAdminCredentials(email: string, password: string) {
  const expectedEmail = adminEmail();
  const storedHash = process.env.ADMIN_PASSWORD_HASH?.trim();
  if (!expectedEmail || !storedHash || email.trim().toLowerCase() !== expectedEmail) return false;
  return verifyPassword(password, storedHash);
}

export async function verifyPassword(password: string, storedHash: string) {
  const [algorithm, nText, rText, pText, saltText, hashText, extra] = storedHash.split("$");
  if (algorithm !== "scrypt" || extra || !saltText || !hashText) return false;
  const N = Number(nText);
  const r = Number(rText);
  const p = Number(pText);
  if (N !== 16384 || r !== 8 || p !== 1) return false;

  try {
    const expected = Buffer.from(hashText, "base64url");
    if (expected.length !== SCRYPT_KEY_LENGTH) return false;
    const actual = await derivePassword(password, Buffer.from(saltText, "base64url"));
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export async function setAdminSessionCookie(email: string) {
  (await cookies()).set(SESSION_COOKIE, createAdminSession(email), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_LIFETIME_SECONDS,
  });
}

export async function clearAdminSessionCookie() {
  (await cookies()).set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export function safeReturnPath(value: string | null | undefined) {
  if (!value?.startsWith("/") || value.startsWith("//")) return "/admin";
  try {
    const url = new URL(value, "https://typetiger.local");
    if (url.origin !== "https://typetiger.local" || url.pathname.startsWith("/admin/login")) return "/admin";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/admin";
  }
}

export function randomSessionSecret() {
  return randomBytes(48).toString("base64url");
}
