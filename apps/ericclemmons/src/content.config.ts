import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { z } from 'astro/zod'

const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    category: z.enum(['astro', 'webpack']).optional(),
    date: z.coerce.date(),
    summary: z.string().optional(),
    tags: z.array(z.string()).default([]),
    title: z.string(),
    updated: z.coerce.date().optional(),
  }),
})

export const collections = { blog }
