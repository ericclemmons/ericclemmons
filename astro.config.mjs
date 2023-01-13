import image from '@astrojs/image'
import mdx from '@astrojs/mdx'
import preact from '@astrojs/preact'
import sitemap from '@astrojs/sitemap'
import tailwind from '@astrojs/tailwind'
import vercel from '@astrojs/vercel/serverless'
import { defineConfig } from 'astro/config'

const site = process.env.PUBLIC_VERCEL_URL
  ? `https://${process.env.PUBLIC_VERCEL_URL}`
  : 'http://localhost:3000'

const paths = import.meta.glob('./src/content/**/*.mdx')
const slugs = Object.keys(paths).map((file) =>
  file.split('./src/content/').pop().split('.mdx').shift()
)
const customPages = slugs.map((slug) => `${site}/${slug}`)

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
  experimental: {
    contentCollections: true,
  },
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
  adapter: vercel({
    includeFiles: [
      './public/static/images/avatar.jpg',
      './public/static/images/gradient.png',
      './src/fonts/Inter-Bold.ttf?raw-hex',
      './src/fonts/Inter-ExtraBold.ttf?raw-hex',
      './src/fonts/Inter-ExtraLight.ttf?raw-hex',
      './src/fonts/Inter-Light.ttf?raw-hex',
      './src/fonts/Inter-Medium.ttf?raw-hex',
      './src/fonts/Inter-Regular.ttf?raw-hex',
      './src/fonts/Inter-SemiBold.ttf?raw-hex',
      './src/fonts/Inter-Thin.ttf?raw-hex',
    ],
  }),
  vite: {
    plugins: [hexLoader],
  },
})
