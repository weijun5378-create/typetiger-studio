const categoryLabels: Record<string, string> = {
  "Brand Identity": "品牌识别",
  "Stationery Themes": "文具主题",
  "Packaging Design": "包装设计",
  "Product & CMF": "产品与 CMF",
  "Exhibition Design": "展陈设计",
  "Visual Research": "视觉研究",
};

export function categoryZh(name?: string) {
  return name ? categoryLabels[name] || name : "";
}
