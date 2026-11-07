interface ImportMeta {
  glob<T = unknown>(pattern: string | string[], options: { eager: true; query: string; import: string }): Record<string, T>;
}
