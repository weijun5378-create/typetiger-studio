import type { Metadata } from "next";
import { getSettings } from "@/lib/repository";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "联系｜Typetiger Studio",
  description: "联系 Typetiger Studio，讨论品牌、包装、文具与产品设计项目。",
};

function contactEmail(value: string) {
  return value.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0] || "hello@typetiger.cc";
}

export default async function ContactPage() {
  const settings = await getSettings();
  const email = contactEmail(settings.contact);
  return <>
    <header className="site-header" id="top">
      <a className="wordmark" href="/">{settings.siteName}</a>
      <nav className="nav" aria-label="主导航">
        <a href="/#work">Work</a><a href="/journal">Journal</a><a href="/about">About</a><a aria-current="page" href="/contact">Contact</a>
      </nav>
    </header>
    <main className="contact-page">
      <section className="contact-hero">
        <p className="section-kicker">新项目咨询</p>
        <h1>告诉我，<br/>你的品牌正在<span>发生什么。</span></h1>
        <a className="contact-email" href={`mailto:${email}`}>{email} ↗</a>
      </section>
      <section className="contact-information">
        <article className="contact-brief"><h2>来信可以包括</h2><p>品牌或项目背景、希望解决的问题、需要的设计服务、预计时间与预算范围。<br/>即使信息还不完整，也欢迎先来聊聊。</p></article>
        <article><h2>工作地点</h2><p>中国 · 上海<br/>可远程合作全球项目</p></article>
        <article><h2>回复时间</h2><p>通常在 2 个工作日内回复</p></article>
      </section>
    </main>
  </>;
}
