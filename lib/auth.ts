import { env } from "cloudflare:workers";
import { getChatGPTUser, requireChatGPTUser } from "@/app/chatgpt-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

function adminEmails() {
  return (env.ADMIN_EMAILS || "").split(",").map((v) => v.trim().toLowerCase()).filter(Boolean);
}
export async function requireAdmin(returnTo = "/admin") {
  const user = await requireChatGPTUser(returnTo);
  if (!adminEmails().includes(user.email.toLowerCase())) redirect("/?admin=forbidden");
  return user;
}
export async function assertAdminApi(request?: Request) {
  const user = await getChatGPTUser();
  if (!user || !adminEmails().includes(user.email.toLowerCase())) return null;
  if (request && !["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    const origin = request.headers.get("origin");
    const host = (await headers()).get("host");
    if (origin && new URL(origin).host !== host) return null;
  }
  return user;
}
