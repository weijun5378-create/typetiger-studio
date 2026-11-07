import categories from "@/content/journal/categories.json";

export const journalCategories = categories as readonly ["设计判断", "项目复盘", "设计管理", "观察与思考"];

export type JournalCategory = (typeof journalCategories)[number];

export function isJournalCategory(value: string): value is JournalCategory {
  return journalCategories.includes(value as JournalCategory);
}
