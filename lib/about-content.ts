export type AboutListItem = { number: string; title: string; detail: string };

export type AboutContent = {
  homeTitle: string;
  homeParagraphs: string[];
  homeCtaLabel: string;
  pageTitle: string;
  backgroundParagraphs: string[];
  services: AboutListItem[];
  process: AboutListItem[];
};

export const defaultAboutContent: AboutContent = {
  homeTitle: "设计总监，\n也是持续实践的设计者。",
  homeParagraphs: [
    "Typetiger Studio 是我的个人作品集与设计思考载体，记录我在消费产品、品牌识别与视觉系统中的实践。",
    "工作跨越创意指导、产品思维和跨品类协作，也关注团队如何建立清晰、一致且可以持续推进的设计判断。",
  ],
  homeCtaLabel: "了解个人背景",
  pageTitle: "设计不止于完成一个方案，更在于建立清晰的判断，并让团队能够继续向前。",
  backgroundParagraphs: [
    "Typetiger Studio 是我的个人作品集与设计思考载体。作为设计总监，我的工作连接产品、品牌、视觉系统与团队协作。",
    "我关注设计如何回应真实问题，也关注判断如何被沟通、被执行，并最终沉淀为可以持续生长的产品与品牌系统。",
  ],
  services: [
    { number: "01", title: "品牌策略", detail: "定位、品牌架构、命名与核心叙事" },
    { number: "02", title: "视觉识别", detail: "标志、字体、色彩、图形与应用规范" },
    { number: "03", title: "文具与包装", detail: "主题系统、授权 IP、包装与系列化应用" },
    { number: "04", title: "产品与体验", detail: "产品与 CMF、展陈、导视与零售体验" },
  ],
  process: [
    { number: "01", title: "理解", detail: "从业务目标、用户与市场环境中，确认真正需要解决的问题。" },
    { number: "02", title: "定义", detail: "把零散信息整理成清晰的方向、设计原则与优先级。" },
    { number: "03", title: "创造", detail: "建立有辨识度、可延展且能够实际生产落地的系统。" },
    { number: "04", title: "生长", detail: "协助团队把设计带入产品、传播与长期运营，并持续优化。" },
  ],
};

export function parseAboutContent(raw: string | null | undefined): AboutContent {
  if (!raw?.trim().startsWith("{")) return defaultAboutContent;
  try {
    const value = JSON.parse(raw) as Partial<AboutContent>;
    return {
      ...defaultAboutContent,
      ...value,
      homeParagraphs: Array.isArray(value.homeParagraphs) ? value.homeParagraphs : defaultAboutContent.homeParagraphs,
      backgroundParagraphs: Array.isArray(value.backgroundParagraphs) ? value.backgroundParagraphs : defaultAboutContent.backgroundParagraphs,
      services: Array.isArray(value.services) ? value.services : defaultAboutContent.services,
      process: Array.isArray(value.process) ? value.process : defaultAboutContent.process,
    };
  } catch {
    return defaultAboutContent;
  }
}

export const serializeAboutContent = (content: AboutContent) => JSON.stringify(content);
