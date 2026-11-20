import type { Metadata } from "next";
import { getSettings } from "@/lib/repository";
import { parseAboutContent } from "@/lib/about-content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "关于｜Typetiger Studio",
  description: "了解 Typetiger Studio 背后的设计总监、专业能力与设计方法。",
};

export default async function AboutPage() {
  const settings = await getSettings();
  const content = parseAboutContent(settings.about);
  return <>
    <header className="site-header" id="top">
      <a className="wordmark" href="/">{settings.siteName}</a>
      <nav className="nav" aria-label="主导航">
        <a href="/#work">Work</a><a href="/journal">Journal</a><a aria-current="page" href="/about">About</a><a href="/contact">Contact</a>
      </nav>
    </header>
    <main className="about-page">
      <section className="inner-hero">
        <p className="section-kicker">About / 关于</p>
        <h1>{content.pageTitle}</h1>
      </section>
      <section className="about-manifesto">
        <p className="section-kicker">个人背景</p>
        <div className="manifesto-copy">
          {content.backgroundParagraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
        </div>
      </section>
      <section className="services-list">
        <p className="section-kicker">专业领域</p>
        <div className="service-rows">
          {content.services.map(({number,title,detail})=><article className="service-row" key={number}><span>{number}</span><h2>{title}</h2><p>{detail}</p></article>)}
        </div>
      </section>
      <section className="process-section">
        <p className="section-kicker">工作方法</p>
        <div className="process-grid">
          {content.process.map(({number,title,detail})=><article key={number}><span>{number}</span><h2>{title}</h2><p>{detail}</p></article>)}
        </div>
      </section>
    </main>
    <footer className="footer" id="contact">
      <div className="contact-lead"><p>有一个品牌或产品正在发生？</p><p className="contact-cta">{settings.contact || "期待与你一起，把下一个想法变成清晰的品牌表达。"}</p></div>
      <div className="footer-row"><p>{settings.siteName} © {new Date().getFullYear()}</p><div><span>品牌识别 · 包装 · 产品与 CMF</span><a href="#top">回到顶部 ↑</a></div></div>
    </footer>
  </>;
}
