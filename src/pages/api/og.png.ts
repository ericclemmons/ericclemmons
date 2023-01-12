import type { APIRoute } from 'astro'
import htm from 'htm'
// import wasm from 'node_modules/yoga-wasm-web/dist/yoga.wasm?raw-hex'
import satori from 'satori'
import sharp from 'sharp'
import inter700 from '../../fonts/Inter-Bold.ttf?raw-hex'
import inter800 from '../../fonts/Inter-ExtraBold.ttf?raw-hex'
import inter200 from '../../fonts/Inter-ExtraLight.ttf?raw-hex'
import inter300 from '../../fonts/Inter-Light.ttf?raw-hex'
import inter500 from '../../fonts/Inter-Medium.ttf?raw-hex'
import inter400 from '../../fonts/Inter-Regular.ttf?raw-hex'
import inter600 from '../../fonts/Inter-SemiBold.ttf?raw-hex'
import inter100 from '../../fonts/Inter-Thin.ttf?raw-hex'

const fromHexString = (hexString) =>
  Uint8Array.from(hexString.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)))

function h(
  type: string | Function,
  props: Record<string, any>,
  ...children: any
) {
  if (typeof type === 'function') {
    return type({ ...props, children })
  }

  if (type === 'Fragment') {
    return children
  }

  return {
    type,
    props: {
      ...props,
      // Satori crashes on emtpy
      children: children.length > 0 ? children : undefined,
    },
  }
}

const fonts = [
  inter100,
  inter200,
  inter300,
  inter400,
  inter500,
  inter600,
  inter700,
  inter800,
].map((hex, i) => ({
  name: 'Inter',
  data: fromHexString(hex),
  weight: `${i + 1}00`,
  style: 'normal',
}))

const html = htm.bind(h)

export const get: APIRoute = async ({ url, site }) => {
  const title = url.searchParams.get('title') ?? 'Missing Title'

  const options = {
    // debug: true,
    width: 1200,
    height: 630,
    fonts,
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

  // return new Response(svg, {
  //   status: 200,
  //   headers: {
  //     'Content-Type': 'image/svg+xml',
  //   },
  // })

  return new Response(await sharp(Buffer.from(svg)).png().toBuffer(), {
    status: 200,
    headers: {
      'Cache-Control': 'max-age=31536000, immutable',
      'Content-Type': 'image/png',
    },
  })
}
