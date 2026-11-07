import type { Metadata } from "next";
import { listPublicJournalArticles } from "@/lib/journal-repository";
import JournalFilter from "./JournalFilter";

export const metadata: Metadata = {
  title: "Journal / 设计手记",
  description: "关于设计判断、项目复盘、设计管理与行业观察的个人设计手记。",
};

export const dynamic = "force-dynamic";
export default async function JournalPage() {
  const articles = await listPublicJournalArticles();
  return <>
    <header className="site-header"><a className="wordmark" href="/">Typetiger Studio</a><nav className="nav" aria-label="主导航"><a href="/#work">Work</a><a href="/journal">Journal</a><a href="/about">About</a><a href="/contact">Contact</a></nav></header>
    <main className="journal-page">
      <section className="journal-hero"><p className="section-kicker">Journal / 设计手记</p><h1>记录设计判断，<br />也记录判断如何形成。</h1><p>关于项目、团队、产品与品牌系统的实践笔记。</p></section>
      <JournalFilter articles={articles} />
    </main>
  </>;
}
