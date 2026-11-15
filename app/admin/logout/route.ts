import { NextResponse } from "next/server";
import { clearAdminSessionCookie } from "@/lib/auth";

export async function GET(request: Request) {
  await clearAdminSessionCookie();
  const fallback = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") || fallback.protocol.replace(":", "");
  const origin = host ? `${protocol}://${host}` : fallback.origin;
  return NextResponse.redirect(new URL("/admin/login", origin), 303);
}
