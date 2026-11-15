type LoginAttempt = { failures: number; resetAt: number; blockedUntil: number };

const attempts = new Map<string, LoginAttempt>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;

export function loginClientKey(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")?.trim()
    || "local";
}

export function isLoginBlocked(key: string) {
  const entry = attempts.get(key);
  if (!entry) return false;
  const now = Date.now();
  if (entry.resetAt <= now) {
    attempts.delete(key);
    return false;
  }
  return entry.blockedUntil > now;
}

export function recordLoginFailure(key: string) {
  const now = Date.now();
  const current = attempts.get(key);
  const entry = !current || current.resetAt <= now
    ? { failures: 0, resetAt: now + WINDOW_MS, blockedUntil: 0 }
    : current;
  entry.failures += 1;
  if (entry.failures >= MAX_FAILURES) entry.blockedUntil = entry.resetAt;
  attempts.set(key, entry);
}

export function clearLoginFailures(key: string) {
  attempts.delete(key);
}
