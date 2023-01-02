export function SocialLink({ icon: Icon, ...props }) {
  return (
    <a className="group -m-1 p-1" {...props}>
      <Icon className="h-6 w-6 text-black transition group-hover:fill-zinc-600 dark:fill-zinc-400 dark:group-hover:fill-zinc-300" />
    </a>
  )
}
