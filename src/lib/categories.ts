export const CATEGORIES = [
  'Development',
  'Learning',
  'Productivity',
  'Design',
  'News',
  'AI',
  'Entertainment',
  'Tools',
  'Reference',
  'Shopping',
  'Social',
  'Other',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_SET: ReadonlySet<string> = new Set(CATEGORIES);

export function isCategory(value: string): value is Category {
  return CATEGORY_SET.has(value);
}
