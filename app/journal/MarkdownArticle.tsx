import type { ReactNode } from "react";
import type { TocItem } from "@/lib/journal";

function inline(text: string): ReactNode[] {
  const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g).filter(Boolean);
  return tokens.map((token, index) => {
    if (token.startsWith("`") && token.endsWith("`")) return <code key={index}>{token.slice(1, -1)}</code>;
    if (token.startsWith("**") && token.endsWith("**")) return <strong key={index}>{token.slice(2, -2)}</strong>;
    if (token.startsWith("*") && token.endsWith("*")) return <em key={index}>{token.slice(1, -1)}</em>;
    const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      const href = safeUrl(link[2]);
      return href ? <a key={index} href={href} {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{link[1]}</a> : link[1];
    }
    return token;
  });
}

function safeUrl(value: string, image = false) {
  const url = value.trim();
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  if (/^https:\/\//i.test(url)) return url;
  if (!image && /^(mailto:|tel:)/i.test(url)) return url;
  return "";
}

export default function MarkdownArticle({ body, toc }: { body: string; toc: TocItem[] }) {
  const lines = body.split("\n");
  const nodes: ReactNode[] = [];
  let headingIndex = 0;
  for (let index = 0; index < lines.length;) {
    const line = lines[index].trim();
    if (!line) { index += 1; continue; }
    const fence = line.match(/^```([\w+-]*)$/);
    if (fence) {
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !/^```\s*$/.test(lines[index].trim())) code.push(lines[index++]);
      if (index < lines.length) index += 1;
      nodes.push(<pre key={index}><code data-language={fence[1] || undefined}>{code.join("\n")}</code></pre>);
      continue;
    }
    const heading = line.match(/^(#{2,3})\s+(.+)$/);
    if (heading) {
      const item = toc[headingIndex++];
      nodes.push(heading[1].length === 2 ? <h2 id={item.id} key={index}>{inline(heading[2])}</h2> : <h3 id={item.id} key={index}>{inline(heading[2])}</h3>);
      index += 1; continue;
    }
    const image = line.match(/^!\[([^\]]*)\]\((\S+?)(?:\s+"([^"]+)")?\)$/);
    if (image) {
      const src = safeUrl(image[2], true);
      nodes.push(src ? <figure key={index}><img src={src} alt={image[1]} loading="lazy" />{image[3] && <figcaption>{image[3]}</figcaption>}</figure> : <p key={index}>[图片地址无效：{image[1]}]</p>);
      index += 1; continue;
    }
    const callout = line.match(/^>\s*\[!([\w-]+)\][+-]?\s*(.*)$/i);
    if (callout) {
      const content: string[] = [];
      index += 1;
      while (index < lines.length && lines[index].trim().startsWith(">")) content.push(lines[index++].trim().replace(/^>\s?/, ""));
      nodes.push(<aside className={`journal-callout callout-${callout[1].toLowerCase()}`} key={index}><strong>{callout[2] || callout[1]}</strong>{content.filter(Boolean).map((item, itemIndex) => <p key={itemIndex}>{inline(item)}</p>)}</aside>);
      continue;
    }
    if (line.startsWith("> ")) {
      const quote: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith("> ")) quote.push(lines[index++].trim().slice(2));
      nodes.push(<blockquote key={index}>{quote.map((item, quoteIndex) => <p key={quoteIndex}>{inline(item)}</p>)}</blockquote>);
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) items.push(lines[index++].trim().replace(/^[-*]\s+/, ""));
      nodes.push(<ul key={index}>{items.map((item, itemIndex) => <li key={itemIndex}>{inline(item)}</li>)}</ul>);
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) items.push(lines[index++].trim().replace(/^\d+\.\s+/, ""));
      nodes.push(<ol key={index}>{items.map((item, itemIndex) => <li key={itemIndex}>{inline(item)}</li>)}</ol>);
      continue;
    }
    if (line.includes("|") && index + 1 < lines.length && /^\s*\|?\s*:?-{3,}/.test(lines[index + 1])) {
      const cells = (value: string) => value.replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim());
      const headers = cells(line);
      index += 2;
      const rows: string[][] = [];
      while (index < lines.length && lines[index].trim().includes("|")) rows.push(cells(lines[index++].trim()));
      nodes.push(<div className="journal-table-wrap" key={index}><table><thead><tr>{headers.map((cell, cellIndex) => <th key={cellIndex}>{inline(cell)}</th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}>{headers.map((_, cellIndex) => <td key={cellIndex}>{inline(row[cellIndex] || "")}</td>)}</tr>)}</tbody></table></div>);
      continue;
    }
    const paragraph: string[] = [];
    while (index < lines.length && lines[index].trim() && !/^(#{2,3})\s+|^```|^>\s*|^[-*]\s+|^\d+\.\s+|^!\[/.test(lines[index].trim())) paragraph.push(lines[index++].trim());
    nodes.push(<p key={index}>{inline(paragraph.join(" "))}</p>);
  }
  return <div className="journal-prose">{nodes}</div>;
}
