import { Card } from '@/components/Card'
import { formatDate } from '@/lib/formatDate'
import type { CollectionEntry } from 'astro:content'

export function Post({ post }: { post: CollectionEntry<'blog'> }) {
  return (
    <Card as="article">
      <Card.Title href={`/blog/${post.slug}`}>{post.data.title}</Card.Title>
      <Card.Eyebrow as="time" dateTime={post.data.date} decorate>
        {formatDate(post.data.date)}
      </Card.Eyebrow>
      <Card.Description>{post.data.summary}</Card.Description>
      <Card.Cta>Read post</Card.Cta>
    </Card>
  )
}