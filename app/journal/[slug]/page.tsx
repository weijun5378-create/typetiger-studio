import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { formatJournalDate } from "@/lib/journal";
import { getPreviewJournalArticle, getPublicJournalArticle, getPublicJournalNeighbours } from "@/lib/journal-repository";
import { requireAdmin } from "@/lib/auth";
import MarkdownArticle from "../MarkdownArticle";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ preview?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = await getPublicJournalArticle((await params).slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.summary,
    openGraph: { title: article.title, description: article.summary, type: "article", publishedTime: article.date, tags: article.tags, ...(article.cover ? { images: [article.cover] } : {}) },
  };
}

export const dynamic = "force-dynamic";
export default async function JournalArticlePage({ params, searchParams }: Props) {
  const slug = (await params).slug; const preview = (await searchParams).preview === "1";
  if (preview) await requireAdmin(`/journal/${slug}?preview=1`);
  const article = preview ? await getPreviewJournalArticle(slug) : await getPublicJournalArticle(slug);
  if (!article) notFound();
  const { previous, next } = await getPublicJournalNeighbours(article.slug);
  const showToc = article.toc.length >= 3;
  return <>
    <header className="site-header"><a className="wordmark" href="/">Typetiger Studio</a><nav className="nav" aria-label="主导航"><a href="/#work">Work</a><a href="/journal">Journal</a><a href="/about">About</a><a href="/contact">Contact</a>{preview&&<span className="preview-badge">预览</span>}</nav></header>
    <main className="journal-article-page">
      <header className="journal-article-hero"><div className="journal-article-meta"><span>{article.category}</span><time dateTime={article.date}>{formatJournalDate(article.date)}</time></div><h1>{article.title}</h1><p>{article.summary}</p>{article.tags.length > 0 && <div className="journal-tags">{article.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>}</header>
      {article.cover && <figure className="journal-cover"><img src={article.cover} alt="" /></figure>}
      <div className={`journal-reading-layout ${showToc ? "has-toc" : ""}`}>
        {showToc && <aside className="journal-toc"><p>Contents / 目录</p><ol>{article.toc.map((item) => <li className={`level-${item.level}`} key={item.id}><a href={`#${item.id}`}>{item.title}</a></li>)}</ol></aside>}
        <MarkdownArticle body={article.body} toc={article.toc} />
      </div>
      <nav className="journal-neighbours"><div>{previous && <><span>上一篇</span><a href={`/journal/${previous.slug}`}>← {previous.title}</a></>}</div><a className="journal-all-link" href="/journal">全部文章</a><div>{next && <><span>下一篇</span><a href={`/journal/${next.slug}`}>{next.title} →</a></>}</div></nav>
    </main>
  </>;
}
