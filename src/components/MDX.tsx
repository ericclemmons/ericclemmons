import CodeSandbox from '@/components/CodeSandbox.astro'
import Gist from '@/components/Gist.astro'
import Tweet from '@/components/Tweet.astro'

export { CodeSandbox, Gist, Tweet }

export const h2 = (props) => {
  return (
    <h2
      {...props}
      className="bg-gradient-to-br from-pink-400 to-red-600 bg-clip-text text-2xl text-transparent"
    />
  )
}
