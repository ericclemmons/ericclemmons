export { default as CodeSandbox } from '@/components/CodeSandbox.astro'
export { default as Gist } from '@/components/Gist.astro'
export { default as Tweet } from '@/components/Tweet.astro'

export const h2 = (props: any) => {
  return (
    <h2
      className="font-serif text-2xl font-normal text-stone-900 dark:text-stone-100"
      {...props}
    />
  )
}
