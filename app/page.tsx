import type { Metadata } from "next";
import { getSettings, listCategories, listProjects } from "@/lib/repository";
import { listPublicJournalArticles } from "@/lib/journal-repository";
import WorkGallery from "./WorkGallery";
import { AboutPreview, Expertise, JournalPreview } from "./HomepageSections";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { absolute: "Typetiger Studio — Independent Design Practice" },
  description: "Typetiger Studio 是一位设计总监的个人作品集与设计思考，关注产品设计、品牌识别、CMF 与包装体验。",
};

export default async function Home() {
  const [settings, projects, categories, journalArticles] = await Promise.all([getSettings(), listProjects(false), listCategories(), listPublicJournalArticles()]);
  return <>
    <header className="site-header homepage-header" id="top">
      <a className="wordmark" href="/">{settings.siteName}</a>
      <nav className="nav" aria-label="Primary navigation">
        <a href="#work">Work</a><a href="/journal">Journal</a><a href="/about">About</a><a href="/contact">Contact</a>
      </nav>
    </header>
    <main>
      <section className="intro homepage-hero" aria-labelledby="hero-title">
        <p className="intro-eyebrow">Design Director · Portfolio &amp; Journal</p>
        <h1 id="hero-title">Designing Products.<br />Building Systems.</h1>
        <p className="hero-cn-title">从产品设计到品牌系统。</p>
        <div className="hero-support"><p>一名设计总监的个人作品集与设计思考。关注产品、品牌、CMF 与包装之间的关系，也记录判断如何在真实项目中形成。</p><a className="intro-link" href="#work">查看精选作品 ↗</a></div>
      </section>
      <WorkGallery projects={projects} categories={categories} />
      <Expertise /><JournalPreview articles={journalArticles.slice(0, 3)} /><AboutPreview />
    </main>
    <footer className="footer homepage-footer" id="contact">
      <div className="contact-lead"><p>关于设计、团队或下一次合作。</p><a className="contact-cta" href="/contact">联系交流 ↗</a></div>
      <div className="footer-row"><p>{settings.siteName} © {new Date().getFullYear()}</p><div><span>产品 · 品牌 · 包装 · CMF</span><a href="#top">回到顶部 ↑</a></div></div>
    </footer>
  </>;
}
