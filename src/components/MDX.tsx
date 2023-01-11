import { Tweet } from 'mdx-embed/dist/components/twitter'

export { default as CodeSandbox } from '@/components/CodeSandbox.astro'
export { Gist } from 'mdx-embed/dist/components/gist'

export function Tweet(props) {
  return (
    <Tweet align="center" hideConversation={true} theme="dark" {...props} />
  )
}
