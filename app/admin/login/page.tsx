import { getAdminUser, safeReturnPath } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ return_to?: string; error?: string }>;
}) {
  const params = await searchParams;
  const returnTo = safeReturnPath(params.return_to);
  if (await getAdminUser()) redirect(returnTo);

  const message = params.error === "blocked"
    ? "尝试次数过多，请 15 分钟后再试。"
    : params.error === "invalid"
      ? "邮箱或密码不正确。"
      : null;

  return (
    <main className="admin-login-page">
      <section className="admin-login-card" aria-labelledby="login-title">
        <a className="admin-login-wordmark" href="/">Typetiger Studio</a>
        <div>
          <p className="section-kicker">ADMIN / 内容管理</p>
          <h1 id="login-title">管理员登录</h1>
          <p>登录后可以管理作品、Journal 与网站设置。</p>
        </div>
        {message && <p className="admin-login-error" role="alert">{message}</p>}
        <form action="/api/admin/session" method="post" className="admin-login-form">
          <input type="hidden" name="return_to" value={returnTo} />
          <label>
            <span>管理员邮箱</span>
            <input name="email" type="email" autoComplete="username" required autoFocus />
          </label>
          <label>
            <span>密码</span>
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          <button className="btn btn-primary" type="submit">登录后台</button>
        </form>
      </section>
    </main>
  );
}
