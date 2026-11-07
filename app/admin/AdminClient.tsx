"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Category, Project, ProjectImage, ProjectStatus, SiteSettings } from "@/lib/types";
import { mediaUrl } from "@/lib/types";
import JournalAdmin from "./JournalAdmin";

const blank = (categoryId = ""): Project => ({
  id: "", slug: "", titleZh: "", titleEn: "", categoryId, subtitleZh: "", subtitleEn: "", year: "",
  background: "", problem: "", constraints: "", judgment: "", solution: "", result: "", role: "", focus: "",
  coverKey: "", coverAlt: "", cardWidth: "medium", focalPoint: "center", status: "draft", sortOrder: 0,
  createdAt: "", updatedAt: "", images: [],
});

async function json(url: string, options?: RequestInit) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "网络请求失败");
  return data;
}

const focusOptions = ["center", "left", "right", "top", "bottom"] as const;

export default function AdminClient({ email, signOutPath }: { email: string; signOutPath: string }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [current, setCurrent] = useState<Project | null>(null);
  const [tab, setTab] = useState("projects");
  const [dirty, setDirty] = useState(false);
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [categoriesDirty, setCategoriesDirty] = useState(false);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [previewed, setPreviewed] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [journalDirty, setJournalDirty] = useState(false);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [projectData, categoryData, settingsData] = await Promise.all([
        json("/api/projects"), json("/api/categories"), json("/api/settings"),
      ]);
      setProjects(projectData);
      setCategories(categoryData);
      setSettings(settingsData);
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (dirty || settingsDirty || categoriesDirty || journalDirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty, settingsDirty, categoriesDirty, journalDirty]);

  const update = (key: keyof Project, value: unknown) => {
    setCurrent((project) => project ? { ...project, [key]: value } : project);
    setDirty(true);
    setPreviewed(false);
  };

  const updateImages = (mutate: (images: ProjectImage[]) => ProjectImage[]) => {
    setCurrent((project) => project ? { ...project, images: mutate(project.images || []).map((image, index) => ({ ...image, sortOrder: index })) } : project);
    setDirty(true);
    setPreviewed(false);
  };

  const selectProject = async (project: Project) => {
    if (dirty && !confirm("当前修改尚未保存，确定离开？")) return;
    setSelecting(true);
    try {
      const fullProject = await json(`/api/projects/${project.id}`);
      setCurrent(fullProject);
      setDirty(false);
      setPreviewed(false);
      setSavedAt(null);
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setSelecting(false);
    }
  };

  async function save(status: ProjectStatus = current?.status || "draft") {
    if (!current || saving) return null;
    setSaving(true);
    try {
      const body = { ...current, status };
      let id = current.id;
      if (id) {
        await json(`/api/projects/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      } else {
        const result = await json("/api/projects", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
        id = result.id;
      }
      await json(`/api/projects/${id}/images`, {
        method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ images: current.images || [] }),
      });
      const saved = await json(`/api/projects/${id}`);
      setCurrent(saved);
      setDirty(false);
      setSavedAt(new Date());
      notify(status === "published" ? "案例已发布" : status === "hidden" ? "案例已隐藏" : "草稿已保存");
      await load();
      return saved as Project;
    } catch (error) {
      notify((error as Error).message);
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function previewProject() {
    if (!current) return;
    const previewWindow = window.open("about:blank", "_blank");
    if (!previewWindow) {
      notify("浏览器阻止了预览窗口，请允许本站打开弹窗后重试");
      return;
    }
    previewWindow.document.title = "正在准备预览…";
    previewWindow.document.body.innerHTML = '<p style="font:16px sans-serif;padding:32px">正在保存并准备预览…</p>';
    const saved = dirty || !current.id ? await save("draft") : current;
    if (!saved) { previewWindow.close(); return; }
    previewWindow.location.href = `/work/${encodeURIComponent(saved.slug)}?preview=1`;
    setPreviewed(true);
  }

  async function initialize() {
    try {
      await json("/api/admin/seed", { method: "POST" });
      notify("6 个原有案例已迁移");
      await load();
    } catch (error) { notify((error as Error).message); }
  }

  async function removeProject() {
    if (!current?.id) return;
    if (!confirm("删除案例后无法撤销。确定继续吗？")) return;
    const deleteImages = confirm("是否同时永久删除对象存储中的关联图片？\n\n确定：删除案例和图片\n取消：仅删除案例数据");
    try {
      await json(`/api/projects/${current.id}?deleteImages=${deleteImages}`, { method: "DELETE" });
      setCurrent(null);
      setDirty(false);
      notify("案例已删除");
      await load();
    } catch (error) { notify((error as Error).message); }
  }

  async function compress(file: File) {
    if (file.size < 750 * 1024) return file;
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 2560 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
      (value) => value ? resolve(value) : reject(new Error("图片压缩失败")), "image/webp", .88,
    ));
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" });
  }

  async function upload(file: File, kind: "cover" | "gallery") {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 25 * 1024 * 1024) {
      notify("请选择 25MB 内的 JPG、PNG 或 WebP");
      return;
    }
    try {
      const processed = await compress(file);
      const form = new FormData();
      form.append("file", processed);
      const result = await new Promise<{ key: string }>((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open("POST", "/api/uploads");
        request.upload.onprogress = (event) => setUploading(event.lengthComputable ? Math.round(event.loaded / event.total * 100) : 1);
        request.onload = () => {
          try {
            const data = JSON.parse(request.responseText);
            if (request.status < 300) resolve(data);
            else reject(new Error(data.error || "上传失败"));
          } catch { reject(new Error("上传失败")); }
        };
        request.onerror = () => reject(new Error("网络异常，上传失败"));
        request.send(form);
      });
      if (kind === "cover") update("coverKey", result.key);
      else updateImages((images) => [...images, {
        id: crypto.randomUUID(), projectId: current?.id || "", objectKey: result.key, alt: "", focalPoint: "center",
        sortOrder: images.length, createdAt: new Date().toISOString(),
      }]);
      notify("图片已上传到对象存储，请保存案例");
    } catch (error) { notify((error as Error).message); }
    finally { setUploading(0); }
  }

  async function reorderProjects(from: number, to: number) {
    if (from === to || Number.isNaN(from)) return;
    const next = [...projects];
    const moved = next.splice(from, 1)[0];
    next.splice(to, 0, moved);
    setProjects(next);
    try {
      await Promise.all(next.map((project, index) => json(`/api/projects/${project.id}`, {
        method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ sortOrder: index }),
      })));
      notify("首页顺序已更新");
    } catch (error) { notify((error as Error).message); load(); }
  }

  const moveImage = (from: number, to: number) => {
    if (to < 0 || to >= (current?.images?.length || 0) || from === to) return;
    updateImages((images) => {
      const next = [...images];
      const moved = next.splice(from, 1)[0];
      next.splice(to, 0, moved);
      return next;
    });
  };

  const publishChecks = useMemo(() => {
    if (!current) return [];
    return [
      ["中英文项目名称", Boolean(current.titleZh.trim() && current.titleEn.trim())],
      ["有效的 URL Slug", /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(current.slug)],
      ["项目分类与年份", Boolean(current.categoryId && current.year.trim())],
      ["首页封面和 Alt", Boolean(current.coverKey && current.coverAlt.trim())],
      ["服务内容与核心交付", Boolean(current.role.trim() && current.focus.trim())],
      ["至少一段项目说明", Boolean([current.background, current.problem, current.judgment, current.solution, current.result].some((value) => value.trim()))],
      ["至少一张详情图片", Boolean(current.images?.length)],
    ] as [string, boolean][];
  }, [current]);
  const publishReady = publishChecks.every(([, ready]) => ready);

  const changeStatus = async (nextStatus: ProjectStatus) => {
    if (!current || nextStatus === current.status) return;
    if (nextStatus === "published") {
      if (!publishReady) { notify("请先补齐发布前检查中未完成的项目"); return; }
      if (dirty || !previewed) {
        await previewProject();
        notify("预览已打开；确认效果后，请再次点击发布");
        return;
      }
      if (!confirm("已确认首页卡片和详情页效果，立即发布？")) return;
    } else if (!confirm(nextStatus === "hidden" ? "切换为隐藏后，案例不会出现在公开网站。确定继续？" : "切换为草稿后，案例不会出现在公开网站。确定继续？")) return;
    await save(nextStatus);
  };

  const input = (label: string, key: keyof Project, wide = false) => <div className={`field ${wide ? "field-wide" : ""}`}>
    <label>{label}</label><input value={String(current?.[key] ?? "")} onChange={(event) => update(key, event.target.value)} />
  </div>;
  const area = (label: string, key: keyof Project) => <div className="field field-wide">
    <label>{label}</label><textarea value={String(current?.[key] ?? "")} onChange={(event) => update(key, event.target.value)} />
  </div>;

  const saveCategories = async () => {
    try {
      await Promise.all(categories.map((category, index) => json("/api/categories", {
        method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...category, sortOrder: index }),
      })));
      setCategoriesDirty(false);
      notify("分类名称和顺序已保存");
      await load();
    } catch (error) { notify((error as Error).message); }
  };

  return <main className="admin-shell">
    <header className="admin-top">
      <div><h1>Typetiger Studio 管理后台</h1><small>{email}</small></div>
      <div><a className="btn" href="/" target="_blank" rel="noreferrer">查看网站</a> <a className="btn" href={signOutPath}>退出</a></div>
    </header>
    <div className="admin-tabs">
      <button type="button" className={tab === "projects" ? "active" : ""} onClick={() => setTab("projects")}>案例</button>
      <button type="button" className={tab === "journal" ? "active" : ""} onClick={() => setTab("journal")}>文章</button>
      <button type="button" className={tab === "settings" ? "active" : ""} onClick={() => setTab("settings")}>网站设置</button>
      <button type="button" className={tab === "categories" ? "active" : ""} onClick={() => setTab("categories")}>分类</button>
    </div>

    {tab === "projects" && <div className="admin-grid">
      <section className="admin-panel">
        <div className="admin-panel-head"><b>案例列表</b><button type="button" className="btn" onClick={() => { setCurrent(blank(categories[0]?.id)); setDirty(false); setPreviewed(false); }}>新建</button></div>
        {loading ? <p>加载中…</p> : projects.length ? <div className="admin-list">{projects.map((project, index) => <button
          type="button" key={project.id} draggable onDragStart={(event) => event.dataTransfer.setData("text/plain", String(index))}
          onDragOver={(event) => event.preventDefault()} onDrop={(event) => reorderProjects(Number(event.dataTransfer.getData("text/plain")), index)}
          className={`admin-item ${current?.id === project.id ? "selected" : ""}`} onClick={() => selectProject(project)}
        >
          <img src={mediaUrl(project.coverKey)} alt="" /><span><h3>{project.titleZh || project.titleEn}</h3><p>{project.titleEn} · {project.categoryName}</p><p>{new Date(project.updatedAt).toLocaleDateString()}</p></span><span className={`status status-${project.status}`}>{project.status}</span>
        </button>)}</div> : <div className="admin-empty"><p>还没有迁移案例。</p><button type="button" className="btn btn-primary" onClick={initialize}>迁移原有 6 个案例</button></div>}
      </section>

      <section className="admin-panel">
        {selecting ? <div className="admin-empty">正在读取完整案例…</div> : current ? <>
          <div className={`save-state ${dirty ? "is-dirty" : ""}`}>{dirty ? "有未保存修改，发布前需要重新预览" : savedAt ? `已保存 ${savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "已载入保存版本"}</div>
          <div className="form-grid">
            {input("中文项目名称", "titleZh")}{input("英文项目名称", "titleEn")}{input("URL Slug", "slug")}{input("项目年份", "year")}
            <div className="field"><label>项目分类</label><select value={current.categoryId} onChange={(event) => update("categoryId", event.target.value)}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
            <div className="field"><label>首页卡片宽度</label><select value={current.cardWidth} onChange={(event) => update("cardWidth", event.target.value)}><option value="narrow">窄</option><option value="medium">中</option><option value="wide">宽</option></select></div>
            {input("中文副标题", "subtitleZh")}{input("英文副标题", "subtitleEn")}{input("服务内容", "role")}{input("核心交付", "focus")}
            {area("项目背景", "background")}{area("需要解决的问题", "problem")}{area("主要限制", "constraints")}{area("我的判断与职责", "judgment")}{area("解决方案", "solution")}{area("最终结果", "result")}
            <div className="field field-wide"><label>首页封面图</label><div className="dropzone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const file = event.dataTransfer.files[0]; if (file) upload(file, "cover"); }}><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => event.target.files?.[0] && upload(event.target.files[0], "cover")} />{uploading > 0 && <p>上传 {uploading}%</p>}{current.coverKey && <img className="upload-preview" src={mediaUrl(current.coverKey)} alt="预览" style={{ objectPosition: current.focalPoint }} />}</div></div>
            {input("封面 Alt", "coverAlt", true)}
            <div className="field"><label>封面显示焦点</label><select value={current.focalPoint} onChange={(event) => update("focalPoint", event.target.value)}>{focusOptions.map((value) => <option key={value}>{value}</option>)}</select></div>
            <div className="field"><label>当前状态（选择后立即保存）</label><select value={current.status} disabled={saving} onChange={(event) => changeStatus(event.target.value as ProjectStatus)}><option value="draft">草稿</option><option value="hidden">隐藏</option><option value="published">已发布</option></select></div>
            <div className="field field-wide"><label>详情页图片组</label>
              <div className="dropzone"><input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(event) => Array.from(event.target.files || []).forEach((file) => upload(file, "gallery"))} /><p>支持多选和拖拽排序；建议每张图片填写 Alt。</p></div>
              <div className="gallery-editor">{current.images?.map((image, index) => <div className="gallery-row" key={image.id} draggable onDragStart={(event) => event.dataTransfer.setData("text/plain", String(index))} onDragOver={(event) => event.preventDefault()} onDrop={(event) => moveImage(Number(event.dataTransfer.getData("text/plain")), index)}>
                <span className="drag-handle" title="拖动排序">⋮⋮</span><img src={mediaUrl(image.objectKey)} alt="" />
                <div className="gallery-fields"><input aria-label="图片 Alt" placeholder="图片 Alt" value={image.alt} onChange={(event) => updateImages((images) => images.map((item, itemIndex) => itemIndex === index ? { ...item, alt: event.target.value } : item))} /><select aria-label="图片显示焦点" value={image.focalPoint} onChange={(event) => updateImages((images) => images.map((item, itemIndex) => itemIndex === index ? { ...item, focalPoint: event.target.value as ProjectImage["focalPoint"] } : item))}>{focusOptions.map((value) => <option key={value}>{value}</option>)}</select></div>
                <div className="gallery-controls"><button type="button" className="btn btn-small" aria-label="上移" disabled={index === 0} onClick={() => moveImage(index, index - 1)}>↑</button><button type="button" className="btn btn-small" aria-label="下移" disabled={index === (current.images?.length || 0) - 1} onClick={() => moveImage(index, index + 1)}>↓</button><button type="button" className="btn btn-danger btn-small" onClick={() => confirm("从本案例移除这张图片？保存后生效。") && updateImages((images) => images.filter((_, itemIndex) => itemIndex !== index))}>移除</button></div>
              </div>)}</div>
            </div>
          </div>

          <div className="publish-checks"><strong>发布前检查</strong>{publishChecks.map(([label, ready]) => <span key={label} className={ready ? "check-ok" : "check-missing"}>{ready ? "✓" : "○"} {label}</span>)}<span className={previewed && !dirty ? "check-ok" : "check-missing"}>{previewed && !dirty ? "✓" : "○"} 已预览最终效果</span></div>
          <div className="admin-actions">
            <span className="action-note">{dirty ? "未保存" : previewed ? "已预览，可发布" : "请预览最终效果"}</span>
            <button type="button" className="btn" disabled={saving} onClick={() => save("draft")}>保存草稿</button>
            <button type="button" className="btn" disabled={saving} onClick={previewProject}>保存并预览</button>
            <button type="button" className="btn" disabled={saving} onClick={() => confirm("隐藏后不会出现在公开网站，确定继续？") && save("hidden")}>隐藏</button>
            <button type="button" className="btn btn-primary" disabled={saving || !publishReady} title={!publishReady ? "请先补齐发布前检查项目" : dirty || !previewed ? "点击后将先保存并打开预览" : "发布案例"} onClick={() => changeStatus("published")}>{dirty || !previewed ? "预览后发布" : "发布"}</button>
          </div>
          {current.id && <div className="danger-zone"><button type="button" className="btn btn-danger" onClick={removeProject}>删除案例</button></div>}
        </> : <div className="admin-empty">选择一个案例开始编辑，或新建案例。</div>}
      </section>
    </div>}

    {tab === "journal" && <JournalAdmin notify={notify} onDirtyChange={setJournalDirty} />}

    {tab === "settings" && settings && <section className="admin-panel"><div className="form-grid">
      <div className="field"><label>网站名称</label><input value={settings.siteName} onChange={(event) => { setSettings({ ...settings, siteName: event.target.value }); setSettingsDirty(true); }} /></div>
      <div className="field"><label>联系方式</label><input value={settings.contact} onChange={(event) => { setSettings({ ...settings, contact: event.target.value }); setSettingsDirty(true); }} /></div>
      <div className="field field-wide"><label>首页介绍文字</label><textarea value={settings.intro} onChange={(event) => { setSettings({ ...settings, intro: event.target.value }); setSettingsDirty(true); }} /></div>
      <div className="field field-wide"><label>About 内容</label><textarea value={settings.about} onChange={(event) => { setSettings({ ...settings, about: event.target.value }); setSettingsDirty(true); }} /></div>
      <div className="field field-wide"><label>社交媒体链接（JSON）</label><textarea value={settings.socialLinks} onChange={(event) => { setSettings({ ...settings, socialLinks: event.target.value }); setSettingsDirty(true); }} /></div>
    </div><div className="admin-actions"><span className="action-note">{settingsDirty ? "有未保存修改" : "已保存"}</span><button type="button" className="btn btn-primary" onClick={async () => { try { JSON.parse(settings.socialLinks || "{}"); await json("/api/settings", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(settings) }); setSettingsDirty(false); notify("网站设置已保存"); } catch (error) { notify(error instanceof SyntaxError ? "社交媒体链接不是有效 JSON" : (error as Error).message); } }}>保存设置</button></div></section>}

    {tab === "categories" && <section className="admin-panel"><div className="admin-panel-head"><h2>案例分类</h2><span className="action-note">{categoriesDirty ? "有未保存修改" : "拖动或使用箭头调整顺序"}</span></div>
      <div className="category-list">{categories.map((category, index) => <div className="category-row" key={category.id} draggable onDragStart={(event) => event.dataTransfer.setData("text/plain", String(index))} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { const from = Number(event.dataTransfer.getData("text/plain")); if (from === index || Number.isNaN(from)) return; const next = [...categories]; const moved = next.splice(from, 1)[0]; next.splice(index, 0, moved); setCategories(next); setCategoriesDirty(true); }}>
        <span className="drag-handle">⋮⋮ {index + 1}</span><input value={category.name} onChange={(event) => { setCategories(categories.map((item) => item.id === category.id ? { ...item, name: event.target.value } : item)); setCategoriesDirty(true); }} />
        <div className="gallery-controls"><button type="button" className="btn btn-small" disabled={index === 0} onClick={() => { const next = [...categories]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; setCategories(next); setCategoriesDirty(true); }}>↑</button><button type="button" className="btn btn-small" disabled={index === categories.length - 1} onClick={() => { const next = [...categories]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; setCategories(next); setCategoriesDirty(true); }}>↓</button><button type="button" className="btn btn-danger btn-small" onClick={async () => { if (!confirm(`删除分类“${category.name}”？正在使用的分类不会被删除。`)) return; try { await json(`/api/categories?id=${encodeURIComponent(category.id)}`, { method: "DELETE" }); notify("分类已删除"); await load(); } catch (error) { notify((error as Error).message); } }}>删除</button></div>
      </div>)}</div>
      <div className="admin-actions"><button type="button" className="btn" onClick={async () => { const name = prompt("新分类名称"); if (!name?.trim()) return; try { await json("/api/categories", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: name.trim(), sortOrder: categories.length }) }); notify("分类已新增"); await load(); } catch (error) { notify((error as Error).message); } }}>新增分类</button><button type="button" className="btn btn-primary" disabled={!categoriesDirty} onClick={saveCategories}>保存名称与顺序</button></div>
    </section>}
    {toast && <div className="toast" role="status">{toast}</div>}
  </main>;
}
