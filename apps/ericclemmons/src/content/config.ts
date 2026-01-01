import { z, defineCollection } from 'astro:content'

const blog = defineCollection({
  schema: z.object({
    category: z.enum(['astro', 'webpack']).optional(),
    date: z.date(),
    description: z.undefined(), // Old value that shouldn't be used anymore
    summary: z.string().optional(),
    tags: z.array(z.string()).default([]),
    title: z.string(),
    updated: z.date().optional(),
  }),
})

export const collections = {
  blog,
}
