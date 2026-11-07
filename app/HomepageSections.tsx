import type { JournalArticle } from "@/lib/journal";
import { formatJournalDate } from "@/lib/journal";

const expertise = [
  ["01", "产品与 CMF", "以色彩、材料与表面工艺策略，构建具有辨识度且协调统一的产品家族。"],
  ["02", "品牌系统", "建立可延展的品牌识别与视觉系统，连接品牌、产品与目标人群。"],
  ["03", "包装与零售", "通过清晰、一致的包装与零售体验，提升货架识别与品牌感知。"],
  ["04", "创意指导", "从早期概念到最终应用，统筹设计方向并推动跨专业协作。"],
];

const approach = [
  ["01", "研究洞察", "理解用户、市场、趋势与具体产品语境。"],
  ["02", "策略定义", "明确创意方向、设计原则与系统要求。"],
  ["03", "设计发展", "将概念转化为协调一致的产品与视觉应用。"],
  ["04", "落地实施", "在产品、包装与真实触点中持续完善设计细节。"],
];

export function Expertise() {
  return <section className="homepage-section expertise-section" id="expertise" aria-labelledby="expertise-title">
    <div className="section-heading-row"><div><p className="section-kicker">Expertise</p><h2 id="expertise-title">专业能力</h2></div><p>连接创意方向、产品、品牌与市场应用，让设计从概念延伸到真实体验。</p></div>
    <div className="editorial-grid expertise-grid">{expertise.map(([number, title, description]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{description}</p></article>)}</div>
  </section>;
}

export function DesignApproach() {
  return <section className="homepage-section approach-section" id="approach" aria-labelledby="approach-title">
    <div className="section-heading-row approach-heading"><div><p className="section-kicker">Design Approach</p><h2 id="approach-title">设计方法</h2></div><p className="approach-statement">从洞察到识别，<br />从产品到体验。</p></div>
    <div className="approach-grid">{approach.map(([number, title, description]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{description}</p></article>)}</div>
  </section>;
}

export function AboutPreview() {
  return <section className="homepage-section about-preview" id="about-preview" aria-labelledby="about-preview-title">
    <p className="section-kicker">About / 关于</p><div className="about-preview-grid"><h2 id="about-preview-title">设计总监，<br />也是持续实践的设计者。</h2><div><p>Typetiger Studio 是我的个人作品集与设计思考载体，记录我在消费产品、品牌识别与视觉系统中的实践。</p><p>工作跨越创意指导、产品思维和跨品类协作，也关注团队如何建立清晰、一致且可以持续推进的设计判断。</p><a className="editorial-link" href="/about">了解个人背景 ↗</a></div></div>
  </section>;
}
export function JournalPreview({ articles }: { articles: JournalArticle[] }) {
  return <section className="homepage-section journal-preview" id="journal-preview" aria-labelledby="journal-preview-title">
    <div className="section-heading-row"><div><p className="section-kicker">Journal / 设计手记</p><h2 id="journal-preview-title">最近记录</h2></div><p>关于设计判断、项目复盘、团队协作与日常观察。</p></div>
    <div className="journal-preview-list">{articles.map((article) => <a href={`/journal/${article.slug}`} key={article.slug}><div><span>{formatJournalDate(article.date)}</span><span>{article.category}</span></div><h3>{article.title}</h3><p>{article.summary}</p><span className="journal-preview-arrow">↗</span></a>)}</div>
    <a className="editorial-link journal-more" href="/journal">查看全部文章 ↗</a>
  </section>;
}
