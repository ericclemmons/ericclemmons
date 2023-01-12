import image from '@astrojs/image'
import mdx from '@astrojs/mdx'
import preact from '@astrojs/preact'
import sitemap from '@astrojs/sitemap'
import tailwind from '@astrojs/tailwind'
import vercel from '@astrojs/vercel/serverless'
import { defineConfig } from 'astro/config'

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
  site: 'https://ericclemmons.com',
  experimental: {
    contentCollections: true,
  },
  integrations: [
    tailwind(),
    sitemap(),
    mdx(),
    image({
      serviceEntryPoint: '@astrojs/image/sharp',
    }),
    preact({ compat: true }),
  ],
  output: 'server',
  adapter: vercel({
    includeFiles: ['./src/fonts'],
  }),
  vite: {
    plugins: [hexLoader],
  },
})
