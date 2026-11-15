import { NextResponse } from "next/server";
import {
  safeReturnPath,
  setAdminSessionCookie,
  verifyAdminCredentials,
} from "@/lib/auth";
import {
  clearLoginFailures,
  isLoginBlocked,
  loginClientKey,
  recordLoginFailure,
} from "@/lib/login-rate-limit";

function loginRedirect(request: Request, returnTo: string, error: string) {
  const url = new URL("/admin/login", requestOrigin(request));
  url.searchParams.set("return_to", safeReturnPath(returnTo));
  url.searchParams.set("error", error);
  return NextResponse.redirect(url, 303);
}

function requestOrigin(request: Request) {
  const fallback = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") || fallback.protocol.replace(":", "");
  return host ? `${protocol}://${host}` : fallback.origin;
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const requestHost = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (origin && (!requestHost || new URL(origin).host !== requestHost)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  const form = await request.formData();
  const email = String(form.get("email") || "").slice(0, 254);
  const password = String(form.get("password") || "").slice(0, 1024);
  const returnTo = String(form.get("return_to") || "/admin");
  const key = loginClientKey(request);

  if (isLoginBlocked(key)) return loginRedirect(request, returnTo, "blocked");
  if (!(await verifyAdminCredentials(email, password))) {
    recordLoginFailure(key);
    return loginRedirect(request, returnTo, "invalid");
  }

  clearLoginFailures(key);
  await setAdminSessionCookie(email);
  return NextResponse.redirect(new URL(safeReturnPath(returnTo), requestOrigin(request)), 303);
}
