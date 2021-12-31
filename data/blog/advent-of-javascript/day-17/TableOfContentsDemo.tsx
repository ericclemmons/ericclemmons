import * as React from 'react'

export function TableOfContentsDemo() {
  React.useEffect(() => {
    import('./table-of-contents')
  }, [])

  return (
    <table-of-contents
      class="fixed top-2 left-8"
      heading-selector="main :is(h2, h3)"
    >
      <h3 slot="header">Table of Contents</h3>
      <ol slot="list" className="px-0 list-none">
        <li slot="item" className="px-0 text-sm">
          <a slot="link" className="!no-underline"></a>
        </li>
      </ol>
    </table-of-contents>
  )
}
