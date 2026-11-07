import type { Metadata } from "next";
import { getSettings } from "@/lib/repository";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "关于｜Typetiger Studio",
  description: "了解 Typetiger Studio 背后的设计总监、专业能力与设计方法。",
};

const services = [
  ["01", "品牌策略", "定位、品牌架构、命名与核心叙事"],
  ["02", "视觉识别", "标志、字体、色彩、图形与应用规范"],
  ["03", "文具与包装", "主题系统、授权 IP、包装与系列化应用"],
  ["04", "产品与体验", "产品与 CMF、展陈、导视与零售体验"],
];

const process = [
  ["01", "理解", "从业务目标、用户与市场环境中，确认真正需要解决的问题。"],
  ["02", "定义", "把零散信息整理成清晰的方向、设计原则与优先级。"],
  ["03", "创造", "建立有辨识度、可延展且能够实际生产落地的系统。"],
  ["04", "生长", "协助团队把设计带入产品、传播与长期运营，并持续优化。"],
];

export default async function AboutPage() {
  const settings = await getSettings();
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
        <h1>设计不止于完成一个方案，更在于建立清晰的判断，并让团队能够继续向前。</h1>
      </section>
      <section className="about-manifesto">
        <p className="section-kicker">个人背景</p>
        <div className="manifesto-copy">
          <p>Typetiger Studio 是我的个人作品集与设计思考载体。作为设计总监，我的工作连接产品、品牌、视觉系统与团队协作。</p>
          <p>我关注设计如何回应真实问题，也关注判断如何被沟通、被执行，并最终沉淀为可以持续生长的产品与品牌系统。</p>
        </div>
      </section>
      <section className="services-list">
        <p className="section-kicker">专业领域</p>
        <div className="service-rows">
          {services.map(([number,title,detail])=><article className="service-row" key={number}><span>{number}</span><h2>{title}</h2><p>{detail}</p></article>)}
        </div>
      </section>
      <section className="process-section">
        <p className="section-kicker">工作方法</p>
        <div className="process-grid">
          {process.map(([number,title,detail])=><article key={number}><span>{number}</span><h2>{title}</h2><p>{detail}</p></article>)}
        </div>
      </section>
    </main>
    <footer className="footer" id="contact">
      <div className="contact-lead"><p>有一个品牌或产品正在发生？</p><p className="contact-cta">{settings.contact || "期待与你一起，把下一个想法变成清晰的品牌表达。"}</p></div>
      <div className="footer-row"><p>{settings.siteName} © {new Date().getFullYear()}</p><div><span>品牌识别 · 包装 · 产品与 CMF</span><a href="#top">回到顶部 ↑</a></div></div>
    </footer>
  </>;
}
