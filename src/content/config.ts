import { z, defineCollection } from 'astro:content'

const blog = defineCollection({
  schema: {
    category: z.enum(['astro']).optional(),
    date: z.date(),
    description: z.undefined(), // Old value that shouldn't be used anymore
    summary: z.string().optional(),
    tags: z.array(z.string()).default([]),
    title: z.string(),
  },
})

export const collections = {
  blog,
}
