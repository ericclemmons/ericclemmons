export { default as CodeSandbox } from '@/components/CodeSandbox.astro'
export { default as Gist } from '@/components/Gist.astro'
export { default as Tweet } from '@/components/Tweet.astro'

export const h2 = (props: any) => {
  return (
    <h2
      className="bg-gradient-to-br from-pink-400 to-red-600 [-webkit-background-clip:text] text-2xl text-transparent"
      {...props}
    />
  )
}
