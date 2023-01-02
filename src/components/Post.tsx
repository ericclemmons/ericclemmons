import { Card } from '@/components/Card'
import { formatDate } from '@/lib/formatDate'

export function Post({ post }) {
  return (
    <Card as="article">
      <Card.Title href={`/blog/${post.slug}`}>{post.title}</Card.Title>
      <Card.Eyebrow as="time" dateTime={post.date} decorate>
        {formatDate(post.date)}
      </Card.Eyebrow>
      <Card.Description>{post.description}</Card.Description>
      <Card.Cta>Read post</Card.Cta>
    </Card>
  )
}
