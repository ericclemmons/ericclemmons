import ReactDOMServer from 'react-dom/server'
import { Feed } from 'feed'
import { mkdir, writeFile } from 'fs/promises'

import { getAllPosts } from './getAllPosts'

export async function generateRssFeed() {
  let posts = await getAllPosts()
  let siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  let author = {
    name: 'Spencer Sharp',
    email: 'spencer@planetaria.tech',
  }

  let feed = new Feed({
    title: author.name,
    description: 'Your blog description',
    author,
    id: siteUrl,
    link: siteUrl,
    image: `${siteUrl}/favicon.ico`,
    favicon: `${siteUrl}/favicon.ico`,
    copyright: `All rights reserved ${new Date().getFullYear()}`,
    feedLinks: {
      rss2: `${siteUrl}/rss/feed.xml`,
      json: `${siteUrl}/rss/feed.json`,
    },
  })

  for (let post of posts) {
    let url = `${siteUrl}/blog/${post.slug}`
    let html = ReactDOMServer.renderToStaticMarkup(<post.component isRssFeed />)

    feed.addItem({
      title: post.title,
      id: url,
      link: url,
      description: post.description,
      content: html,
      author: [author],
      contributor: [author],
      date: new Date(post.date),
    })
  }

  await mkdir('./public/rss', { recursive: true })
  await Promise.all([
    writeFile('./public/rss/feed.xml', feed.rss2(), 'utf8'),
    writeFile('./public/rss/feed.json', feed.json1(), 'utf8'),
  ])
}
