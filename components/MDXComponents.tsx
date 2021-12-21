/* eslint-disable react/display-name */
import { CodeSandbox, Gist, Tweet, YouTube } from 'mdx-embed'
import React, { useMemo } from 'react'
import { ComponentMap, getMDXComponent } from 'mdx-bundler/client'
import Image from './Image'
import CustomLink from './Link'
import TOCInline from './TOCInline'
import Pre from './Pre'
import { BlogNewsletterForm } from './NewsletterForm'

const Wrapper: React.ComponentType<{ layout: string }> = ({
  layout,
  ...rest
}) => {
  const Layout = require(`../layouts/${layout}`).default
  return <Layout {...rest} />
}

export const MDXComponents: ComponentMap = {
  h2(props) {
    return (
      // eslint-disable-next-line jsx-a11y/heading-has-content
      <h2
        className="text-transparent bg-clip-text bg-gradient-to-br from-pink-400 to-red-600"
        {...props}
      />
    )
  },
  Image,
  CodeSandbox,
  Gist,
  Tweet(props) {
    return (
      <Tweet align="center" hideConversation={true} theme="dark" {...props} />
    )
  },
  YouTube,
  //@ts-ignore
  TOCInline,
  a: CustomLink,
  pre: Pre,
  wrapper: Wrapper,
  //@ts-ignore
  BlogNewsletterForm,
}

interface Props {
  layout: string
  mdxSource: string
  [key: string]: unknown
}

export const MDXLayoutRenderer = ({ layout, mdxSource, ...rest }: Props) => {
  const MDXLayout = useMemo(() => getMDXComponent(mdxSource), [mdxSource])

  return <MDXLayout layout={layout} components={MDXComponents} {...rest} />
}
