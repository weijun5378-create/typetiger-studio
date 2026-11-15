import type { JournalCategory } from "./journal-config";

export type JournalMeta = { title:string; slug:string; date:string; category:JournalCategory; summary:string; cover?:string; featured:boolean; draft:boolean; tags:string[]; updated?:string; source?:string };
export type TocItem = { level:2|3; title:string; id:string };
export type JournalArticle = JournalMeta & { body:string; toc:TocItem[] };

function headingId(title:string,index:number){const value=title.toLowerCase().replace(/[`*_]/g,"").replace(/[^\p{L}\p{N}]+/gu,"-").replace(/^-|-$/g,"");return value||`section-${index+1}`;}
export function journalToc(body:string):TocItem[]{return[...body.matchAll(/^(#{2,3})\s+(.+)$/gm)].map((heading,index)=>({level:heading[1].length as 2|3,title:heading[2].trim(),id:headingId(heading[2].trim(),index)}));}
export function formatJournalDate(date:string){return new Intl.DateTimeFormat("zh-CN",{year:"numeric",month:"2-digit",day:"2-digit",timeZone:"Asia/Shanghai"}).format(new Date(`${date}T00:00:00+08:00`));}
