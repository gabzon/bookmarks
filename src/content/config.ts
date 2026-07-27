import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { CATEGORIES } from '../lib/categories.ts';

const bookmarks = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/bookmarks' }),
  schema: z.object({
    url: z.string().url(),
    title: z.string().min(1),
    summary: z.string().min(1),
    use: z.string().min(1),
    category: z.enum(CATEGORIES),
    tags: z.array(z.string()).default([]),
    dateAdded: z.coerce.date(),
    urlHash: z.string().optional(),
  }),
});

export const collections = { bookmarks };
