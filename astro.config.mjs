import image from '@astrojs/image'
import mdx from '@astrojs/mdx'
import preact from '@astrojs/preact'
import sitemap from '@astrojs/sitemap'
import tailwind from '@astrojs/tailwind'
import vercel from '@astrojs/vercel/serverless'
import { defineConfig } from 'astro/config'

const site = process.env.PUBLIC_VERCEL_URL
  ? `https://${process.env.PUBLIC_VERCEL_URL}/`
  : 'http://localhost:3000/'

const content = Object.keys(import.meta.glob('./src/content/**/*.mdx')).map(
  (file) => file.split('./src/content/').pop().split('.mdx').shift()
)
const pages = Object.keys(import.meta.glob('./src/pages/**/*.astro')).map(
  (file) => file.split('./src/pages/').pop().split('.astro').shift()
)
const customPages = [...pages, ...content].map((slug) => `${site}${slug}`)

/** @type {import('vite').Plugin} */
const hexLoader = {
  name: 'hex-loader',
  transform(code, id) {
    const [path, query] = id.split('?')
    if (query != 'raw-hex') return null

    const data = fs.readFileSync(path)
    const hex = data.toString('hex')

    return `export default '${hex}';`
  },
}

// https://astro.build/config
export default defineConfig({
  site,
  integrations: [
    tailwind(),
    sitemap({
      customPages,
    }),
    mdx(),
    image({
      serviceEntryPoint: '@astrojs/image/sharp',
    }),
    preact({ compat: true }),
  ],
  output: 'server',
  adapter: vercel(),
  vite: {
    plugins: [hexLoader],
  },
})
