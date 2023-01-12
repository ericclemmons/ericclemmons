import type { APIRoute } from 'astro'
import htm from 'htm'
import satori, { init } from 'satori/wasm'
import sharp from 'sharp'
import initYoga from 'yoga-wasm-web/asm'
import ttf from '../../../public/Inter/static/Inter-Regular.ttf?raw-hex'

const fromHexString = (hexString) =>
  Uint8Array.from(hexString.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)))

function h(type: string, props: Record<string, any>, ...children: any) {
  return {
    type,
    props: {
      ...props,
      // Satori crashes on single-element arrays
      children: children.length > 1 ? children : children[0],
    },
  }
}

const html = htm.bind(h)
const yoga = initYoga()
const SITE = import.meta.env.DEV
  ? 'http://localhost:3000'
  : import.meta.env.SITE

init(yoga)

export const get: APIRoute = async ({ url, site }) => {
  const inter = fromHexString(ttf)

  const title = url.searchParams.get('title') ?? 'Missing Title'
  // const buffer = Buffer.from(ttf, 'utf8')
  // const inter = new Uint8Array(buffer).buffer

  // const inter = await fetch(
  //   `../../../public/Inter/static/Inter-Regular.ttf`
  // ).then((res) => res.arrayBuffer())
  // const interLight = await fetch(
  //   `../../public/Inter/static/Inter-Light.ttf`
  // ).then((res) => res.arrayBuffer())
  // const interBold = await fetch(
  //   `../../public/Inter/static/Inter-Bold.ttf`
  // ).then((res) => res.arrayBuffer())

  const options = {
    // debug: true,
    width: 1200,
    height: 630,
    fonts: [
      {
        name: 'Inter',
        data: inter,
        weight: 400,
        style: 'normal',
      },
      {
        name: 'Inter',
        data: inter, //Bold,
        weight: 700,
        style: 'normal',
      },
      {
        name: 'Inter',
        data: inter, //Light,
        weight: 300,
        style: 'normal',
      },
    ],
  }

  const svg = await satori(
    html`
      <div
        style=${{
          fontFamily: 'Inter',
          backgroundColor: '#222',
          backgroundSize: '150px 150px',
          height: '100%',
          width: '100%',
          display: 'flex',
          textAlign: 'center',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          flexWrap: 'nowrap',
          fontSize: 96,
          color: 'white',
        }}
      >
        ${title}
      </div>
    `,
    options
  )

  // const svg = await satori(
  //   html`
  //     <div
  //       style=${{
  //         fontFamily: 'Inter',
  //         backgroundColor: '#222',
  //         backgroundSize: '150px 150px',
  //         height: '100%',
  //         width: '100%',
  //         display: 'flex',
  //         textAlign: 'center',
  //         alignItems: 'center',
  //         justifyContent: 'center',
  //         flexDirection: 'column',
  //         flexWrap: 'nowrap',
  //       }}
  //     >
  //       <img
  //         src=${`${SITE}/static/images/gradient.png`}
  //         style=${{
  //           position: 'absolute',
  //           transform: 'skewY(-1deg)',
  //         }}
  //       />

  //       <img
  //         height=${100}
  //         src=${`${SITE}/static/images/avatar.jpg`}
  //         style=${{
  //           position: 'absolute',
  //           left: '5%',
  //           top: '12.5%',
  //           borderRadius: '100%',
  //           border: '5px solid white',
  //           boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
  //         }}
  //         width=${100}
  //       />

  //       <div
  //         style=${{
  //           fontSize: 84,
  //           letterSpacing: '-0.025em',
  //           color: 'white',
  //           marginTop: 30,
  //           padding: '0 120px',
  //           lineHeight: 1.25,
  //           fontWeight: 700,
  //           whiteSpace: 'pre-wrap',
  //         }}
  //       >
  //         ${title}
  //       </div>

  //       <div
  //         style=${{
  //           position: 'absolute',
  //           bottom: '5%',
  //           right: '5%',
  //           color: 'transparent',
  //           fontSize: 24,
  //           fontWeight: 200,
  //           letterSpacing: '0.05em',
  //           background: 'linear-gradient(to bottom right, #f472b6, #dc2626)',
  //           backgroundClip: 'text',
  //         }}
  //       >
  //         ericclemmons.com
  //       </div>
  //     </div>
  //   `,
  //   {
  //     // debug: true,
  //     width: 1200,
  //     height: 630,
  //     fonts: [
  //       {
  //         name: 'Inter',
  //         data: inter,
  //         weight: 400,
  //         style: 'normal',
  //       },
  //       {
  //         name: 'Inter',
  //         data: interBold,
  //         weight: 700,
  //         style: 'normal',
  //       },
  //       {
  //         name: 'Inter',
  //         data: interLight,
  //         weight: 300,
  //         style: 'normal',
  //       },
  //     ],
  //   }
  // )

  return new Response(await sharp(Buffer.from(svg)).png().toBuffer(), {
    status: 200,
    headers: {
      'Cache-Control': 'max-age=31536000, immutable',
      'Content-Type': 'image/png',
    },
  })
}
