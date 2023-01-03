import { Tweet } from 'mdx-embed/dist/components/twitter'

export { CodeSandbox } from 'mdx-embed/dist/components/codesandbox'
export { Gist } from 'mdx-embed/dist/components/gist'

export function Tweet(props) {
  return (
    <Tweet align="center" hideConversation={true} theme="dark" {...props} />
  )
}
