"use client";

import { useState } from "react";
import type { JournalArticle } from "@/lib/journal";
import { formatJournalDate } from "@/lib/journal";

export default function JournalFilter({ articles }: { articles: JournalArticle[] }) {
  const [category, setCategory] = useState("全部");
  const visible = category === "全部" ? articles : articles.filter((article) => article.category === category);
  const categories = [...new Set(articles.map((article) => article.category))];
  return <>
    <div className="journal-filters" role="group" aria-label="按分类筛选文章">
      {["全部", ...categories].map((item) => <button type="button" key={item} className={category === item ? "active" : ""} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}
    </div>
    <div className="journal-index" aria-live="polite">
      {visible.map((article) => <a className={`journal-row ${article.cover ? "has-cover" : ""}`} href={`/journal/${encodeURIComponent(article.slug)}`} key={article.slug}>
        <div className="journal-row-meta"><span>{formatJournalDate(article.date)}</span><span>{article.category}</span>{article.featured && <span>置顶</span>}</div>
        <div className="journal-row-copy"><h2>{article.title}</h2><p>{article.summary}</p><div className="journal-tags">{article.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div></div>
        {article.cover && <figure><img src={article.cover} alt="" loading="lazy" /></figure>}
        <span className="journal-row-arrow" aria-hidden="true">↗</span>
      </a>)}
      {!visible.length && <p className="journal-empty">这个分类暂时没有已发布文章。</p>}
    </div>
  </>;
}
