import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const sourceRoot = join(projectRoot, "content", "journal");
const outputArg = process.argv.indexOf("--output");
const output = resolve(outputArg >= 0 ? process.argv[outputArg + 1] : "/tmp/typetiger-journal-import.sql");
const categoryIds = new Map([
  ["设计判断","journal-category-design-judgment"],["项目复盘","journal-category-project-review"],
  ["设计管理","journal-category-design-management"],["观察与思考","journal-category-observation"],
]);
function scalar(value){const text=value.trim();if(text==="true")return true;if(text==="false")return false;if(text.startsWith("[")&&text.endsWith("]"))return text.slice(1,-1).split(",").map((item)=>item.trim().replace(/^['"]|['"]$/g,"")).filter(Boolean);return text.replace(/^['"]|['"]$/g,"");}
function parse(raw,file){const match=raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);if(!match)throw new Error(`${file}: 缺少 Frontmatter`);const data={};for(const line of match[1].split("\n")){const index=line.indexOf(":");if(index>0)data[line.slice(0,index).trim()]=scalar(line.slice(index+1));}return{data,body:match[2].trim()};}
async function walk(dir){const output=[];for(const entry of await readdir(dir,{withFileTypes:true})){const target=join(dir,entry.name);if(entry.isDirectory()){if(entry.name!=="withdrawn")output.push(...await walk(target));}else if(extname(entry.name)===".md")output.push(target);}return output;}
const quote=(value)=>`'${String(value??"").replaceAll("'","''")}'`;
const rows=[];const skipped=[];const errors=[];
for(const file of await walk(sourceRoot)){
  try{const {data,body}=parse(await readFile(file,"utf8"),file);const slug=String(data.slug||"");if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))throw new Error("Slug 无效");const categoryId=categoryIds.get(String(data.category||""));if(!categoryId)throw new Error(`未知分类 ${data.category}`);const date=String(data.date||"");if(!date)throw new Error("缺少日期");const status=data.draft===true?"draft":"published";const tags=Array.isArray(data.tags)?data.tags:[];const now=`${date}T00:00:00+08:00`;
    const record={id:`journal-${slug}`,slug,title:String(data.title||""),summary:String(data.summary||""),bodyMarkdown:body,categoryId,categoryName:String(data.category),tags,coverKey:String(data.cover||""),coverAlt:"",featured:data.featured===true,status,publishedAt:status==="published"?now:null,createdAt:now,updatedAt:now};
    rows.push(`INSERT OR IGNORE INTO journal_articles (id,slug,title,summary,body_markdown,category_id,tags_json,cover_key,cover_alt,featured,status,published_at,published_snapshot_json,created_at,updated_at) VALUES (${quote(record.id)},${quote(slug)},${quote(data.title)},${quote(data.summary)},${quote(body)},${quote(categoryId)},${quote(JSON.stringify(tags))},${quote(data.cover||"")},'',${data.featured===true?1:0},${quote(status)},${status==="published"?quote(now):"NULL"},${status==="published"?quote(JSON.stringify(record)):"NULL"},${quote(now)},${quote(now)});`);
  }catch(error){errors.push(`${relative(projectRoot,file)}: ${error.message}`);}
}
if(errors.length){console.error(errors.join("\n"));process.exitCode=1;}else{await mkdir(dirname(output),{recursive:true});await writeFile(output,`-- Generated from content/journal; source Markdown remains unchanged.\nBEGIN TRANSACTION;\n${rows.join("\n")}\nCOMMIT;\n`);console.log(JSON.stringify({output,articles:rows.length,skipped,errors},null,2));}
