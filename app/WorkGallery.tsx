"use client";

import { useMemo, useState } from "react";
import type { Category, Project } from "@/lib/types";
import { mediaUrl } from "@/lib/types";
import { categoryZh } from "@/lib/localize";

export default function WorkGallery({ projects, categories }: { projects: Project[]; categories: Category[] }) {
  const [activeCategory, setActiveCategory] = useState("all");
  const visibleProjects = useMemo(() => {
    const filtered = activeCategory === "all" ? projects : projects.filter((project) => project.categoryId === activeCategory);
    const hasNewMagicZoo = projects.some((project) => project.slug === "magiczoo");
    return hasNewMagicZoo ? filtered.filter((project) => project.slug !== "magic-zoo") : filtered;
  }, [activeCategory, projects]);

  return <section className="work-section" id="work" aria-labelledby="work-heading">
    <div className="work-filter-wrap">
      <div className="work-heading-copy"><p className="section-kicker">Selected Work</p><h2 id="work-heading">精选项目</h2><p className="work-intro">涵盖产品设计、品牌识别、包装与视觉系统的精选实践。</p></div>
      <div className="work-filters" role="group" aria-label="Filter projects by category">
        <button type="button" className={activeCategory === "all" ? "active" : ""} aria-pressed={activeCategory === "all"} onClick={() => setActiveCategory("all")}>全部</button>
        {categories.map((category) => <button
          type="button"
          key={category.id}
          className={activeCategory === category.id ? "active" : ""}
          aria-pressed={activeCategory === category.id}
          onClick={() => setActiveCategory(category.id)}
        >{categoryZh(category.name)}</button>)}
      </div>
    </div>
    <div className="work-grid project-wall" aria-live="polite">
      {visibleProjects.length ? visibleProjects.map((project, index) => <a
        className={`project project--${project.cardWidth}`}
        href={`/work/${encodeURIComponent(project.slug)}`}
        key={project.id}
        aria-label={`查看${project.titleZh || project.titleEn}项目`}
      >
        <figure><img src={mediaUrl(project.coverKey)} alt={project.coverAlt} loading="lazy" width="1600" height="900" style={{ objectPosition: project.focalPoint }} /></figure>
        <div className="caption project-meta"><div><h2>{project.titleZh || project.titleEn}</h2><p>{categoryZh(project.categoryName)}</p></div><span>{String(index + 1).padStart(2, "0")}</span></div>
      </a>) : <div className="empty-public"><p>这个分类暂时没有已发布项目。</p></div>}
    </div>
  </section>;
}
