import { z, defineCollection } from 'astro:content'

const blog = defineCollection({
  slug({ defaultSlug }) {
    return defaultSlug.replace(/(\/index)?\.mdx$/, '')
  },
  schema: {
    date: z.date(),
    summary: z.string().optional(),
    tags: z.array(z.string()).default([]),
    title: z.string(),
  },
})

export const collections = {
  blog,
}
